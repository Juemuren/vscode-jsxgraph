# JSXGraph for VSCode

A VS Code extension for rendering `jsxgraph` fenced code blocks in Markdown and providing JavaScript language features inside those blocks.

## Features

- Render JSXGraph diagrams in VS Code's built-in Markdown preview.
- Refresh diagrams automatically when the Markdown document changes.
- Execute diagram code under VS Code's existing CSP without disabling Markdown preview security.
- JavaScript syntax highlighting, completion, and hover documentation inside `jsxgraph` fences, including typed `JXG` and `BOARDID` globals.

## Install

### From extension marketplace

Not yet

### From source code

```sh
# Clone the repository
git clone https://github.com/juemuren/vscode-jsxgraph.git
cd vscode-jsxgraph
# Package
npx @vscode/vsce package
# Install
code --install-extension vscode-jsxgraph-*.vsix
```

## Usage

Open VS Code's normal Markdown preview and initialize a board with the injected `BOARDID`:

````markdown
```jsxgraph
const board = JXG.JSXGraph.initBoard(BOARDID, {
  boundingbox: [-5, 5, 5, -5],
  axis: true,
  showCopyright: false,
});

const center = board.create("point", [0, 0], { name: "O" });
const point = board.create("point", [2, 1], { name: "A" });
board.create("circle", [center, point]);
```
````

Each block receives these internal variables:

- `JXG`: the JSXGraph namespace.
- `BOARDID`: the unique ID of the generated board element. Pass it as the first argument to `JXG.JSXGraph.initBoard`.

## Development

```sh
npm install
npm run compile
```

Press `F5` in VS Code to compile the project and launch an Extension Development Host.
