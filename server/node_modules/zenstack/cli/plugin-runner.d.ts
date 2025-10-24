import { Model } from '@zenstackhq/language/ast';
export type PluginRunnerOptions = {
    schema: Model;
    schemaPath: string;
    output?: string;
    withPlugins?: string[];
    withoutPlugins?: string[];
    defaultPlugins: boolean;
    compile: boolean;
};
/**
 * ZenStack plugin runner
 */
export declare class PluginRunner {
    /**
     * Runs a series of nested generators
     */
    run(runnerOptions: PluginRunnerOptions): Promise<void>;
    private calculateAllPlugins;
    private makeCorePlugin;
    private hasValidation;
    private hasTypeDefFields;
    private getPluginName;
    private getPluginDescription;
    private getPluginDependencies;
    private getPluginProvider;
    private runPlugin;
    private isPluginEnabled;
    private getPluginModulePath;
    private loadPluginModule;
}
