import { DataModel, TypeDef, type Model } from '@zenstackhq/sdk/ast';
/**
 * Generate types for typing the `user` context object passed to the `enhance` call, based
 * on the fields (potentially deeply) access through `auth()`.
 */
export declare function generateAuthType(model: Model, authDecl: DataModel | TypeDef): string;
