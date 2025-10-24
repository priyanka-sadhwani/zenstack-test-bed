"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ast_1 = require("@zenstackhq/language/ast");
const sdk_1 = require("@zenstackhq/sdk");
const langium_1 = require("langium");
const ts_pattern_1 = require("ts-pattern");
const ast_utils_1 = require("../../utils/ast-utils");
const utils_1 = require("./utils");
// a registry of function handlers marked with @func
const invocationCheckers = new Map();
// function handler decorator
function func(name) {
    return function (_target, _propertyKey, descriptor) {
        if (!invocationCheckers.get(name)) {
            invocationCheckers.set(name, descriptor);
        }
        return descriptor;
    };
}
/**
 * InvocationExpr validation
 */
class FunctionInvocationValidator {
    validate(expr, accept) {
        var _a, _b, _c, _d, _e;
        const funcDecl = expr.function.ref;
        if (!funcDecl) {
            accept('error', 'function cannot be resolved', { node: expr });
            return;
        }
        if (!this.validateArgs(funcDecl, expr.args, accept)) {
            return;
        }
        if ((0, sdk_1.isFromStdlib)(funcDecl)) {
            // validate standard library functions
            // find the containing attribute context for the invocation
            let curr = expr.$container;
            let containerAttribute;
            while (curr) {
                if ((0, ast_1.isDataModelAttribute)(curr) || (0, ast_1.isDataModelFieldAttribute)(curr)) {
                    containerAttribute = curr;
                    break;
                }
                curr = curr.$container;
            }
            // validate the context allowed for the function
            const exprContext = this.getExpressionContext(containerAttribute);
            // get the context allowed for the function
            const funcAllowedContext = (0, sdk_1.getFunctionExpressionContext)(funcDecl);
            if (funcAllowedContext.length > 0 && (!exprContext || !funcAllowedContext.includes(exprContext))) {
                accept('error', `function "${funcDecl.name}" is not allowed in the current context${exprContext ? ': ' + exprContext : ''}`, {
                    node: expr,
                });
                return;
            }
            // TODO: express function validation rules declaratively in ZModel
            const allCasing = ['original', 'upper', 'lower', 'capitalize', 'uncapitalize'];
            if (['currentModel', 'currentOperation'].includes(funcDecl.name)) {
                const arg = (0, sdk_1.getLiteral)((_a = expr.args[0]) === null || _a === void 0 ? void 0 : _a.value);
                if (arg && !allCasing.includes(arg)) {
                    accept('error', `argument must be one of: ${allCasing.map((c) => '"' + c + '"').join(', ')}`, {
                        node: expr.args[0],
                    });
                }
            }
            else if (funcAllowedContext.includes(sdk_1.ExpressionContext.AccessPolicy) ||
                funcAllowedContext.includes(sdk_1.ExpressionContext.ValidationRule)) {
                // filter operation functions validation
                // first argument must refer to a model field
                const firstArg = (_c = (_b = expr.args) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.value;
                if (firstArg) {
                    if (!(0, sdk_1.getFieldReference)(firstArg)) {
                        accept('error', 'first argument must be a field reference', { node: firstArg });
                    }
                }
                // second argument must be a literal or array of literal
                const secondArg = (_e = (_d = expr.args) === null || _d === void 0 ? void 0 : _d[1]) === null || _e === void 0 ? void 0 : _e.value;
                if (secondArg &&
                    // literal
                    !(0, ast_1.isLiteralExpr)(secondArg) &&
                    // enum field
                    !(0, sdk_1.isEnumFieldReference)(secondArg) &&
                    // `auth()...` expression
                    !(0, utils_1.isAuthOrAuthMemberAccess)(secondArg) &&
                    // static function calls that are runtime constants: `currentModel`, `currentOperation`
                    !this.isStaticFunctionCall(secondArg) &&
                    // array of literal/enum
                    !((0, ast_1.isArrayExpr)(secondArg) &&
                        secondArg.items.every((item) => (0, ast_1.isLiteralExpr)(item) || (0, sdk_1.isEnumFieldReference)(item) || (0, utils_1.isAuthOrAuthMemberAccess)(item)))) {
                    accept('error', 'second argument must be a literal, an enum, an expression starting with `auth().`, or an array of them', {
                        node: secondArg,
                    });
                }
            }
        }
        // run checkers for specific functions
        const checker = invocationCheckers.get(expr.function.$refText);
        if (checker) {
            checker.value.call(this, expr, accept);
        }
    }
    getExpressionContext(containerAttribute) {
        if (!containerAttribute) {
            return undefined;
        }
        if ((0, sdk_1.isValidationAttribute)(containerAttribute)) {
            return sdk_1.ExpressionContext.ValidationRule;
        }
        return (0, ts_pattern_1.match)(containerAttribute === null || containerAttribute === void 0 ? void 0 : containerAttribute.decl.$refText)
            .with('@default', () => sdk_1.ExpressionContext.DefaultValue)
            .with(ts_pattern_1.P.union('@@allow', '@@deny', '@allow', '@deny'), () => sdk_1.ExpressionContext.AccessPolicy)
            .with('@@index', () => sdk_1.ExpressionContext.Index)
            .otherwise(() => undefined);
    }
    isStaticFunctionCall(expr) {
        return (0, ast_1.isInvocationExpr)(expr) && ['currentModel', 'currentOperation'].includes(expr.function.$refText);
    }
    validateArgs(funcDecl, args, accept) {
        let success = true;
        for (let i = 0; i < funcDecl.params.length; i++) {
            const param = funcDecl.params[i];
            const arg = args[i];
            if (!arg) {
                if (!param.optional) {
                    accept('error', `missing argument for parameter "${param.name}"`, { node: funcDecl });
                    success = false;
                }
            }
            else {
                if (!this.validateInvocationArg(arg, param, accept)) {
                    success = false;
                }
            }
        }
        // TODO: do we need to complain for extra arguments?
        return success;
    }
    validateInvocationArg(arg, param, accept) {
        var _a;
        const argResolvedType = (_a = arg === null || arg === void 0 ? void 0 : arg.value) === null || _a === void 0 ? void 0 : _a.$resolvedType;
        if (!argResolvedType) {
            accept('error', 'argument type cannot be resolved', { node: arg });
            return false;
        }
        const dstType = param.type.type;
        if (!dstType) {
            accept('error', 'parameter type cannot be resolved', { node: param });
            return false;
        }
        const dstIsArray = param.type.array;
        const dstRef = param.type.reference;
        if (dstType === 'Any' && !dstIsArray) {
            // scalar 'any' can be assigned with anything
            return true;
        }
        if (typeof argResolvedType.decl === 'string') {
            // scalar type
            if (!(0, utils_1.typeAssignable)(dstType, argResolvedType.decl, arg.value) || dstIsArray !== argResolvedType.array) {
                accept('error', `argument is not assignable to parameter`, {
                    node: arg,
                });
                return false;
            }
        }
        else {
            // enum or model type
            if (((dstRef === null || dstRef === void 0 ? void 0 : dstRef.ref) !== argResolvedType.decl && dstType !== 'Any') || dstIsArray !== argResolvedType.array) {
                accept('error', `argument is not assignable to parameter`, {
                    node: arg,
                });
                return false;
            }
        }
        return true;
    }
    _checkCheck(expr, accept) {
        var _a, _b, _c, _d, _e, _f;
        let valid = true;
        const fieldArg = expr.args[0].value;
        if (!(0, sdk_1.isDataModelFieldReference)(fieldArg) || !(0, ast_1.isDataModel)((_a = fieldArg.$resolvedType) === null || _a === void 0 ? void 0 : _a.decl)) {
            accept('error', 'argument must be a relation field', { node: expr.args[0] });
            valid = false;
        }
        if ((_b = fieldArg.$resolvedType) === null || _b === void 0 ? void 0 : _b.array) {
            accept('error', 'argument cannot be an array field', { node: expr.args[0] });
            valid = false;
        }
        const opArg = (_c = expr.args[1]) === null || _c === void 0 ? void 0 : _c.value;
        if (opArg) {
            const operation = (0, sdk_1.getLiteral)(opArg);
            if (!operation || !['read', 'create', 'update', 'delete'].includes(operation)) {
                accept('error', 'argument must be a "read", "create", "update", or "delete"', { node: expr.args[1] });
                valid = false;
            }
        }
        if (!valid) {
            return;
        }
        // check for cyclic relation checking
        const start = (_d = fieldArg.$resolvedType) === null || _d === void 0 ? void 0 : _d.decl;
        const tasks = [expr];
        const seen = new Set();
        while (tasks.length > 0) {
            const currExpr = tasks.pop();
            const arg = (_e = currExpr.args[0]) === null || _e === void 0 ? void 0 : _e.value;
            if (!(0, ast_1.isDataModel)((_f = arg === null || arg === void 0 ? void 0 : arg.$resolvedType) === null || _f === void 0 ? void 0 : _f.decl)) {
                continue;
            }
            const currModel = arg.$resolvedType.decl;
            if (seen.has(currModel)) {
                if (currModel === start) {
                    accept('error', 'cyclic dependency detected when following the `check()` call', { node: expr });
                }
                else {
                    // a cycle is detected but it doesn't start from the invocation expression we're checking,
                    // just break here and the cycle will be reported when we validate the start of it
                }
                break;
            }
            else {
                seen.add(currModel);
            }
            const policyAttrs = currModel.attributes.filter((attr) => attr.decl.$refText === '@@allow' || attr.decl.$refText === '@@deny');
            for (const attr of policyAttrs) {
                const rule = attr.args[1];
                if (!rule) {
                    continue;
                }
                (0, langium_1.streamAst)(rule).forEach((node) => {
                    if ((0, ast_utils_1.isCheckInvocation)(node)) {
                        tasks.push(node);
                    }
                });
            }
        }
    }
}
exports.default = FunctionInvocationValidator;
__decorate([
    func('check')
], FunctionInvocationValidator.prototype, "_checkCheck", null);
//# sourceMappingURL=function-invocation-validator.js.map