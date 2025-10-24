"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiredPrismaVersion = void 0;
exports.loadDocument = loadDocument;
exports.eagerLoadAllImports = eagerLoadAllImports;
exports.mergeImportsDeclarations = mergeImportsDeclarations;
exports.getPluginDocuments = getPluginDocuments;
exports.getZenStackPackages = getZenStackPackages;
exports.checkRequiredPackage = checkRequiredPackage;
exports.checkNewVersion = checkNewVersion;
exports.getLatestVersion = getLatestVersion;
exports.formatDocument = formatDocument;
exports.getDefaultSchemaLocation = getDefaultSchemaLocation;
exports.showNotification = showNotification;
const ast_1 = require("@zenstackhq/language/ast");
const sdk_1 = require("@zenstackhq/sdk");
const colors_1 = __importDefault(require("colors"));
const fs_1 = __importDefault(require("fs"));
const langium_1 = require("langium");
const node_1 = require("langium/node");
const path_1 = __importDefault(require("path"));
const semver_1 = __importDefault(require("semver"));
const terminal_link_1 = __importDefault(require("terminal-link"));
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const vscode_uri_1 = require("vscode-uri");
const zod_1 = require("zod");
const constants_1 = require("../language-server/constants");
const zmodel_module_1 = require("../language-server/zmodel-module");
const ast_utils_1 = require("../utils/ast-utils");
const pkg_utils_1 = require("../utils/pkg-utils");
const version_utils_1 = require("../utils/version-utils");
const cli_error_1 = require("./cli-error");
// required minimal version of Prisma
exports.requiredPrismaVersion = '4.8.0';
const CHECK_VERSION_TIMEOUT = 1000;
const FETCH_CLI_CONFIG_TIMEOUT = 500;
const CLI_CONFIG_ENDPOINT = 'https://zenstack.dev/config/cli.json';
/**
 * Loads a zmodel document from a file.
 * @param fileName File name
 * @param services Language services
 * @returns Parsed and validated AST
 */
