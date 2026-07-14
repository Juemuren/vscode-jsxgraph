# JSXGraph preview example

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
