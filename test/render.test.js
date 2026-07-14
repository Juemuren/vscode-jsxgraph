const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const MarkdownIt = require("markdown-it");
const { activate, extendMarkdownIt } = require("../out/extension.js");

test("exposes the Markdown-It hook through the activation API", () => {
  assert.equal(activate().extendMarkdownIt, extendMarkdownIt);
});

test("renders jsxgraph fences as nonce-execution hosts", () => {
  const markdown = extendMarkdownIt(new MarkdownIt());
  const source = 'JXG.JSXGraph.initBoard(BOARDID, { title: "圆" });';
  const html = markdown.render(`\`\`\`jsxgraph\n${source}\n\`\`\`\n`);

  assert.match(html, /class="jsxgraph-preview"/);
  assert.match(html, /data-jsxgraph-board-id="jsxgraph-board-1"/);
  const encoded = html.match(/data-jsxgraph-source="([A-Za-z0-9+/=]+)"/)[1];
  assert.equal(Buffer.from(encoded, "base64").toString("utf8"), `${source}\n`);
  assert.doesNotMatch(html, /initBoard|BOARDID|圆/);
});

test("assigns a unique BOARDID host to each diagram", () => {
  const markdown = extendMarkdownIt(new MarkdownIt());
  const html = markdown.render("```jsxgraph\nfirst();\n```\n```jsxgraph\nsecond();\n```\n");

  assert.match(html, /data-jsxgraph-board-id="jsxgraph-board-1"/);
  assert.match(html, /data-jsxgraph-board-id="jsxgraph-board-2"/);
});

test("leaves other fenced languages unchanged", () => {
  const markdown = extendMarkdownIt(new MarkdownIt());
  const html = markdown.render("```js\nconsole.log('hello');\n```\n");

  assert.match(html, /language-js/);
  assert.match(html, /console\.log/);
  assert.doesNotMatch(html, /jsxgraph-preview/);
});

test("uses only its own CSP nonce without eval", () => {
  const previewScript = readFileSync(join(__dirname, "..", "media", "preview.js"), "utf8");

  assert.match(previewScript, /document\.currentScript && document\.currentScript\.nonce/);
  assert.match(previewScript, /script\.nonce = previewNonce/);
  assert.match(previewScript, /script\.textContent =/);
  assert.match(previewScript, /vscode\.markdown\.updateContent/);
  assert.match(previewScript, /JSXGraph\.freeBoard/);
  assert.doesNotMatch(previewScript, /\beval\s*\(|new Function|querySelectorAll\("script\[nonce\]"\)/);
});

test("uses VS Code theme colors as overridable JSXGraph defaults", () => {
  const previewScript = readFileSync(join(__dirname, "..", "media", "preview.js"), "utf8");

  assert.match(
    previewScript,
    /const foreground = "var\(--vscode-editor-foreground, #1f1f1f\)"/,
  );
  assert.match(
    previewScript,
    /const background = "var\(--vscode-editor-background, #ffffff\)"/,
  );
  assert.match(previewScript, /var\(--vscode-descriptionForeground,/);
  assert.match(previewScript, /Object\.assign\(options\.text,/);
  assert.match(previewScript, /Object\.assign\(options\.label,/);
  assert.match(previewScript, /Object\.assign\(options\.axis,/);
  assert.match(previewScript, /Object\.assign\(options\.axis\.ticks,/);
  assert.match(previewScript, /Object\.assign\(options\.ticks,/);
  assert.match(previewScript, /Object\.assign\(options\.slider,/);
  assert.match(previewScript, /Object\.assign\(options\.slider\.baseline,/);
  assert.match(previewScript, /Object\.assign\(options\.slider\.ticks,/);
  assert.match(previewScript, /Object\.assign\(options\.slider\.highline,/);
  assert.match(previewScript, /Object\.assign\(options\.slider\.label,/);
  assert.match(previewScript, /configureDefaults\(\);\s*hosts\.forEach\(executeDiagram\)/);
});
