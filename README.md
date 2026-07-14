# JSXGraph Markdown

A VS Code extension for rendering `jsxgraph` fenced code blocks in Markdown and
providing JavaScript language features inside those blocks.

## Features

- Render JSXGraph diagrams in VS Code's built-in Markdown preview.
- Refresh diagrams automatically when the Markdown document changes.
- Execute diagram code under VS Code's existing CSP without `eval`,
  `new Function`, or disabling Markdown preview security.

## Usage

Open VS Code's normal Markdown preview and initialize a board with the injected
`BOARDID`:

````markdown
```jsxgraph
const board = JXG.JSXGraph.initBoard(BOARDID, {
  boundingbox: [-5, 5, 5, -5],
  axis: true,
});

board.create("point", [1, 2], { name: "A" });
board.create("circle", [[0, 0], 3]);
```
````

Each block receives these internal variables:

- `JXG`: the JSXGraph namespace.
- `BOARDID`: the unique ID of the generated board element. Pass it as the first
  argument to `JXG.JSXGraph.initBoard`.

The extension reuses the CSP nonce granted to its own contributed preview script
to execute each `jsxgraph` block as an authorized inline script. It never enables
`unsafe-eval` and never scans unrelated scripts for a nonce. The extension is
disabled in untrusted workspaces because diagram code runs inside the Markdown
preview page. Rendering errors are shown in place of the corresponding diagram.

For a ready-to-run document, open [examples/basic.md](examples/basic.md) in the
Extension Development Host and open the built-in Markdown preview.

## Planned features

- Syntax highlighting for `jsxgraph` fenced code blocks.
- JavaScript completion and hover information with JSXGraph APIs in scope.

See [TODO.md](TODO.md) for the initial requirements.

## Development

```powershell
npm install
npm run compile
```

Press `F5` in VS Code to compile the project and launch an Extension Development
Host.
