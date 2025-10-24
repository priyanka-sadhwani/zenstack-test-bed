"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPolicyExpressions = getPolicyExpressions;
exports.generateSelectForRules = generateSelectForRules;
exports.generateConstantQueryGuardFunction = generateConstantQueryGuardFunction;
exports.generateQueryGuardFunction = generateQueryGuardFunction;
exports.generateEntityCheckerFunction = generateEntityCheckerFunction;
exports.generateNormalizedAuthRef = generateNormalizedAuthRef;
exports.isEnumReferenced = isEnumReferenced;
const sdk_1 = require("@zenstackhq/sdk");
const ast_1 = require("@zenstackhq/sdk/ast");
const deepmerge_1 = __importDefault(require("deepmerge"));
const langium_1 = require("langium");
const __1 = require("..");
const ast_utils_1 = require("../../../utils/ast-utils");
const expression_writer_1 = require("./expression-writer");
/**
 * Get policy expressions for the given model or field and operation kind
 */
function getPolicyExpressions(target, kind, operation, forOverride = false, filter = 'all') {
    const attributes = target.attributes;
    const attrName = (0, ast_1.isDataModel)(target) ? `@@${kind}` : `@${kind}`;
    const attrs = attributes.filter((attr) => {
        var _a;
        if (((_a = attr.decl.ref) === null || _a === void 0 ? void 0 : _a.name) !== attrName) {
            return false;
        }
        const overrideArg = (0, sdk_1.getAttributeArg)(attr, 'override');
        const isOverride = !!overrideArg && (0, sdk_1.getLiteral)(overrideArg) === true;
        return (forOverride && isOverride) || (!forOverride && !isOverride);
    });
    const checkOperation = operation === 'postUpdate' ? 'update' : operation;
    let result = attrs
        .filter((attr) => {
        const opsValue = (0, sdk_1.getLiteral)(attr.args[0].value);
        if (!opsValue) {
            return false;
        }
        const ops = opsValue.split(',').map((s) => s.trim());
        return ops.includes(checkOperation) || ops.includes('all');
    })
        .map((attr) => attr.args[1].value);
    if (filter === 'onlyCrossModelComparison') {
        result = result.filter((expr) => hasCrossModelComparison(expr));
    }
    else if (filter === 'withoutCrossModelComparison') {
        result = result.filter((expr) => !hasCrossModelComparison(expr));
    }
    if (operation === 'update') {
        result = processUpdatePolicies(result, false);
    }
    else if (operation === 'postUpdate') {
        result = processUpdatePolicies(result, true);
    }
    return result;
}
function hasFutureReference(expr) {
    var _a;
    for (const node of (0, langium_1.streamAst)(expr)) {
        if ((0, ast_1.isInvocationExpr)(node) && ((_a = node.function.ref) === null || _a === void 0 ? void 0 : _a.name) === 'future' && (0, sdk_1.isFromStdlib)(node.function.ref)) {
            return true;
        }
    }
    return false;
}
function processUpdatePolicies(expressions, postUpdate) {
    const hasFutureRef = expressions.some(hasFutureReference);
    if (postUpdate) {
        // when compiling post-update rules, if any rule contains `future()` reference,
        // we include all as post-update rules
        return hasFutureRef ? expressions : [];
    }
    else {
        // when compiling pre-update rules, if any rule contains `future()` reference,
        // we completely skip pre-update check and defer them to post-update
        return hasFutureRef ? [] : expressions;
    }
}
/**
 * Generates a "select" object that contains (recursively) fields referenced by the
 * given policy rules
 */
