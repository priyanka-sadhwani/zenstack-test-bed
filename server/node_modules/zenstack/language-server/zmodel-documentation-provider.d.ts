import { AstNode, JSDocDocumentationProvider } from 'langium';
/**
 * Documentation provider that first tries to use triple-slash comments and falls back to JSDoc comments.
 */
export declare class ZModelDocumentationProvider extends JSDocDocumentationProvider {
    getDocumentation(node: AstNode): string | undefined;
}
