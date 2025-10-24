"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDuplicatedDeclarations = validateDuplicatedDeclarations;
exports.getStringLiteral = getStringLiteral;
exports.typeAssignable = typeAssignable;
exports.mapBuiltinTypeToExpressionType = mapBuiltinTypeToExpressionType;
exports.isAuthOrAuthMemberAccess = isAuthOrAuthMemberAccess;
const ast_1 = require("@zenstackhq/language/ast");
const sdk_1 = require("@zenstackhq/sdk");
/**
 * Checks if the given declarations have duplicated names
 */
function validateDuplicatedDeclarations(container, decls, accept) {
    const groupByName = decls.reduce((group, decl) => {
        var _a;
        group[decl.name] = (_a = group[decl.name]) !== null && _a !== void 0 ? _a : [];
        group[decl.name].push(decl);
        return group;
    }, {});
    for (const [name, decls] of Object.entries(groupByName)) {
        if (decls.length > 1) {
            let errorField = decls[1];
            if ((0, ast_1.isDataModelField)(decls[0])) {
                const nonInheritedFields = decls.filter((x) => !((0, ast_1.isDataModelField)(x) && x.$container !== container));
                if (nonInheritedFields.length > 0) {
                    errorField = nonInheritedFields.slice(-1)[0];
                }
            }
            accept('error', `Duplicated declaration name "${name}"`, {
                node: errorField,
            });
        }
    }
}
/**
 * Try getting string value from a potential string literal expression
 */
function getStringLiteral(node) {
    return (0, ast_1.isStringLiteral)(node) ? node.value : undefined;
}
const isoDateTimeRegex = /^\d{4}(-\d\d(-\d\d(T\d\d:\d\d(:\d\d)?(\.\d+)?(([+-]\d\d:\d\d)|Z)?)?)?)?$/i;
/**
 * Determines if the given sourceType is assignable to a destination of destType
 */
function typeAssignable(destType, sourceType, sourceExpr) {
    // implicit conversion from ISO datetime string to datetime
    if (destType === 'DateTime' && sourceType === 'String' && sourceExpr && (0, ast_1.isStringLiteral)(sourceExpr)) {
        const literal = getStringLiteral(sourceExpr);
        if (literal && isoDateTimeRegex.test(literal)) {
            // implicitly convert to DateTime
            sourceType = 'DateTime';
        }
    }
    switch (destType) {
        case 'Any':
            return true;
        case 'Float':
            return sourceType === 'Any' || sourceType === 'Int' || sourceType === 'Float';
        default:
            return sourceType === 'Any' || sourceType === destType;
    }
}
/**
 * Maps a ZModel builtin type to expression type
 */
function mapBuiltinTypeToExpressionType(type) {
    switch (type) {
        case 'Any':
        case 'Boolean':
        case 'String':
        case 'DateTime':
        case 'Int':
        case 'Float':
        case 'Null':
            return type;
        case 'BigInt':
            return 'Int';
        case 'Decimal':
            return 'Float';
        case 'Json':
        case 'Bytes':
            return 'Any';
        case 'Object':
            return 'Object';
        case 'Unsupported':
            return 'Unsupported';
    }
}
function isAuthOrAuthMemberAccess(expr) {
    return (0, sdk_1.isAuthInvocation)(expr) || ((0, ast_1.isMemberAccessExpr)(expr) && isAuthOrAuthMemberAccess(expr.operand));
}
//# sourceMappingURL=utils.js.map