# JSXGraph preview example

## Ellipse

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

## Cycloid

```jsxgraph
// https://jsxgraph.org/share/example/cycloid
const board = JXG.JSXGraph.initBoard(BOARDID, {
    boundingbox: [-5, 5, 7, -5],
    axis: true,
    showCopyright: false,
});
 
var r = board.create('slider', [[0.5, 4], [3.5, 4], [0, 1, 2]], {name: 'r'});
var c = board.create('curve', [
    (t) => r.Value() * (t - Math.sin(t)),
    (t) => r.Value() * (1 - Math.cos(t)),
    -4 * Math.PI, 4* Math.PI
], {
    strokeWidth: 3
});
```
