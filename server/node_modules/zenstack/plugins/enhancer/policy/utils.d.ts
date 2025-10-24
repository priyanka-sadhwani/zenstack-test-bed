import type { PolicyKind, PolicyOperationKind } from '@zenstackhq/runtime';
import { Enum, Model, type DataModel, type DataModelField, type Expression } from '@zenstackhq/sdk/ast';
import { FunctionDeclarationStructure, OptionalKind } from 'ts-morph';
/**
 * Get policy expressions for the given model or field and operation kind
 */
export declare function getPolicyExpressions(target: DataModel | DataModelField, kind: PolicyKind, operation: PolicyOperationKind, forOverride?: boolean, filter?: 'all' | 'withoutCrossModelComparison' | 'onlyCrossModelComparison'): Expression[];
/**
 * Generates a "select" object that contains (recursively) fields referenced by the
 * given policy rules
 */
export declare function generateSelectForRules(rules: Expression[], forOperation: PolicyOperationKind | undefined, forAuthContext?: boolean, ignoreFutureReference?: boolean): any;
/**
 * Generates a constant query guard function
 */
export declare function generateConstantQueryGuardFunction(model: DataModel, kind: PolicyOperationKind, value: boolean): OptionalKind<FunctionDeclarationStructure>;
/**
 * Generates a query guard function that returns a partial Prisma query for the given model or field
 */
export declare function generateQueryGuardFunction(model: DataModel, kind: PolicyOperationKind, allows: Expression[], denies: Expression[], forField?: DataModelField, fieldOverride?: boolean): OptionalKind<FunctionDeclarationStructure>;
export declare function generateEntityCheckerFunction(model: DataModel, kind: PolicyOperationKind, allows: Expression[], denies: Expression[], forField?: DataModelField, fieldOverride?: boolean): OptionalKind<FunctionDeclarationStructure>;
/**
 * Generates a normalized auth reference for the given policy rules
 */
export declare function generateNormalizedAuthRef(model: DataModel, allows: Expression[], denies: Expression[], statements: string[]): void;
/**
 * Check if the given enum is referenced in the model
 */
export declare function isEnumReferenced(model: Model, decl: Enum): unknown;
