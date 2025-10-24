/**
 * CLI action for starting a REPL session
 */
export declare function repl(projectPath: string, options: {
    loadPath?: string;
    prismaClient?: string;
    debug?: boolean;
    table?: boolean;
}): Promise<void>;