function generateSelectForRules(rules, forOperation, forAuthContext = false, ignoreFutureReference = true) {
    let result = {};
    const addPath = (path) => {
        const thisIndex = path.lastIndexOf('$this');
        if (thisIndex >= 0) {
            // drop everything before $this
            path = path.slice(thisIndex + 1);
        }
        let curr = result;
        path.forEach((seg, i) => {
            if (i === path.length - 1) {
                curr[seg] = true;
            }
            else {
                if (!curr[seg]) {
                    curr[seg] = { select: {} };
                }
                curr = curr[seg].select;
            }
        });
    };
    // visit a reference or member access expression to build a
    // selection path
    const visit = (node) => {
        if ((0, ast_1.isThisExpr)(node)) {
            return ['$this'];
        }
        if ((0, sdk_1.isFutureExpr)(node)) {
            return [];
        }
        if ((0, ast_1.isReferenceExpr)(node)) {
            const target = (0, sdk_1.resolved)(node.target);
            if ((0, ast_1.isDataModelField)(target)) {
                // a field selection, it's a terminal
                return [target.name];
            }
        }
        if ((0, ast_1.isMemberAccessExpr)(node)) {
            if (forAuthContext && (0, sdk_1.isAuthInvocation)(node.operand)) {
                return [node.member.$refText];
            }
            if ((0, sdk_1.isFutureExpr)(node.operand) && ignoreFutureReference) {
                // future().field is not subject to pre-update select
                return undefined;
            }
            // build a selection path inside-out for chained member access
            const inner = visit(node.operand);
            if (inner) {
                return [...inner, node.member.$refText];
            }
        }
        return undefined;
    };
    // collect selection paths from the given expression
    const collectReferencePaths = (expr) => {
        var _a, _b, _c;
        if ((0, ast_1.isThisExpr)(expr) && !(0, ast_1.isMemberAccessExpr)(expr.$container)) {
            // a standalone `this` expression, include all id fields
            const model = (_a = expr.$resolvedType) === null || _a === void 0 ? void 0 : _a.decl;
            const idFields = (0, sdk_1.getIdFields)(model);
            return idFields.map((field) => [field.name]);
        }
        if ((0, ast_1.isMemberAccessExpr)(expr) || (0, ast_1.isReferenceExpr)(expr)) {
            const path = visit(expr);
            if (path) {
                if ((0, ast_1.isDataModel)((_b = expr.$resolvedType) === null || _b === void 0 ? void 0 : _b.decl)) {
                    // member selection ended at a data model field, include its id fields
                    const idFields = (0, sdk_1.getIdFields)((_c = expr.$resolvedType) === null || _c === void 0 ? void 0 : _c.decl);
                    return idFields.map((field) => [...path, field.name]);
                }
                else {
                    return [path];
                }
            }
            else {
                return [];
            }
        }
        else if ((0, ast_utils_1.isCollectionPredicate)(expr)) {
            const path = visit(expr.left);
            // recurse into RHS
            const rhs = collectReferencePaths(expr.right);
            if (path) {
                // combine path of LHS and RHS
                return rhs.map((r) => [...path, ...r]);
            }
            else {
                // LHS is not rooted from the current model,
                // only keep RHS items that contains '$this'
                return rhs.filter((r) => r.includes('$this'));
            }
        }
        else if ((0, ast_1.isInvocationExpr)(expr)) {
            // recurse into function arguments
            return expr.args.flatMap((arg) => collectReferencePaths(arg.value));
        }
        else {
            // recurse
            const children = (0, langium_1.streamContents)(expr)
                .filter((child) => (0, ast_1.isExpression)(child))
                .toArray();
            return children.flatMap((child) => collectReferencePaths(child));
        }
    };
    for (const rule of rules) {
        const paths = collectReferencePaths(rule);
        paths.forEach((p) => addPath(p));
        // merge selectors from models referenced by `check()` calls
        (0, langium_1.streamAst)(rule).forEach((node) => {
            var _a, _b, _c;
            if ((0, ast_utils_1.isCheckInvocation)(node)) {
                const expr = node;
                const fieldRef = expr.args[0].value;
                const targetModel = (_a = fieldRef.$resolvedType) === null || _a === void 0 ? void 0 : _a.decl;
                const targetOperation = (_c = (0, sdk_1.getLiteral)((_b = expr.args[1]) === null || _b === void 0 ? void 0 : _b.value)) !== null && _c !== void 0 ? _c : forOperation;
                const targetSelector = generateSelectForRules([
                    ...getPolicyExpressions(targetModel, 'allow', targetOperation),
                    ...getPolicyExpressions(targetModel, 'deny', targetOperation),
                ], targetOperation, forAuthContext, ignoreFutureReference);
                if (targetSelector) {
                    result = (0, deepmerge_1.default)(result, { [fieldRef.target.$refText]: { select: targetSelector } });
                }
            }
        });
    }
    return Object.keys(result).length === 0 ? undefined : result;
}
/**
 * Generates a constant query guard function
 */
function generateConstantQueryGuardFunction(model, kind, value) {
    return {
        name: (0, sdk_1.getQueryGuardFunctionName)(model, undefined, false, kind),
        returnType: 'any',
        parameters: [
            {
                name: 'context',
                type: 'QueryContext',
            },
            {
                // for generating field references used by field comparison in the same model
                name: 'db',
                type: 'CrudContract',
            },
        ],
        statements: [`return ${value ? expression_writer_1.TRUE : expression_writer_1.FALSE};`],
    };
}
/**
 * Generates a query guard function that returns a partial Prisma query for the given model or field
 */
