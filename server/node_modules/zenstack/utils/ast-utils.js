"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDataModelsWithAllowRules = extractDataModelsWithAllowRules;
exports.mergeBaseModels = mergeBaseModels;
exports.isAuthInvocation = isAuthInvocation;
exports.isFutureInvocation = isFutureInvocation;
exports.isCheckInvocation = isCheckInvocation;
exports.resolveImportUri = resolveImportUri;
exports.resolveTransitiveImports = resolveTransitiveImports;
exports.resolveImport = resolveImport;
exports.getAllDeclarationsIncludingImports = getAllDeclarationsIncludingImports;
exports.getAllDataModelsIncludingImports = getAllDataModelsIncludingImports;
exports.isCollectionPredicate = isCollectionPredicate;
exports.getContainingDataModel = getContainingDataModel;
exports.findUpAst = findUpAst;
exports.getAllLoadedDataModelsAndTypeDefs = getAllLoadedDataModelsAndTypeDefs;
exports.getAllLoadedAndReachableDataModelsAndTypeDefs = getAllLoadedAndReachableDataModelsAndTypeDefs;
exports.findUpInheritance = findUpInheritance;
exports.getConcreteModels = getConcreteModels;
exports.getDiscriminatorField = getDiscriminatorField;
const ast_1 = require("@zenstackhq/language/ast");
const sdk_1 = require("@zenstackhq/sdk");
const langium_1 = require("langium");
const node_path_1 = __importDefault(require("node:path"));
const vscode_uri_1 = require("vscode-uri");
const pkg_utils_1 = require("./pkg-utils");
function extractDataModelsWithAllowRules(model) {
    return model.declarations.filter((d) => (0, ast_1.isDataModel)(d) && d.attributes.some((attr) => { var _a; return ((_a = attr.decl.ref) === null || _a === void 0 ? void 0 : _a.name) === '@@allow'; }));
}
function mergeBaseModels(model, linker) {
    const buildReference = linker.buildReference.bind(linker);
    model.declarations.filter(ast_1.isDataModel).forEach((dataModel) => {
        const bases = (0, sdk_1.getRecursiveBases)(dataModel).reverse();
        if (bases.length > 0) {
            dataModel.fields = bases
                .flatMap((base) => base.fields)
                // don't inherit skip-level fields
                .filter((f) => !f.$inheritedFrom)
                .map((f) => cloneAst(f, dataModel, buildReference))
                .concat(dataModel.fields);
            dataModel.attributes = bases
                .flatMap((base) => base.attributes.filter((attr) => filterBaseAttribute(dataModel, base, attr)))
                .map((attr) => cloneAst(attr, dataModel, buildReference))
                .concat(dataModel.attributes);
        }
        // mark base merged
        dataModel.$baseMerged = true;
    });
    // remove abstract models
    model.declarations = model.declarations.filter((x) => !((0, ast_1.isDataModel)(x) && x.isAbstract));
    model.declarations.filter(ast_1.isDataModel).forEach((dm) => {
        // remove abstract super types
        dm.superTypes = dm.superTypes.filter((t) => t.ref && (0, sdk_1.isDelegateModel)(t.ref));
        // fix $containerIndex
        (0, langium_1.linkContentToContainer)(dm);
    });
    // fix $containerIndex after deleting abstract models
    (0, langium_1.linkContentToContainer)(model);
}
function filterBaseAttribute(forModel, base, attr) {
    if (attr.$inheritedFrom) {
        // don't inherit from skip-level base
        return false;
    }
    // uninheritable attributes for all inheritance
    const uninheritableAttributes = ['@@delegate', '@@map'];
    // uninheritable attributes for delegate inheritance (they reference fields from the base)
    const uninheritableFromDelegateAttributes = ['@@unique', '@@index', '@@fulltext'];
    // attributes that are inherited but can be overridden
    const overrideAttributes = ['@@schema'];
    if (uninheritableAttributes.includes(attr.decl.$refText)) {
        return false;
    }
    if (
    // checks if the inheritance is from a delegate model or through one, if so,
    // the attribute shouldn't be inherited as the delegate already inherits it
    isInheritedFromOrThroughDelegate(forModel, base) &&
        uninheritableFromDelegateAttributes.includes(attr.decl.$refText)) {
        return false;
    }
    if ((0, sdk_1.hasAttribute)(forModel, attr.decl.$refText) && overrideAttributes.includes(attr.decl.$refText)) {
        // don't inherit an attribute if it's overridden in the sub model
        return false;
    }
    return true;
}
function isInheritedFromOrThroughDelegate(model, base) {
    if ((0, sdk_1.isDelegateModel)(base)) {
        return true;
    }
    const chain = (0, sdk_1.getInheritanceChain)(model, base);
    return !!(chain === null || chain === void 0 ? void 0 : chain.some(sdk_1.isDelegateModel));
}
// deep clone an AST, relink references, and set its container
function cloneAst(node, newContainer, buildReference) {
    var _a;
    const clone = (0, langium_1.copyAstNode)(node, buildReference);
    clone.$container = newContainer;
    if ((0, ast_1.isDataModel)(newContainer) && (0, ast_1.isDataModelField)(node)) {
        // walk up the hierarchy to find the upper-most delegate ancestor that defines the field
        const delegateBases = (0, sdk_1.getRecursiveBases)(newContainer).filter(sdk_1.isDelegateModel);
        clone.$inheritedFrom = delegateBases.findLast((base) => base.fields.some((f) => f.name === node.name));
    }
    if (!clone.$inheritedFrom) {
        clone.$inheritedFrom = (_a = node.$inheritedFrom) !== null && _a !== void 0 ? _a : (0, langium_1.getContainerOfType)(node, ast_1.isDataModel);
    }
    return clone;
}
function isAuthInvocation(node) {
    var _a;
    return (0, ast_1.isInvocationExpr)(node) && ((_a = node.function.ref) === null || _a === void 0 ? void 0 : _a.name) === 'auth' && (0, sdk_1.isFromStdlib)(node.function.ref);
}
function isFutureInvocation(node) {
    var _a;
    return (0, ast_1.isInvocationExpr)(node) && ((_a = node.function.ref) === null || _a === void 0 ? void 0 : _a.name) === 'future' && (0, sdk_1.isFromStdlib)(node.function.ref);
}
function isCheckInvocation(node) {
    var _a;
    return (0, ast_1.isInvocationExpr)(node) && ((_a = node.function.ref) === null || _a === void 0 ? void 0 : _a.name) === 'check' && (0, sdk_1.isFromStdlib)(node.function.ref);
}
function resolveImportUri(imp) {
    var _a;
    if (!imp.path)
        return undefined; // This will return true if imp.path is undefined, null, or an empty string ("").
    if (!imp.path.endsWith('.zmodel')) {
        imp.path += '.zmodel';
    }
    if (!imp.path.startsWith('.') && // Respect relative paths
        !node_path_1.default.isAbsolute(imp.path) // Respect Absolute paths
    ) {
        // use the current model's path as the search context
        const contextPath = imp.$container.$document
            ? node_path_1.default.dirname(imp.$container.$document.uri.fsPath)
            : process.cwd();
        imp.path = (_a = (0, pkg_utils_1.findNodeModulesFile)(imp.path, contextPath)) !== null && _a !== void 0 ? _a : imp.path;
    }
    const dirUri = vscode_uri_1.Utils.dirname((0, langium_1.getDocument)(imp).uri);
    return vscode_uri_1.Utils.resolvePath(dirUri, imp.path);
}
function resolveTransitiveImports(documents, model) {
    return resolveTransitiveImportsInternal(documents, model);
}
function resolveTransitiveImportsInternal(documents, model, initialModel = model, visited = new Set(), models = new Set()) {
    const doc = (0, langium_1.getDocument)(model);
    const initialDoc = (0, langium_1.getDocument)(initialModel);
    if (initialDoc.uri.fsPath.toLowerCase() !== doc.uri.fsPath.toLowerCase()) {
        models.add(model);
    }
    const normalizedPath = doc.uri.fsPath.toLowerCase();
    if (!visited.has(normalizedPath)) {
        visited.add(normalizedPath);
        for (const imp of model.imports) {
            const importedModel = resolveImport(documents, imp);
            if (importedModel) {
                resolveTransitiveImportsInternal(documents, importedModel, initialModel, visited, models);
            }
        }
    }
    return Array.from(models);
}
function resolveImport(documents, imp) {
    const resolvedUri = resolveImportUri(imp);
    try {
        if (resolvedUri) {
            const resolvedDocument = documents.getOrCreateDocument(resolvedUri);
            const node = resolvedDocument.parseResult.value;
            if ((0, ast_1.isModel)(node)) {
                return node;
            }
        }
    }
    catch (_a) {
        // NOOP
    }
    return undefined;
}
function getAllDeclarationsIncludingImports(documents, model) {
    const imports = resolveTransitiveImports(documents, model);
    return model.declarations.concat(...imports.map((imp) => imp.declarations));
}
function getAllDataModelsIncludingImports(documents, model) {
    return getAllDeclarationsIncludingImports(documents, model).filter(ast_1.isDataModel);
}
function isCollectionPredicate(node) {
    return (0, ast_1.isBinaryExpr)(node) && ['?', '!', '^'].includes(node.operator);
}
function getContainingDataModel(node) {
    let curr = node.$container;
    while (curr) {
        if ((0, ast_1.isDataModel)(curr)) {
            return curr;
        }
        curr = curr.$container;
    }
    return undefined;
}
/**
 * Walk upward from the current AST node to find the first node that satisfies the predicate.
 */
