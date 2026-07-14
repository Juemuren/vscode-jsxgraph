const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const {
  containsOffset,
  createEmbeddedDocument,
} = require("../out/embedded.js");

test("creates offset-preserving virtual TypeScript content", () => {
  const source = [
    "# Example",
    "",
    "```jsxgraph",
    "const board = JXG.JSXGraph.initBoard(BOARDID, {});",
    "```",
    "",
  ].join("\n");
  const declarations = "declare namespace JXG { const version: string; }";
  const embedded = createEmbeddedDocument(source, declarations);
  const codeStart = source.indexOf("const board");

  assert.equal(embedded.content.length > source.length, true);
  assert.equal(embedded.content.slice(codeStart, codeStart + 11), "const board");
  assert.equal(embedded.content.indexOf("# Example"), -1);
  assert.equal(embedded.content.slice(0, "# Example".length), " ".repeat("# Example".length));
  assert.match(embedded.content.slice(source.length), /declare namespace JXG/);
  assert.match(embedded.content.slice(source.length), /declare const BOARDID: string/);
  assert.equal(containsOffset(embedded.ranges, codeStart), true);
  assert.equal(containsOffset(embedded.ranges, source.indexOf("# Example")), false);
});

test("supports tilde and unterminated JSXGraph fences", () => {
  const source = "before\n~~~JSXGRAPH\nJXG.Options;";
  const embedded = createEmbeddedDocument(source, "");
  const codeStart = source.indexOf("JXG.Options");

  assert.equal(embedded.content.slice(codeStart, source.length), "JXG.Options;");
  assert.equal(containsOffset(embedded.ranges, source.length - 1), true);
});

test("ignores non-JSXGraph fences", () => {
  const source = "```js\nJXG.Options;\n```\n";
  const embedded = createEmbeddedDocument(source, "");

  assert.equal(embedded.ranges.length, 0);
  assert.equal(embedded.content.slice(0, source.length).trim(), "");
});

test("exposes JSXGraph declarations to a TypeScript language service", () => {
  const source = "```jsxgraph\nJXG.JSXGraph.\n```\n";
  const declarations = readFileSync(
    join(__dirname, "..", "node_modules", "jsxgraph", "src", "index.d.ts"),
    "utf8",
  );
  const content = createEmbeddedDocument(source, declarations).content;
  const fileName = join(__dirname, "virtual.ts");
  const canonicalFileName = fileName.replaceAll("\\", "/").toLowerCase();
  const host = {
    getCompilationSettings: () => ({
      target: ts.ScriptTarget.ES2022,
      skipLibCheck: true,
    }),
    getScriptFileNames: () => [fileName],
    getScriptVersion: () => "1",
    getScriptSnapshot: (requestedFile) => {
      if (requestedFile.replaceAll("\\", "/").toLowerCase() === canonicalFileName) {
        return ts.ScriptSnapshot.fromString(content);
      }
      const text = ts.sys.readFile(requestedFile);
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => __dirname,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
  };
  const service = ts.createLanguageService(host);
  const position = source.indexOf("JXG.JSXGraph.") + "JXG.JSXGraph.".length;
  const completions = service.getCompletionsAtPosition(fileName, position, {});

  assert.ok(completions?.entries.some((entry) => entry.name === "initBoard"));
  service.dispose();
});
