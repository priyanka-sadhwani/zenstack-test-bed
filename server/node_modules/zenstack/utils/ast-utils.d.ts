import { BinaryExpr, DataModel, DataModelField, Expression, Model, ModelImport, TypeDef } from '@zenstackhq/language/ast';
import { AstNode, LangiumDocuments, Linker } from 'langium';
import { URI } from 'vscode-uri';
export declare function extractDataModelsWithAllowRules(model: Model): DataModel[];
export declare function mergeBaseModels(model: Model, linker: Linker): void;
export declare function isAuthInvocation(node: AstNode): boolean;
export declare function isFutureInvocation(node: AstNode): boolean;
export declare function isCheckInvocation(node: AstNode): boolean;
export declare function resolveImportUri(imp: ModelImport): URI | undefined;
export declare function resolveTransitiveImports(documents: LangiumDocuments, model: Model): Model[];
export declare function resolveImport(documents: LangiumDocuments, imp: ModelImport): Model | undefined;
export declare function getAllDeclarationsIncludingImports(documents: LangiumDocuments, model: Model): import("@zenstackhq/language/ast").AbstractDeclaration[];
export declare function getAllDataModelsIncludingImports(documents: LangiumDocuments, model: Model): DataModel[];
export declare function isCollectionPredicate(node: AstNode): node is BinaryExpr;
export declare function getContainingDataModel(node: Expression): DataModel | undefined;
/**
 * Walk upward from the current AST node to find the first node that satisfies the predicate.
 */
export declare function findUpAst(node: AstNode, predicate: (node: AstNode) => boolean): AstNode | undefined;
/**
 * Gets all data models and type defs from all loaded documents
 */
export declare function getAllLoadedDataModelsAndTypeDefs(langiumDocuments: LangiumDocuments): (DataModel | TypeDef)[];
/**
 * Gets all data models and type defs from loaded and reachable documents
 */
export declare function getAllLoadedAndReachableDataModelsAndTypeDefs(langiumDocuments: LangiumDocuments, fromModel?: DataModel): (DataModel | TypeDef)[];
/**
 * Walk up the inheritance chain to find the path from the start model to the target model
 */
export declare function findUpInheritance(start: DataModel, target: DataModel): DataModel[] | undefined;
/**
 * Gets all concrete models that inherit from the given delegate model
 */
export declare function getConcreteModels(dataModel: DataModel): DataModel[];
/**
 * Gets the discriminator field for the given delegate model
 */
export declare function getDiscriminatorField(dataModel: DataModel): DataModelField | undefined;