function findUpAst(node, predicate) {
    let curr = node;
    while (curr) {
        if (predicate(curr)) {
            return curr;
        }
        curr = curr.$container;
    }
    return undefined;
}
/**
 * Gets all data models and type defs from all loaded documents
 */
function getAllLoadedDataModelsAndTypeDefs(langiumDocuments) {
    return langiumDocuments.all
        .map((doc) => doc.parseResult.value)
        .flatMap((model) => model.declarations.filter((d) => (0, ast_1.isDataModel)(d) || (0, ast_1.isTypeDef)(d)))
        .toArray();
}
/**
 * Gets all data models and type defs from loaded and reachable documents
 */
function getAllLoadedAndReachableDataModelsAndTypeDefs(langiumDocuments, fromModel) {
    // get all data models from loaded documents
    const allDataModels = getAllLoadedDataModelsAndTypeDefs(langiumDocuments);
    if (fromModel) {
        // merge data models transitively reached from the current model
        const model = (0, langium_1.getContainerOfType)(fromModel, ast_1.isModel);
        if (model) {
            const transitiveDataModels = getAllDataModelsIncludingImports(langiumDocuments, model);
            transitiveDataModels.forEach((dm) => {
                if (!allDataModels.includes(dm)) {
                    allDataModels.push(dm);
                }
            });
        }
    }
    return allDataModels;
}
/**
 * Walk up the inheritance chain to find the path from the start model to the target model
 */
function findUpInheritance(start, target) {
    for (const base of start.superTypes) {
        if (base.ref === target) {
            return [base.ref];
        }
        const path = findUpInheritance(base.ref, target);
        if (path) {
            return [base.ref, ...path];
        }
    }
    return undefined;
}
/**
 * Gets all concrete models that inherit from the given delegate model
 */
function getConcreteModels(dataModel) {
    if (!(0, sdk_1.isDelegateModel)(dataModel)) {
        return [];
    }
    return dataModel.$container.declarations.filter((d) => (0, ast_1.isDataModel)(d) && d !== dataModel && d.superTypes.some((base) => base.ref === dataModel));
}
/**
 * Gets the discriminator field for the given delegate model
 */
function getDiscriminatorField(dataModel) {
    var _a;
    const delegateAttr = (0, sdk_1.getAttribute)(dataModel, '@@delegate');
    if (!delegateAttr) {
        return undefined;
    }
    const arg = (_a = delegateAttr.args[0]) === null || _a === void 0 ? void 0 : _a.value;
    return (0, ast_1.isReferenceExpr)(arg) ? arg.target.ref : undefined;
}
//# sourceMappingURL=ast-utils.js.map