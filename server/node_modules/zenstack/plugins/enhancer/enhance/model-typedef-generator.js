"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTypeDefType = generateTypeDefType;
const sdk_1 = require("@zenstackhq/sdk");
const ast_1 = require("@zenstackhq/sdk/ast");
const ts_pattern_1 = require("ts-pattern");
const __1 = require("..");
function generateTypeDefType(sourceFile, decl) {
    sourceFile.addTypeAlias({
        name: decl.name,
        isExported: true,
        docs: decl.comments.map((c) => unwrapTripleSlashComment(c)),
        type: (writer) => {
            writer.block(() => {
                decl.fields.forEach((field) => {
                    if (field.comments.length > 0) {
                        writer.writeLine(`    /**`);
                        field.comments.forEach((c) => writer.writeLine(`     * ${unwrapTripleSlashComment(c)}`));
                        writer.writeLine(`     */`);
                    }
                    // optional fields are also nullable (to be consistent with Prisma)
                    writer.writeLine(`    ${field.name}${field.type.optional ? '?' : ''}: ${zmodelTypeToTsType(field.type)}${field.type.optional ? ' | null' : ''};`);
                });
            });
        },
    });
}
function unwrapTripleSlashComment(c) {
    return c.replace(/^[/]*\s*/, '');
}
function zmodelTypeToTsType(type) {
    var _a;
    let result;
    if (type.type) {
        result = builtinTypeToTsType(type.type);
    }
    else if ((_a = type.reference) === null || _a === void 0 ? void 0 : _a.ref) {
        if ((0, ast_1.isEnum)(type.reference.ref)) {
            result = makeEnumTypeReference(type.reference.ref);
        }
        else {
            result = type.reference.ref.name;
        }
    }
    else {
        throw new sdk_1.PluginError(__1.name, `Unsupported field type: ${type}`);
    }
    if (type.array) {
        result += '[]';
    }
    return result;
}
function builtinTypeToTsType(type) {
    return (0, ts_pattern_1.match)(type)
        .with('Boolean', () => 'boolean')
        .with('BigInt', () => 'bigint')
        .with('Int', () => 'number')
        .with('Float', () => 'number')
        .with('Decimal', () => 'Prisma.Decimal')
        .with('String', () => 'string')
        .with('Bytes', () => 'Uint8Array')
        .with('DateTime', () => 'Date')
        .with('Json', () => 'unknown')
        .exhaustive();
}
function makeEnumTypeReference(enumDecl) {
    const zmodel = enumDecl.$container;
    const models = (0, sdk_1.getDataModels)(zmodel);
    if (models.some((model) => model.fields.some((field) => { var _a; return ((_a = field.type.reference) === null || _a === void 0 ? void 0 : _a.ref) === enumDecl; }))) {
        // if the enum is referenced by any data model, Prisma already generates its type,
        // we just need to reference it
        return enumDecl.name;
    }
    else {
        // otherwise, we need to inline the enum
        return enumDecl.fields.map((field) => `'${field.name}'`).join(' | ');
    }
}
//# sourceMappingURL=model-typedef-generator.js.map