function loadDocument(fileName_1) {
    return __awaiter(this, arguments, void 0, function* (fileName, validateOnly = false) {
        const services = (0, zmodel_module_1.createZModelServices)(node_1.NodeFileSystem).ZModel;
        const extensions = services.LanguageMetaData.fileExtensions;
        if (!extensions.includes(path_1.default.extname(fileName))) {
            console.error(colors_1.default.yellow(`Please choose a file with extension: ${extensions}.`));
            throw new cli_error_1.CliError('invalid schema file');
        }
        if (!fs_1.default.existsSync(fileName)) {
            console.error(colors_1.default.red(`File ${fileName} does not exist.`));
            throw new cli_error_1.CliError('schema file does not exist');
        }
        // load standard library
        const stdLib = services.shared.workspace.LangiumDocuments.getOrCreateDocument(vscode_uri_1.URI.file(path_1.default.resolve(path_1.default.join(__dirname, '../res', constants_1.STD_LIB_MODULE_NAME))));
        // load documents provided by plugins
        const pluginDocuments = yield getPluginDocuments(services, fileName);
        const langiumDocuments = services.shared.workspace.LangiumDocuments;
        // load the document
        const document = langiumDocuments.getOrCreateDocument(vscode_uri_1.URI.file(path_1.default.resolve(fileName)));
        // load all imports
        const importedURIs = eagerLoadAllImports(document, langiumDocuments);
        const importedDocuments = importedURIs.map((uri) => langiumDocuments.getOrCreateDocument(uri));
        // build the document together with standard library, plugin modules, and imported documents
        yield services.shared.workspace.DocumentBuilder.build([stdLib, ...pluginDocuments, document, ...importedDocuments], {
            validationChecks: 'all',
        });
        const diagnostics = langiumDocuments.all
            .flatMap((doc) => { var _a; return ((_a = doc.diagnostics) !== null && _a !== void 0 ? _a : []).map((diag) => ({ doc, diag })); })
            .filter(({ diag }) => diag.severity === 1 || diag.severity === 2)
            .toArray();
        let hasErrors = false;
        if (diagnostics.length > 0) {
            for (const { doc, diag } of diagnostics) {
                const message = `${path_1.default.relative(process.cwd(), doc.uri.fsPath)}:${diag.range.start.line + 1}:${diag.range.start.character + 1} - ${diag.message}`;
                if (diag.severity === 1) {
                    console.error(colors_1.default.red(message));
                    hasErrors = true;
                }
                else {
                    console.warn(colors_1.default.yellow(message));
                }
            }
            if (hasErrors) {
                throw new cli_error_1.CliError('Schema contains validation errors');
            }
        }
        const model = document.parseResult.value;
        if (validateOnly) {
            return model;
        }
        // merge all declarations into the main document
        const imported = mergeImportsDeclarations(langiumDocuments, model);
        // remove imported documents
        imported.forEach((model) => langiumDocuments.deleteDocument(model.$document.uri));
        services.shared.workspace.IndexManager.remove(imported.map((model) => model.$document.uri));
        // extra validation after merging imported declarations
        validationAfterImportMerge(model);
        // merge fields and attributes from base models
        (0, ast_utils_1.mergeBaseModels)(model, services.references.Linker);
        // finally relink all references
        const relinkedModel = yield relinkAll(model, services);
        // filter out data model fields marked with `@ignore`
        filterIgnoredFields(relinkedModel);
        return relinkedModel;
    });
}
// check global unique thing after merge imports
function validationAfterImportMerge(model) {
    const dataSources = model.declarations.filter((d) => (0, ast_1.isDataSource)(d));
    if (dataSources.length == 0) {
        console.error(colors_1.default.red('Validation error: Model must define a datasource'));
        throw new cli_error_1.CliError('schema validation errors');
    }
    else if (dataSources.length > 1) {
        console.error(colors_1.default.red('Validation error: Multiple datasource declarations are not allowed'));
        throw new cli_error_1.CliError('schema validation errors');
    }
    // at most one `@@auth` model
    const decls = (0, sdk_1.getDataModelAndTypeDefs)(model, true);
    const authDecls = decls.filter((d) => (0, sdk_1.hasAttribute)(d, '@@auth'));
    if (authDecls.length > 1) {
        console.error(colors_1.default.red('Validation error: Multiple `@@auth` declarations are not allowed'));
        throw new cli_error_1.CliError('schema validation errors');
    }
}
function eagerLoadAllImports(document, documents, uris = new Set()) {
    const uriString = document.uri.toString();
    if (!uris.has(uriString)) {
        uris.add(uriString);
        const model = document.parseResult.value;
        for (const imp of model.imports) {
            const importedModel = (0, ast_utils_1.resolveImport)(documents, imp);
            if (importedModel) {
                const importedDoc = (0, langium_1.getDocument)(importedModel);
                eagerLoadAllImports(importedDoc, documents, uris);
            }
        }
    }
    return Array.from(uris)
        .filter((x) => uriString != x)
        .map((e) => vscode_uri_1.URI.parse(e));
}
function mergeImportsDeclarations(documents, model) {
    const importedModels = (0, ast_utils_1.resolveTransitiveImports)(documents, model);
    const importedDeclarations = importedModels.flatMap((m) => m.declarations);
    model.declarations.push(...importedDeclarations);
    // remove import directives
    model.imports = [];
    // fix $containerIndex
    (0, langium_1.linkContentToContainer)(model);
    return importedModels;
}
function getPluginDocuments(services, fileName) {
    return __awaiter(this, void 0, void 0, function* () {
        // parse the user document (without validation)
        const parseResult = services.parser.LangiumParser.parse(fs_1.default.readFileSync(fileName, { encoding: 'utf-8' }));
        const parsed = parseResult.value;
        // traverse plugins and collect "plugin.zmodel" documents
        const result = [];
        parsed.declarations.forEach((decl) => {
            if ((0, ast_1.isPlugin)(decl)) {
                const providerField = decl.fields.find((f) => f.name === 'provider');
                if (providerField) {
                    const provider = (0, sdk_1.getLiteral)(providerField.value);
                    if (provider) {
                        let pluginEntrance;
                        try {
                            // direct require
                            pluginEntrance = require.resolve(provider);
                        }
                        catch (_a) {
                            if (!path_1.default.isAbsolute(provider)) {
                                // relative path
                                try {
                                    pluginEntrance = require.resolve(path_1.default.join(path_1.default.dirname(fileName), provider));
                                }
                                catch (_b) {
                                    // noop
                                }
                            }
                        }
                        if (pluginEntrance) {
                            const pluginModelFile = path_1.default.join(path_1.default.dirname(pluginEntrance), constants_1.PLUGIN_MODULE_NAME);
                            if (fs_1.default.existsSync(pluginModelFile)) {
                                result.push(services.shared.workspace.LangiumDocuments.getOrCreateDocument(vscode_uri_1.URI.file(pluginModelFile)));
                            }
                        }
                    }
                }
            }
        });
        return result;
    });
}
function getZenStackPackages(projectPath) {
    var _a, _b;
    let pkgJson;
    const resolvedPath = path_1.default.resolve(projectPath);
    try {
        pkgJson = require(path_1.default.join(resolvedPath, 'package.json'));
    }
    catch (_c) {
        return [];
    }
    const packages = [
        ...Object.keys((_a = pkgJson.dependencies) !== null && _a !== void 0 ? _a : {}).filter((p) => p.startsWith('@zenstackhq/')),
        ...Object.keys((_b = pkgJson.devDependencies) !== null && _b !== void 0 ? _b : {}).filter((p) => p.startsWith('@zenstackhq/')),
    ];
    const result = packages.map((pkg) => {
        try {
            const resolved = require.resolve(`${pkg}/package.json`, { paths: [resolvedPath] });
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            return { pkg, version: require(resolved).version };
        }
        catch (_a) {
            return { pkg, version: undefined };
        }
    });
    result.splice(0, 0, { pkg: 'zenstack', version: (0, version_utils_1.getVersion)() });
    return result;
}
function checkRequiredPackage(packageName, minVersion) {
    let packageVersion;
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        packageVersion = require(`${packageName}/package.json`).version;
    }
    catch (error) {
        console.error(colors_1.default.red(`${packageName} not found, please install it`));
        throw new cli_error_1.CliError(`${packageName} not found`);
    }
    if (minVersion && semver_1.default.lt(packageVersion, minVersion)) {
        console.error(colors_1.default.red(`${packageName} needs to be above ${minVersion}, the installed version is ${packageVersion}, please upgrade it`));
        throw new cli_error_1.CliError(`${packageName} version is too low`);
    }
}
function checkNewVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        const currVersion = (0, version_utils_1.getVersion)();
        let latestVersion;
        try {
            latestVersion = yield getLatestVersion();
        }
        catch (_a) {
            // noop
            return;
        }
        if (latestVersion && currVersion && semver_1.default.gt(latestVersion, currVersion)) {
            console.log(`A newer version ${colors_1.default.cyan(latestVersion)} is available.`);
        }
    });
}
function getLatestVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const fetchResult = yield fetch('https://registry.npmjs.org/zenstack', {
            headers: { accept: 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*' },
            signal: AbortSignal.timeout(CHECK_VERSION_TIMEOUT),
        });
        if (fetchResult.ok) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = yield fetchResult.json();
            const latestVersion = (_a = data === null || data === void 0 ? void 0 : data['dist-tags']) === null || _a === void 0 ? void 0 : _a.latest;
            if (typeof latestVersion === 'string' && semver_1.default.valid(latestVersion)) {
                return latestVersion;
            }
        }
        throw new Error('invalid npm registry response');
    });
}
function formatDocument(fileName_1) {
    return __awaiter(this, arguments, void 0, function* (fileName, isPrismaStyle = true) {
        var _a;
        const services = (0, zmodel_module_1.createZModelServices)(node_1.NodeFileSystem).ZModel;
        const extensions = services.LanguageMetaData.fileExtensions;
        if (!extensions.includes(path_1.default.extname(fileName))) {
            console.error(colors_1.default.yellow(`Please choose a file with extension: ${extensions}.`));
            throw new cli_error_1.CliError('invalid schema file');
        }
        const langiumDocuments = services.shared.workspace.LangiumDocuments;
        const document = langiumDocuments.getOrCreateDocument(vscode_uri_1.URI.file(path_1.default.resolve(fileName)));
        const formatter = services.lsp.Formatter;
        formatter.setPrismaStyle(isPrismaStyle);
        const identifier = { uri: document.uri.toString() };
        const options = (_a = formatter.getFormatOptions()) !== null && _a !== void 0 ? _a : {
            insertSpaces: true,
            tabSize: 4,
        };
        const edits = yield formatter.formatDocument(document, { options, textDocument: identifier });
        return vscode_languageserver_textdocument_1.TextDocument.applyEdits(document.textDocument, edits);
    });
}
function getDefaultSchemaLocation() {
    var _a;
    // handle override from package.json
    const pkgJsonPath = (0, pkg_utils_1.findUp)(['package.json']);
    if (pkgJsonPath) {
        const pkgJson = JSON.parse(fs_1.default.readFileSync(pkgJsonPath, 'utf-8'));
        if (typeof ((_a = pkgJson === null || pkgJson === void 0 ? void 0 : pkgJson.zenstack) === null || _a === void 0 ? void 0 : _a.schema) === 'string') {
            if (path_1.default.isAbsolute(pkgJson.zenstack.schema)) {
                return pkgJson.zenstack.schema;
            }
            else {
                // resolve relative to package.json
                return path_1.default.resolve(path_1.default.dirname(pkgJsonPath), pkgJson.zenstack.schema);
            }
        }
    }
    return path_1.default.resolve('schema.zmodel');
}
function relinkAll(model, services) {
    return __awaiter(this, void 0, void 0, function* () {
        const doc = model.$document;
        // unlink the document
        services.references.Linker.unlink(doc);
        // remove current document
        yield services.shared.workspace.DocumentBuilder.update([], [doc.uri]);
        // recreate and load the document
        const newDoc = services.shared.workspace.LangiumDocumentFactory.fromModel(model, doc.uri);
        services.shared.workspace.LangiumDocuments.addDocument(newDoc);
        // rebuild the document
        yield services.shared.workspace.DocumentBuilder.build([newDoc], { validationChecks: 'all' });
        return newDoc.parseResult.value;
    });
}
function filterIgnoredFields(model) {
    model.declarations.forEach((decl) => {
        if (!(0, ast_1.isDataModel)(decl)) {
            return;
        }
        decl.$allFields = [...decl.fields];
        decl.fields = decl.fields.filter((f) => !(0, sdk_1.hasAttribute)(f, '@ignore'));
    });
}
function showNotification() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const fetchResult = yield fetch(CLI_CONFIG_ENDPOINT, {
                headers: { accept: 'application/json' },
                signal: AbortSignal.timeout(FETCH_CLI_CONFIG_TIMEOUT),
            });
            if (!fetchResult.ok) {
                return;
            }
            const data = yield fetchResult.json();
            const schema = zod_1.z.object({
                notifications: zod_1.z.array(zod_1.z.object({ title: zod_1.z.string(), url: zod_1.z.string().url(), active: zod_1.z.boolean() })),
            });
            const parseResult = schema.safeParse(data);
            if (parseResult.success) {
                const activeItems = parseResult.data.notifications.filter((item) => item.active);
                // return a random active item
                if (activeItems.length > 0) {
                    const item = activeItems[Math.floor(Math.random() * activeItems.length)];
                    console.log((0, terminal_link_1.default)(item.title, item.url));
                }
            }
        }
        catch (_a) {
            // noop
        }
    });
}
//# sourceMappingURL=cli-util.js.map