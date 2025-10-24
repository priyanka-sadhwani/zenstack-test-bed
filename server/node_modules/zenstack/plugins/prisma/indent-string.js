"use strict";
// https://github.com/sindresorhus/indent-string
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = indentString;
/**
 * Utility for indenting strings
 */
function indentString(string, count = 4) {
    const indent = ' ';
    return string.replace(/^(?!\s*$)/gm, indent.repeat(count));
}
//# sourceMappingURL=indent-string.js.map