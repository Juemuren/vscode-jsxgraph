import { Buffer } from "node:buffer";
import type MarkdownIt from "markdown-it";
import type { Renderer, Token } from "markdown-it";
import type { ExtensionContext } from "vscode";

export interface MarkdownItExtensionApi {
  extendMarkdownIt: typeof extendMarkdownIt;
}

export function activate(_context?: ExtensionContext): MarkdownItExtensionApi {
  return { extendMarkdownIt };
}

export function deactivate(): void {}

export function extendMarkdownIt(markdownIt: MarkdownIt): MarkdownIt {
  const defaultFence = markdownIt.renderer.rules.fence;
  let diagramId = 0;

  markdownIt.renderer.rules.fence = (
    tokens: Token[],
    index: number,
    options: MarkdownIt.Options,
    env: unknown,
    self: Renderer,
  ): string => {
    const token = tokens[index];
    const language = token.info.trim().split(/\s+/, 1)[0].toLowerCase();

    if (language !== "jsxgraph") {
      return defaultFence
        ? defaultFence(tokens, index, options, env, self)
        : self.renderToken(tokens, index, options);
    }

    const boardId = `jsxgraph-board-${++diagramId}`;
    const source = Buffer.from(token.content, "utf8").toString("base64");

    return [
      `<div class="jsxgraph-preview" data-jsxgraph-source="${source}" data-jsxgraph-board-id="${boardId}">`,
      `<div id="${boardId}" class="jxgbox jsxgraph-board" role="img" aria-label="JSXGraph diagram"></div>`,
      '<pre class="jsxgraph-error" role="alert" hidden></pre>',
      "</div>",
    ].join("");
  };

  return markdownIt;
}
