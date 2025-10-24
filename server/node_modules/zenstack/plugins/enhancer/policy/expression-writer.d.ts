import { Expression } from '@zenstackhq/language/ast';
import { PolicyOperationKind } from '@zenstackhq/runtime';
import { CodeWriter } from '@zenstackhq/sdk';
export declare const TRUE = "{ AND: [] }";
export declare const FALSE = "{ OR: [] }";
export type ExpressionWriterOptions = {
    isPostGuard?: boolean;
    operationContext: PolicyOperationKind;
};
/**
 * Utility for writing ZModel expression as Prisma query argument objects into a ts-morph writer
 */
export declare class ExpressionWriter {
    private readonly writer;
    private readonly options;
    private readonly plainExprBuilder;
    /**
     * Constructs a new ExpressionWriter
     */
    constructor(writer: CodeWriter, options: ExpressionWriterOptions);
    /**
     * Writes the given ZModel expression.
     */
    write(expr: Expression): void;
    private writeReference;
    private writeBaseHierarchy;
    private getDelegateBase;
    private isFieldReferenceToDelegateModel;
    private writeMemberAccess;
    private writeExprList;
    private writeBinary;
    private writeIn;
    private writeCollectionPredicate;
    private isFieldAccess;
    private guard;
    private plain;
    private writeIdFieldsCheck;
    private writeComparison;
    private stripFutureCall;
    private isFutureMemberAccess;
    private requireIdFields;
    private equivalentRefs;
    private writeFieldReference;
    private isAuthOrAuthMemberAccess;
    private writeOperator;
    private writeFieldCondition;
    private block;
    private isModelTyped;
    private mapOperator;
    private negateOperator;
    private writeLogical;
    private writeUnary;
    private writeLiteral;
    private writeInvocation;
    private writeRelationCheck;
}