function generateQueryGuardFunction(model, kind, allows, denies, forField, fieldOverride = false) {
    const statements = [];
    const allowRules = allows.filter((rule) => !hasCrossModelComparison(rule));
    const denyRules = denies.filter((rule) => !hasCrossModelComparison(rule));
    generateNormalizedAuthRef(model, allowRules, denyRules, statements);
    const hasFieldAccess = [...denyRules, ...allowRules].some((rule) => (0, langium_1.streamAst)(rule).some((child) => 
    // this.???
    (0, ast_1.isThisExpr)(child) ||
        // future().???
        (0, sdk_1.isFutureExpr)(child) ||
        // field reference
        ((0, ast_1.isReferenceExpr)(child) && (0, ast_1.isDataModelField)(child.target.ref))));
    if (!hasFieldAccess) {
        // none of the rules reference model fields, we can compile down to a plain boolean
        // function in this case (so we can skip doing SQL queries when validating)
        const writer = new sdk_1.FastWriter();
        const transformer = new sdk_1.TypeScriptExpressionTransformer({
            context: sdk_1.ExpressionContext.AccessPolicy,
            isPostGuard: kind === 'postUpdate',
            operationContext: kind,
        });
        try {
            denyRules.forEach((rule) => {
                writer.write(`if (${transformer.transform(rule, false)}) { return ${expression_writer_1.FALSE}; }`);
            });
            allowRules.forEach((rule) => {
                writer.write(`if (${transformer.transform(rule, false)}) { return ${expression_writer_1.TRUE}; }`);
            });
        }
        catch (err) {
            if (err instanceof sdk_1.TypeScriptExpressionTransformerError) {
                throw new sdk_1.PluginError(__1.name, err.message);
            }
            else {
                throw err;
            }
        }
        if (forField) {
            if (allows.length === 0) {
                // if there's no allow rule, for field-level rules, by default we allow
                writer.write(`return ${expression_writer_1.TRUE};`);
            }
            else {
                if (allowRules.length < allows.length) {
                    writer.write(`return ${expression_writer_1.TRUE};`);
                }
                else {
                    // if there's any allow rule, we deny unless any allow rule evaluates to true
                    writer.write(`return ${expression_writer_1.FALSE};`);
                }
            }
        }
        else {
            if (allowRules.length < allows.length) {
                // some rules are filtered out here and will be generated as additional
                // checker functions, so we allow here to avoid a premature denial
                writer.write(`return ${expression_writer_1.TRUE};`);
            }
            else {
                // for model-level rules, the default is always deny unless for 'postUpdate'
                writer.write(`return ${kind === 'postUpdate' ? expression_writer_1.TRUE : expression_writer_1.FALSE};`);
            }
        }
        statements.push(writer.result);
    }
    else {
        const writer = new sdk_1.FastWriter();
        writer.write('return ');
        const exprWriter = new expression_writer_1.ExpressionWriter(writer, {
            isPostGuard: kind === 'postUpdate',
            operationContext: kind,
        });
        const writeDenies = () => {
            writer.conditionalWrite(denyRules.length > 1, '{ AND: [');
            denyRules.forEach((expr, i) => {
                writer.inlineBlock(() => {
                    writer.write('NOT: ');
                    exprWriter.write(expr);
                });
                writer.conditionalWrite(i !== denyRules.length - 1, ',');
            });
            writer.conditionalWrite(denyRules.length > 1, ']}');
        };
        const writeAllows = () => {
            writer.conditionalWrite(allowRules.length > 1, '{ OR: [');
            allowRules.forEach((expr, i) => {
                exprWriter.write(expr);
                writer.conditionalWrite(i !== allowRules.length - 1, ',');
            });
            writer.conditionalWrite(allowRules.length > 1, ']}');
        };
        if (allowRules.length > 0 && denyRules.length > 0) {
            // include both allow and deny rules
            writer.write('{ AND: [');
            writeDenies();
            writer.write(',');
            writeAllows();
            writer.write(']}');
        }
        else if (denyRules.length > 0) {
            // only deny rules
            writeDenies();
        }
        else if (allowRules.length > 0) {
            // only allow rules
            writeAllows();
        }
        else {
            // disallow any operation unless for 'postUpdate'
            writer.write(`return ${kind === 'postUpdate' ? expression_writer_1.TRUE : expression_writer_1.FALSE};`);
        }
        writer.write(';');
        statements.push(writer.result);
    }
    return {
        name: (0, sdk_1.getQueryGuardFunctionName)(model, forField, fieldOverride, kind),
        returnType: 'any',
        parameters: [
            {
                name: 'context',
                type: 'QueryContext',
            },
            {
                // for generating field references used by field comparison in the same model
                name: 'db',
                type: 'CrudContract',
            },
        ],
        statements,
    };
}
function generateEntityCheckerFunction(model, kind, allows, denies, forField, fieldOverride = false) {
    const statements = [];
    generateNormalizedAuthRef(model, allows, denies, statements);
    const transformer = new sdk_1.TypeScriptExpressionTransformer({
        context: sdk_1.ExpressionContext.AccessPolicy,
        thisExprContext: 'input',
        fieldReferenceContext: 'input',
        isPostGuard: kind === 'postUpdate',
        futureRefContext: 'input',
        operationContext: kind,
    });
    denies.forEach((rule) => {
        const compiled = transformer.transform(rule, false);
        statements.push(`if (${compiled}) { return false; }`);
    });
    allows.forEach((rule) => {
        const compiled = transformer.transform(rule, false);
        statements.push(`if (${compiled}) { return true; }`);
    });
    if (kind === 'postUpdate') {
        // 'postUpdate' rule defaults to allow
        statements.push('return true;');
    }
    else {
        if (forField) {
            // if there's no allow rule, for field-level rules, by default we allow
            if (allows.length === 0) {
                statements.push('return true;');
            }
            else {
                // if there's any allow rule, we deny unless any allow rule evaluates to true
                statements.push(`return false;`);
            }
        }
        else {
            // for other cases, defaults to deny
            statements.push(`return false;`);
        }
    }
    return {
        name: (0, sdk_1.getEntityCheckerFunctionName)(model, forField, fieldOverride, kind),
        returnType: 'any',
        parameters: [
            {
                name: 'input',
                type: 'any',
            },
            {
                name: 'context',
                type: 'QueryContext',
            },
        ],
        statements,
    };
}
/**
 * Generates a normalized auth reference for the given policy rules
 */
