import { readFileSync } from "node:fs";
import * as vscode from "vscode";
import {
  containsOffset,
  createEmbeddedDocument,
  type EmbeddedDocument,
} from "./embedded";

const embeddedScheme = "jsxgraph-embedded";

class EmbeddedDocuments implements vscode.TextDocumentContentProvider, vscode.Disposable {
  private readonly contents = new Map<string, string>();
  private readonly changes = new vscode.EventEmitter<vscode.Uri>();

  readonly onDidChange = this.changes.event;

  constructor(private readonly declarations: string) {}

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.contents.get(uri.toString()) ?? "";
  }

  update(document: vscode.TextDocument): {
    readonly uri: vscode.Uri;
    readonly embedded: EmbeddedDocument;
  } {
    const uri = this.uriFor(document.uri);
    const embedded = createEmbeddedDocument(document.getText(), this.declarations);
    const key = uri.toString();
    if (this.contents.get(key) !== embedded.content) {
      this.contents.set(key, embedded.content);
      this.changes.fire(uri);
    }
    return { uri, embedded };
  }

  remove(document: vscode.TextDocument): void {
    this.contents.delete(this.uriFor(document.uri).toString());
  }

  dispose(): void {
    this.contents.clear();
    this.changes.dispose();
  }

  private uriFor(uri: vscode.Uri): vscode.Uri {
    return vscode.Uri.from({
      scheme: embeddedScheme,
      authority: "typescript",
      path: `/${encodeURIComponent(uri.toString(true))}.ts`,
    });
  }
}

export function registerLanguageFeatures(context: vscode.ExtensionContext): void {
  const declarationPath = context.asAbsolutePath(
    "node_modules/jsxgraph/src/index.d.ts",
  );
  const documents = new EmbeddedDocuments(readFileSync(declarationPath, "utf8"));
  const selector: vscode.DocumentSelector = [
    { language: "markdown", scheme: "file" },
    { language: "markdown", scheme: "untitled" },
  ];

  context.subscriptions.push(
    documents,
    vscode.workspace.registerTextDocumentContentProvider(embeddedScheme, documents),
    vscode.workspace.onDidCloseTextDocument((document) => {
      if (document.languageId === "markdown") {
        documents.remove(document);
      }
    }),
    vscode.languages.registerCompletionItemProvider(
      selector,
      {
        provideCompletionItems: async (document, position, _token, completionContext) => {
          const { uri, embedded } = documents.update(document);
          if (!containsOffset(embedded.ranges, document.offsetAt(position))) {
            return undefined;
          }
          return vscode.commands.executeCommand<vscode.CompletionList>(
            "vscode.executeCompletionItemProvider",
            uri,
            position,
            completionContext.triggerCharacter,
          );
        },
      },
      ".",
      '"',
      "'",
    ),
    vscode.languages.registerHoverProvider(selector, {
      provideHover: async (document, position) => {
        const { uri, embedded } = documents.update(document);
        if (!containsOffset(embedded.ranges, document.offsetAt(position))) {
          return undefined;
        }
        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
          "vscode.executeHoverProvider",
          uri,
          position,
        );
        return hovers?.[0];
      },
    }),
  );
}
