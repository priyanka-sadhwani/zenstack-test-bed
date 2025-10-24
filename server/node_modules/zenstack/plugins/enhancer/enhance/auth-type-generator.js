"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAuthType = generateAuthType;
const sdk_1 = require("@zenstackhq/sdk");
const ast_1 = require("@zenstackhq/sdk/ast");
const langium_1 = require("langium");
const ast_utils_1 = require("../../../utils/ast-utils");
/**
 * Generate types for typing the `user` context object passed to the `enhance` call, based
 * on the fields (potentially deeply) access through `auth()`.
 */
function generateAuthType(model, authDecl) {
    const types = new Map();
    types.set(authDecl.name, { requiredRelations: [] });
    const ensureType = (model) => {
        if (!types.has(model)) {
            types.set(model, { requiredRelations: [] });
        }
    };
    const addAddField = (model, name, type, array) => {
        let fields = types.get(model);
        if (!fields) {
            fields = { requiredRelations: [] };
            types.set(model, fields);
        }
        if (!fields.requiredRelations.find((f) => f.name === name)) {
            fields.requiredRelations.push({ name, type: array ? `${type}[]` : type });
        }
    };
    // get all policy expressions involving `auth()`
    const authInvolvedExprs = (0, langium_1.streamAst)(model).filter(isAuthAccess);
    // traverse the expressions and collect types and fields involved
    authInvolvedExprs.forEach((expr) => {
        (0, langium_1.streamAst)(expr).forEach((node) => {
            var _a, _b, _c;
            if ((0, ast_1.isMemberAccessExpr)(node)) {
                const exprType = (_a = node.operand.$resolvedType) === null || _a === void 0 ? void 0 : _a.decl;
                if ((0, ast_1.isDataModel)(exprType)) {
                    const memberDecl = node.member.ref;
                    if ((0, ast_1.isDataModel)((_b = memberDecl === null || memberDecl === void 0 ? void 0 : memberDecl.type.reference) === null || _b === void 0 ? void 0 : _b.ref)) {
                        // member is a relation
                        const fieldType = memberDecl.type.reference.ref.name;
                        ensureType(fieldType);
                        addAddField(exprType.name, memberDecl.name, fieldType, memberDecl.type.array);
                    }
                }
            }
            if ((0, sdk_1.isDataModelFieldReference)(node)) {
                // this can happen inside collection predicates
                const fieldDecl = node.target.ref;
                const fieldType = (_c = fieldDecl.type.reference) === null || _c === void 0 ? void 0 : _c.ref;
                if ((0, ast_1.isDataModel)(fieldType)) {
                    // field is a relation
                    ensureType(fieldType.name);
                    addAddField(fieldDecl.$container.name, node.target.$refText, fieldType.name, fieldDecl.type.array);
                }
            }
        });
    });
    // generate:
    // `
    // namespace auth {
    //   export type User = WithRequired<Partial<_P.User>, 'id'> & { profile: Profile; } & Record<string, unknown>;
    //   export type Profile = WithRequired<Partial<_P.Profile>, 'age'> & Record<string, unknown>;
    // }
    // `
    return `export namespace auth {
    type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
${Array.from(types.entries())
        .map(([model, fields]) => {
        let result = `Partial<_P.${model}>`;
        if (model === authDecl.name) {
            // auth model's id fields are always required
            const idFields = (0, sdk_1.getIdFields)(authDecl).map((f) => f.name);
            if (idFields.length > 0) {
                result = `WithRequired<${result}, ${idFields.map((f) => `'${f}'`).join('|')}>`;
            }
        }
        if (fields.requiredRelations.length > 0) {
            // merge required relation fields
            result = `${result} & { ${fields.requiredRelations.map((f) => `${f.name}: ${f.type}`).join('; ')} }`;
        }
        result = `${result} & Record<string, unknown>`;
        return `    export type ${model} = ${result};`;
    })
        .join('\n')}
}`;
}
function isAuthAccess(node) {
    if ((0, sdk_1.isAuthInvocation)(node)) {
        return true;
    }
    if ((0, ast_1.isMemberAccessExpr)(node) && isAuthAccess(node.operand)) {
        return true;
    }
    if ((0, ast_utils_1.isCollectionPredicate)(node)) {
        if (isAuthAccess(node.left)) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=auth-type-generator.js.map