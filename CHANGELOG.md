# Changelog

## 0.0.1

- Initialize the TypeScript VS Code extension project.
- Render `jsxgraph` fenced code blocks in VS Code's built-in Markdown preview.
- Report diagram execution errors inline in the preview.
- Expose the generated board ID to diagram code as `BOARDID`.
- Execute each diagram with the nonce granted to the extension's own preview
  script, without `unsafe-eval` or Markdown preview security changes.
- Add JavaScript syntax highlighting inside `jsxgraph` fenced blocks.
- Add JSXGraph-aware completion and hover documentation for `JXG`, `BOARDID`,
  boards, elements, attributes, and other values inferred from diagram code.
