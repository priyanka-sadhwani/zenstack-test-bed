import { Expression, InvocationExpr } from '@zenstackhq/language/ast';
import { ValidationAcceptor } from 'langium';
import { AstValidator } from '../types';
/**
 * InvocationExpr validation
 */
export default class FunctionInvocationValidator implements AstValidator<Expression> {
    validate(expr: InvocationExpr, accept: ValidationAcceptor): void;
    private getExpressionContext;
    private isStaticFunctionCall;
    private validateArgs;
    private validateInvocationArg;
    private _checkCheck;
}