function generateNormalizedAuthRef(model, allows, denies, statements) {
    // check if any allow or deny rule contains 'auth()' invocation
    const hasAuthRef = [...allows, ...denies].some((rule) => (0, langium_1.streamAst)(rule).some((child) => (0, sdk_1.isAuthInvocation)(child)));
    if (hasAuthRef) {
        const authModel = (0, sdk_1.getAuthDecl)((0, sdk_1.getDataModelAndTypeDefs)(model.$container, true));
        if (!authModel) {
            throw new sdk_1.PluginError(__1.name, 'Auth model not found');
        }
        const userIdFields = (0, sdk_1.getIdFields)(authModel);
        if (!userIdFields || userIdFields.length === 0) {
            throw new sdk_1.PluginError(__1.name, 'User model does not have an id field');
        }
        // normalize user to null to avoid accidentally use undefined in filter
        statements.push(`const user: any = context.user ?? null;`);
    }
}
/**
 * Check if the given enum is referenced in the model
 */
function isEnumReferenced(model, decl) {
    const dataModels = (0, sdk_1.getDataModels)(model);
    return dataModels.some((dm) => {
        return (0, langium_1.streamAllContents)(dm).some((node) => {
            var _a, _b;
            if ((0, ast_1.isDataModelField)(node) && ((_a = node.type.reference) === null || _a === void 0 ? void 0 : _a.ref) === decl) {
                // referenced as field type
                return true;
            }
            if ((0, sdk_1.isEnumFieldReference)(node) && ((_b = node.target.ref) === null || _b === void 0 ? void 0 : _b.$container) === decl) {
                // enum field is referenced
                return true;
            }
            return false;
        });
    });
}
function hasCrossModelComparison(expr) {
    return (0, langium_1.streamAst)(expr).some((node) => {
        if ((0, ast_1.isBinaryExpr)(node) && ['==', '!=', '>', '<', '>=', '<=', 'in'].includes(node.operator)) {
            const leftRoot = getSourceModelOfFieldAccess(node.left);
            const rightRoot = getSourceModelOfFieldAccess(node.right);
            if (leftRoot && rightRoot && leftRoot !== rightRoot) {
                return true;
            }
        }
        return false;
    });
}
function getSourceModelOfFieldAccess(expr) {
    var _a, _b;
    // `auth()` access doesn't involve db field look up so doesn't count as cross-model comparison
    if ((0, sdk_1.isAuthInvocation)(expr)) {
        return undefined;
    }
    // an expression that resolves to a data model and is part of a member access, return the model
    // e.g.: profile.age => Profile
    if ((0, ast_1.isDataModel)((_a = expr.$resolvedType) === null || _a === void 0 ? void 0 : _a.decl) && (0, ast_1.isMemberAccessExpr)(expr.$container)) {
        return (_b = expr.$resolvedType) === null || _b === void 0 ? void 0 : _b.decl;
    }
    // `this` reference
    if ((0, ast_1.isThisExpr)(expr)) {
        return (0, langium_1.getContainerOfType)(expr, ast_1.isDataModel);
    }
    // `future()`
    if ((0, ast_utils_1.isFutureInvocation)(expr)) {
        return (0, langium_1.getContainerOfType)(expr, ast_1.isDataModel);
    }
    // direct field reference, return the model
    if ((0, sdk_1.isDataModelFieldReference)(expr)) {
        return expr.target.ref.$container;
    }
    // member access
    if ((0, ast_1.isMemberAccessExpr)(expr)) {
        return getSourceModelOfFieldAccess(expr.operand);
    }
    return undefined;
}
//# sourceMappingURL=utils.js.map