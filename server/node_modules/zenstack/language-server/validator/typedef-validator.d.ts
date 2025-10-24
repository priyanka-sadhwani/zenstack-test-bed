import { TypeDef } from '@zenstackhq/language/ast';
import { ValidationAcceptor } from 'langium';
import { AstValidator } from '../types';
/**
 * Validates type def declarations.
 */
export default class TypeDefValidator implements AstValidator<TypeDef> {
    validate(typeDef: TypeDef, accept: ValidationAcceptor): void;
    private validateAttributes;
    private validateFields;
    private validateField;
}
