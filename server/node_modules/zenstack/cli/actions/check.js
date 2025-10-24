"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.check = check;
const cli_util_1 = require("../cli-util");
/**
 * CLI action for checking schema
 */
function check(_projectPath, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const schema = (_a = options.schema) !== null && _a !== void 0 ? _a : (0, cli_util_1.getDefaultSchemaLocation)();
        yield (0, cli_util_1.loadDocument)(schema);
        console.log('The schema is valid.');
    });
}
//# sourceMappingURL=check.js.map