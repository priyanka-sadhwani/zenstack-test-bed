"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVersion = getVersion;
/* eslint-disable @typescript-eslint/no-var-requires */
function getVersion() {
    try {
        return require('../package.json').version;
    }
    catch (_a) {
        try {
            // dev environment
            return require('../../package.json').version;
        }
        catch (_b) {
            return undefined;
        }
    }
}
//# sourceMappingURL=version-utils.js.map