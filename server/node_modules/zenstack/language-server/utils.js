"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUniqueFields = getUniqueFields;
exports.isMemberContainer = isMemberContainer;
const ast_1 = require("@zenstackhq/language/ast");
const sdk_1 = require("@zenstackhq/sdk");
/**
 * Gets lists of unique fields declared at the data model level
 */
function getUniqueFields(model) {
    const uniqueAttrs = model.attributes.filter((attr) => { var _a, _b; return ((_a = attr.decl.ref) === null || _a === void 0 ? void 0 : _a.name) === '@@unique' || ((_b = attr.decl.ref) === null || _b === void 0 ? void 0 : _b.name) === '@@id'; });
    return uniqueAttrs.map((uniqueAttr) => {
        const fieldsArg = uniqueAttr.args.find((a) => { var _a; return ((_a = a.$resolvedParam) === null || _a === void 0 ? void 0 : _a.name) === 'fields'; });
        if (!fieldsArg || !(0, ast_1.isArrayExpr)(fieldsArg.value)) {
            return [];
        }
        return fieldsArg.value.items
            .filter((item) => (0, ast_1.isReferenceExpr)(item))
            .map((item) => (0, sdk_1.resolved)(item.target));
    });
}
/**
 * Checks if the given node can contain resolvable members.
 */
function isMemberContainer(node) {
    return (0, ast_1.isDataModel)(node) || (0, ast_1.isTypeDef)(node);
}
//# sourceMappingURL=utils.js.map