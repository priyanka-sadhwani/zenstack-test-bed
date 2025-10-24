"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZModelDocumentationProvider = void 0;
const langium_1 = require("langium");
/**
 * Documentation provider that first tries to use triple-slash comments and falls back to JSDoc comments.
 */
class ZModelDocumentationProvider extends langium_1.JSDocDocumentationProvider {
    getDocumentation(node) {
        // prefer to use triple-slash comments
        if ('comments' in node && Array.isArray(node.comments) && node.comments.length > 0) {
            return node.comments.map((c) => c.replace(/^[/]*\s*/, '')).join('\n');
        }
        // fall back to JSDoc comments
        return super.getDocumentation(node);
    }
}
exports.ZModelDocumentationProvider = ZModelDocumentationProvider;
//# sourceMappingURL=zmodel-documentation-provider.js.map