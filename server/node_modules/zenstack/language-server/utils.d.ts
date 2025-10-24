import { TypeDef, type DataModel, type DataModelField } from '@zenstackhq/language/ast';
/**
 * Gets lists of unique fields declared at the data model level
 */
export declare function getUniqueFields(model: DataModel): DataModelField[][];
/**
 * Checks if the given node can contain resolvable members.
 */
export declare function isMemberContainer(node: unknown): node is DataModel | TypeDef;
