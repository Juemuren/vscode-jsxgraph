import * as path from "node:path";
import * as ts from "typescript";
import * as vscode from "vscode";

interface EmbeddedDocument {
  content: string;
  ranges: readonly vscode.Range[];
}

const jsxGraphGlobals = [
  "",
  '// JSXGraph globals injected by the Markdown preview.',
  'const JXG = require("jsxgraph");',
  'const BOARDID = /** @type {string} */ ("");',
].join("\n");

/**
 * Make a JavaScript document whose offsets exactly match the Markdown source.
 * Text outside jsxgraph fences is replaced by spaces; declarations are added
 * only after the source so positions in the original document never shift.
 */
export function extractJsxGraph(document: vscode.TextDocument): EmbeddedDocument {
  const source = document.getText();
  const output = source.replace(/[^\r\n]/g, " ").split("");
  const ranges: vscode.Range[] = [];
  const lines = source.match(/.*(?:\r\n|\n|\r|$)/g) ?? [];
  let offset = 0;
  let fence: { marker: string; length: number; contentStart: number } | undefined;

  for (const lineWithEnding of lines) {
    if (!lineWithEnding) {
      continue;
    }
    const line = lineWithEnding.replace(/[\r\n]+$/, "");

    if (!fence) {
      const opening = line.match(/^( {0,3})(`{3,}|~{3,})\s*([^\s`~]+)?[^\r\n]*$/);
      if (opening && (opening[3] ?? "").toLowerCase() === "jsxgraph") {
        fence = {
          marker: opening[2][0],
          length: opening[2].length,
          contentStart: offset + lineWithEnding.length,
        };
      }
    } else {
      const closing = line.match(/^( {0,3})(`{3,}|~{3,})\s*$/);
      if (
        closing &&
        closing[2][0] === fence.marker &&
        closing[2].length >= fence.length
      ) {
        const contentEnd = offset;
        for (let index = fence.contentStart; index < contentEnd; index += 1) {
          output[index] = source[index];
        }
        ranges.push(
          new vscode.Range(
            document.positionAt(fence.contentStart),
            document.positionAt(contentEnd),
          ),
        );
        fence = undefined;
      }
    }

    offset += lineWithEnding.length;
  }

  // Markdown accepts an unterminated fence through the end of the document.
  if (fence) {
    for (let index = fence.contentStart; index < source.length; index += 1) {
      output[index] = source[index];
    }
    ranges.push(
      new vscode.Range(
        document.positionAt(fence.contentStart),
        document.positionAt(source.length),
      ),
    );
  }

  return { content: output.join("") + jsxGraphGlobals, ranges };
}

function contains(
  ranges: readonly vscode.Range[],
  position: vscode.Position,
): boolean {
  return ranges.some(
    (range) => range.contains(position) && !position.isEqual(range.end),
  );
}

function completionKind(kind: ts.ScriptElementKind): vscode.CompletionItemKind {
  switch (kind) {
    case ts.ScriptElementKind.memberFunctionElement:
    case ts.ScriptElementKind.functionElement:
      return vscode.CompletionItemKind.Function;
    case ts.ScriptElementKind.memberVariableElement:
    case ts.ScriptElementKind.constElement:
    case ts.ScriptElementKind.letElement:
    case ts.ScriptElementKind.variableElement:
      return vscode.CompletionItemKind.Variable;
    case ts.ScriptElementKind.classElement:
      return vscode.CompletionItemKind.Class;
    case ts.ScriptElementKind.interfaceElement:
      return vscode.CompletionItemKind.Interface;
    case ts.ScriptElementKind.moduleElement:
      return vscode.CompletionItemKind.Module;
    case ts.ScriptElementKind.keyword:
      return vscode.CompletionItemKind.Keyword;
    case ts.ScriptElementKind.enumElement:
      return vscode.CompletionItemKind.Enum;
    case ts.ScriptElementKind.memberGetAccessorElement:
    case ts.ScriptElementKind.memberSetAccessorElement:
    case ts.ScriptElementKind.memberAccessorVariableElement:
      return vscode.CompletionItemKind.Property;
    default:
      return vscode.CompletionItemKind.Text;
  }
}

function display(parts: readonly ts.SymbolDisplayPart[] | undefined): string {
  return parts?.map((part) => part.text).join("") ?? "";
}

function canonicalFileName(fileName: string): string {
  const normalized = path.normalize(fileName);
  return ts.sys.useCaseSensitiveFileNames ? normalized : normalized.toLowerCase();
}

class JsxGraphLanguageService {
  private readonly fileName: string;
  private readonly fileKey: string;
  private version = 0;
  private content = "";
  private readonly service: ts.LanguageService;
  private readonly completionData = new WeakMap<
    vscode.CompletionItem,
    { document: vscode.TextDocument; position: vscode.Position; entry: ts.CompletionEntry }
  >();

  constructor(extensionPath: string) {
    // Resolve `require("jsxgraph")` from the extension installation, so users
    // do not need to add JSXGraph or its declarations to every Markdown repo.
    this.fileName = path.join(extensionPath, "__jsxgraph_markdown__.js");
    this.fileKey = canonicalFileName(this.fileName);
    const options: ts.CompilerOptions = {
      allowJs: true,
      checkJs: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.Node16,
      moduleResolution: ts.ModuleResolutionKind.Node16,
      allowSyntheticDefaultImports: true,
    };
    const host: ts.LanguageServiceHost = {
      getCompilationSettings: () => options,
      getScriptFileNames: () => [this.fileName],
      getScriptVersion: (fileName) =>
        canonicalFileName(fileName) === this.fileKey ? String(this.version) : "0",
      getScriptSnapshot: (fileName) => {
        if (canonicalFileName(fileName) === this.fileKey) {
          return ts.ScriptSnapshot.fromString(this.content);
        }
        const text = ts.sys.readFile(fileName);
        return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
      },
      getCurrentDirectory: () => path.dirname(this.fileName),
      getDefaultLibFileName: (compilerOptions) =>
        ts.getDefaultLibFilePath(compilerOptions),
      fileExists: (fileName) =>
        canonicalFileName(fileName) === this.fileKey || ts.sys.fileExists(fileName),
      readFile: (fileName) =>
        canonicalFileName(fileName) === this.fileKey
          ? this.content
          : ts.sys.readFile(fileName),
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
      realpath: ts.sys.realpath,
    };
    this.service = ts.createLanguageService(host, ts.createDocumentRegistry());
  }

  prepare(document: vscode.TextDocument): EmbeddedDocument {
    const embedded = extractJsxGraph(document);
    this.content = embedded.content;
    this.version += 1;
    return embedded;
  }

  completions(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionList | undefined {
    const embedded = this.prepare(document);
    if (!contains(embedded.ranges, position)) {
      return undefined;
    }
    const offset = document.offsetAt(position);
    const result = this.service.getCompletionsAtPosition(this.fileName, offset, {
      includeCompletionsForModuleExports: true,
      includeCompletionsWithInsertText: true,
    });
    if (!result) {
      return undefined;
    }

    const items = result.entries.map((entry) => {
      const item = new vscode.CompletionItem(entry.name, completionKind(entry.kind));
      item.sortText = entry.sortText;
      item.filterText = entry.filterText;
      if (entry.insertText) {
        item.insertText = entry.isSnippet
          ? new vscode.SnippetString(entry.insertText)
          : entry.insertText;
      }
      this.completionData.set(item, { document, position, entry });
      return item;
    });
    return new vscode.CompletionList(items, result.isIncomplete);
  }

  resolveCompletion(item: vscode.CompletionItem): vscode.CompletionItem {
    const data = this.completionData.get(item);
    if (!data) {
      return item;
    }
    this.prepare(data.document);
    const details = this.service.getCompletionEntryDetails(
      this.fileName,
      data.document.offsetAt(data.position),
      data.entry.name,
      undefined,
      data.entry.source,
      undefined,
      data.entry.data,
    );
    if (details) {
      item.detail = display(details.displayParts);
      const documentation = display(details.documentation);
      if (documentation) {
        item.documentation = new vscode.MarkdownString(documentation);
      }
    }
    return item;
  }

  hover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.Hover | undefined {
    const embedded = this.prepare(document);
    if (!contains(embedded.ranges, position)) {
      return undefined;
    }
    const info = this.service.getQuickInfoAtPosition(this.fileName, document.offsetAt(position));
    if (!info) {
      return undefined;
    }
    const contents: vscode.MarkdownString[] = [];
    const signature = new vscode.MarkdownString();
    signature.appendCodeblock(display(info.displayParts), "typescript");
    contents.push(signature);
    const documentation = display(info.documentation);
    if (documentation) {
      contents.push(new vscode.MarkdownString(documentation));
    }
    return new vscode.Hover(
      contents,
      new vscode.Range(
        document.positionAt(info.textSpan.start),
        document.positionAt(info.textSpan.start + info.textSpan.length),
      ),
    );
  }

  dispose(): void {
    this.service.dispose();
  }
}

export function registerLanguageFeatures(context: vscode.ExtensionContext): void {
  const languageService = new JsxGraphLanguageService(context.extensionPath);
  const selector: vscode.DocumentSelector = [
    { language: "markdown", scheme: "file" },
    { language: "markdown", scheme: "untitled" },
  ];
  context.subscriptions.push(
    languageService,
    vscode.languages.registerCompletionItemProvider(
      selector,
      {
        provideCompletionItems: (document, position) =>
          languageService.completions(document, position),
        resolveCompletionItem: (item) => languageService.resolveCompletion(item),
      },
      ".",
      '"',
      "'",
    ),
    vscode.languages.registerHoverProvider(selector, {
      provideHover: (document, position) => languageService.hover(document, position),
    }),
  );
}
