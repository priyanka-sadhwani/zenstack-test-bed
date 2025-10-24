import { BuiltinType, Expression, ExpressionType } from '@zenstackhq/language/ast';
import { AstNode, ValidationAcceptor } from 'langium';
/**
 * Checks if the given declarations have duplicated names
 */
export declare function validateDuplicatedDeclarations(container: AstNode, decls: Array<AstNode & {
    name: string;
}>, accept: ValidationAcceptor): void;
/**
 * Try getting string value from a potential string literal expression
 */
export declare function getStringLiteral(node: AstNode | undefined): string | undefined;
/**
 * Determines if the given sourceType is assignable to a destination of destType
 */
export declare function typeAssignable(destType: ExpressionType, sourceType: ExpressionType, sourceExpr?: Expression): boolean;
/**
 * Maps a ZModel builtin type to expression type
 */
export declare function mapBuiltinTypeToExpressionType(type: BuiltinType | 'Any' | 'Object' | 'Null' | 'Unsupported'): ExpressionType | 'Any';
export declare function isAuthOrAuthMemberAccess(expr: Expression): boolean;
