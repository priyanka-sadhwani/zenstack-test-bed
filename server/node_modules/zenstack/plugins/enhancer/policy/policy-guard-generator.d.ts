import { Model } from '@zenstackhq/language/ast';
import { PluginOptions } from '@zenstackhq/sdk';
import { Project } from 'ts-morph';
/**
 * Generates source file that contains Prisma query guard objects used for injecting database queries
 */
export declare class PolicyGenerator {
    private options;
    private extraFunctions;
    constructor(options: PluginOptions);
    generate(project: Project, model: Model, output: string): void;
    private writeImports;
    private writePolicy;
    private writeModelLevelDefs;
    private writeModelReadDef;
    private writeModelCreateDef;
    private writeCreateInputChecker;
    private canCheckCreateBasedOnInput;
    private generateCreateInputCheckerFunction;
    private writeModelUpdateDef;
    private writeModelPostUpdateDef;
    private writePostUpdatePreValueSelector;
    private writeModelDeleteDef;
    private writeCommonModelDef;
    private shouldUseEntityChecker;
    private writeEntityChecker;
    private writePolicyGuard;
    private writePermissionChecker;
    private generatePermissionCheckerFunction;
    private writeFieldLevelDefs;
    private writeFieldReadDef;
    private writeFieldUpdateDef;
    private writeAuthSelector;
    private generateAuthSelector;
    private writeValidationMeta;
    private hasTypeDefFields;
}
