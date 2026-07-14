# Changelog

## 0.1.0

- Adapt JSXGraph board backgrounds, text, labels, axes, ticks, and sliders to
  VS Code light and dark themes by default.
- Keep theme-aware JSXGraph defaults overridable through `JXG.Options`, board
  options, and per-element attributes.
- Update rendered theme colors automatically when the active VS Code theme
  changes.

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
