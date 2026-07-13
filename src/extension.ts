import type MarkdownIt from "markdown-it";
import type { ExtensionContext } from "vscode";

/**
 * Activates the extension host portion of JSXGraph Markdown.
 *
 * Rendering and embedded-language support will be registered here as they are
 * implemented. Keeping activation side-effect free gives the initial scaffold
 * a stable entry point that can already be launched in an Extension Host.
 */
export function activate(_context: ExtensionContext): void {}

export function deactivate(): void {}

/**
 * VS Code's built-in Markdown extension calls this hook when constructing its
 * preview parser. Future JSXGraph fence rendering will extend this instance.
 */
export function extendMarkdownIt(markdownIt: MarkdownIt): MarkdownIt {
  return markdownIt;
}

