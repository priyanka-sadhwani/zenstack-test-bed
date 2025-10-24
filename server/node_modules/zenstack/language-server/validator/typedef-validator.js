"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const attribute_application_validator_1 = require("./attribute-application-validator");
const utils_1 = require("./utils");
/**
 * Validates type def declarations.
 */
class TypeDefValidator {
    validate(typeDef, accept) {
        (0, utils_1.validateDuplicatedDeclarations)(typeDef, typeDef.fields, accept);
        this.validateAttributes(typeDef, accept);
        this.validateFields(typeDef, accept);
    }
    validateAttributes(typeDef, accept) {
        typeDef.attributes.forEach((attr) => (0, attribute_application_validator_1.validateAttributeApplication)(attr, accept));
    }
    validateFields(typeDef, accept) {
        typeDef.fields.forEach((field) => this.validateField(field, accept));
    }
    validateField(field, accept) {
        field.attributes.forEach((attr) => (0, attribute_application_validator_1.validateAttributeApplication)(attr, accept));
    }
}
exports.default = TypeDefValidator;
//# sourceMappingURL=typedef-validator.js.map