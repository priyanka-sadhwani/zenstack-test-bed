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
exports.info = info;
const colors_1 = __importDefault(require("colors"));
const ora_1 = __importDefault(require("ora"));
const semver_1 = __importDefault(require("semver"));
const cli_util_1 = require("../cli-util");
/**
 * CLI action for getting information about installed ZenStack packages
 */
function info(projectPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const packages = (0, cli_util_1.getZenStackPackages)(projectPath);
        if (!packages) {
            console.error('Unable to locate package.json. Are you in a valid project directory?');
            return;
        }
        console.log('Installed ZenStack Packages:');
        const versions = new Set();
        for (const { pkg, version } of packages) {
            if (version) {
                versions.add(version);
            }
            console.log(`    ${colors_1.default.green(pkg.padEnd(20))}\t${version}`);
        }
        if (versions.size > 1) {
            console.warn(colors_1.default.yellow('WARNING: Multiple versions of Zenstack packages detected. This may cause issues.'));
        }
        else if (versions.size > 0) {
            const spinner = (0, ora_1.default)('Checking npm registry').start();
            let latest;
            try {
                latest = yield (0, cli_util_1.getLatestVersion)();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }
            catch (err) {
                spinner.fail(`Failed to get latest version: ${err.message}`);
                return;
            }
            spinner.succeed();
            const version = [...versions][0];
            if (semver_1.default.gt(latest, version)) {
                console.log(`A newer version of Zenstack is available: ${latest}.`);
            }
            else if (semver_1.default.gt(version, latest)) {
                console.log('You are using a pre-release version of Zenstack.');
            }
            else {
                console.log('You are using the latest version of Zenstack.');
            }
        }
    });
}
//# sourceMappingURL=info.js.map