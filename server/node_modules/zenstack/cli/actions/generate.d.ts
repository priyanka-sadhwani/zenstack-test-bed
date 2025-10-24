type Options = {
    schema?: string;
    output?: string;
    dependencyCheck: boolean;
    versionCheck: boolean;
    compile: boolean;
    withPlugins?: string[];
    withoutPlugins?: string[];
    defaultPlugins: boolean;
    offline?: boolean;
};
/**
 * CLI action for generating code from schema
 */
export declare function generate(projectPath: string, options: Options): Promise<void>;
export {};
