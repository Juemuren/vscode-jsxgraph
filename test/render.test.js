const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const MarkdownIt = require("markdown-it");
const { activate, extendMarkdownIt } = require("../out/extension.js");

test("exposes the Markdown-It hook through the activation API", () => {
  assert.equal(activate().extendMarkdownIt, extendMarkdownIt);
});

test("exposes JXG and BOARDID to diagram code", () => {
  const previewScript = readFileSync(join(__dirname, "..", "media", "preview.js"), "utf8");

  assert.match(previewScript, /new Function\(\s*"JXG",\s*"BOARDID",/);
  assert.doesNotMatch(previewScript, /new Function\(\s*"JXG",\s*"container"/);
});

test("renders jsxgraph fences as diagram hosts", () => {
  const markdown = extendMarkdownIt(new MarkdownIt());
  const html = markdown.render(
    "```jsxgraph\nJXG.JSXGraph.initBoard(BOARDID, { axis: true });\n```\n",
  );

  assert.match(html, /class="jsxgraph-preview"/);
  assert.match(html, /id="jsxgraph-board-1"/);
  assert.match(html, /data-jsxgraph-source="[A-Za-z0-9+/=]+"/);
  assert.doesNotMatch(html, /initBoard|BOARDID/);
});

test("leaves other fenced languages unchanged", () => {
  const markdown = extendMarkdownIt(new MarkdownIt());
  const html = markdown.render("```js\nconsole.log('hello');\n```\n");

  assert.match(html, /language-js/);
  assert.match(html, /console\.log/);
  assert.doesNotMatch(html, /jsxgraph-preview/);
});
