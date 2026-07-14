# JSXGraph preview example

## Ellipse

<https://jsxgraph.org/share/example/conic-section-ellipse>

```jsxgraph
(function() {
    const board = JXG.JSXGraph.initBoard(BOARDID, {
        boundingbox: [-3, 3, 3, -3],
        showCopyright: false,
        keepAspectRatio: true
    });

    var A = board.create('point', [-1, 1]);
    var B = board.create('point', [1, 0]);
    var C = board.create('point', [0, -1]);
    var ell = board.create('ellipse', [A, B, C]);
})();
```

## Cycloid

<https://jsxgraph.org/share/example/cycloid>

```jsxgraph
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

## Apollonian Circle Packing

<https://jsxgraph.org/share/example/apollonian-circle-packing>

```jsxgraph
var board = JXG.JSXGraph.initBoard(BOARDID, {
        boundingbox: [-2.5, 2.5, 2.5, -2.5],
        showNavigation: false,
        showCopyright: false,
        keepAspectRatio: true,
        pan: { enabled: false },
        zoom: { enabled: false }
    }),
    solveQ2 = function(x1, x2, x3, off) {
        var a, b, c, d;
        a = 0.5;
        b = -(x1 + x2 + x3);
        c = x1 * x1 + x2 * x2 + x3 * x3 - 0.5 * (x1 + x2 + x3) * (x1 + x2 + x3) - off;
        d = b * b - 4 * a * c;
        if (Math.abs(d) < JXG.Math.eps) {
            d = 0.0;
        }
        return [(-b + Math.sqrt(d)) / (2.0 * a), (-b - Math.sqrt(d)) / (2.0 * a)];
    };

var a = board.create('line', [[0, 0], [2, 0]], { straightFirst: false, straightLast: false, visible: false }),
    p0 = board.create('point', [0, 0], { name: '', visible: false }),
    p1 = board.create('glider', [1.3, 0, a], { name: 'drag me', showInfobox: false, label: { offset: [-20, 15] } }),

    b0 = -0.5,
    r1 = 2 - p1.X(),
    b1 = 1.0 / r1,
    r2 = (2.0 - r1),
    b2 = 1.0 / r2,

    p2 = board.create('point', [function() { return p1.X() - 2; }, 0], { name: '', visible: false }),

    c0 = board.create('circle', [p0, Math.abs(1.0 / b0)], { strokeWidth: 1, withLabel: false }),
    c1 = board.create('circle', [p1, function() { return 2 - p1.X(); }], { strokeWidth: 1, withLabel: false }),
    c2 = board.create('circle', [p2, function() { return p1.X(); }], { strokeWidth: 1, withLabel: false });

c0.curvature = function() { return b0; }; // constant
c1.curvature = function() { return 1 / (2 - p1.X()); };
c2.curvature = function() { return 1 / (p1.X()); };

var thirdCircleX = function() {
        var b0, b1, b2, x0, x1, x2, b3, bx3;
        b0 = c0.curvature();
        b1 = c1.curvature();
        b2 = c2.curvature();
        x0 = c0.midpoint.X();
        x1 = c1.midpoint.X();
        x2 = c2.midpoint.X();

        b3 = solveQ2(b0, b1, b2, 0);
        bx3 = solveQ2(b0 * x0, b1 * x1, b2 * x2, 2);
        return bx3[0] / b3[0];
    },
    thirdCircleY = function() {
        var b0, b1, b2, y0, y1, y2, b3, by3;
        b0 = c0.curvature();
        b1 = c1.curvature();
        b2 = c2.curvature();
        y0 = c0.midpoint.Y();
        y1 = c1.midpoint.Y();
        y2 = c2.midpoint.Y();

        b3 = solveQ2(b0, b1, b2, 0);
        by3 = solveQ2(b0 * y0, b1 * y1, b2 * y2, 2);
        return by3[0] / b3[0];
    },
    thirdCircleRadius = function() {
        var b0, b1, b2, b3, bx3, by3;
        b0 = c0.curvature();
        b1 = c1.curvature();
        b2 = c2.curvature();
        b3 = solveQ2(b0, b1, b2, 0);
        return 1.0 / b3[0];
    };

var p3 = board.create('point', [thirdCircleX, thirdCircleY], { name: '', visible: false }),
    c3 = board.create('circle', [p3, thirdCircleRadius], { strokeWidth: 1, withLabel: false });

c3.curvature = function() { return 1.0 / this.radius; };

var otherCirc = function(circs, level) {
    var p, c, fx, fy, fr;

    if (level <= 0) {
        return;
    }
    fx = function() {
        var b = [],
            x = [],
            i;
        for (i = 0; i < 4; i++) {
            b[i] = circs[i].curvature();
            x[i] = circs[i].midpoint.X();
        }

        b[4] = 2 * (b[0] + b[1] + b[2]) - b[3];
        x[4] = (2 * (b[0] * x[0] + b[1] * x[1] + b[2] * x[2]) - b[3] * x[3]) / b[4];
        return x[4];
    };
    fy = function() {
        var b = [],
            y = [],
            i;
        for (i = 0; i < 4; i++) {
            b[i] = circs[i].curvature();
            y[i] = circs[i].midpoint.Y();
        }

        b[4] = 2 * (b[0] + b[1] + b[2]) - b[3];
        y[4] = (2 * (b[0] * y[0] + b[1] * y[1] + b[2] * y[2]) - b[3] * y[3]) / b[4];
        return y[4];
    };
    fr = function() {
        var b = [],
            i;
        for (i = 0; i < 4; i++) {
            b[i] = circs[i].curvature();
        }
        b[4] = 2 * (b[0] + b[1] + b[2]) - b[3];
        if (isNaN(b[4])) {
            return 1000.0;
        } else {
            return 1 / b[4];
        }
    };
    p = board.create('point', [fx, fy], { name: '', visible: false });
    c = board.create('circle', [p, fr], {
        strokeWidth: 1,
        fillColor: JXG.hsv2rgb((70 * level) % 360, 0.9, 1),
        highlightFillColor: JXG.hsv2rgb((70 * level) % 360, 0.9, 0.6),
        fillOpacity: 0.7,
        withLabel: false,
    });
    c.curvature = function() { return 1 / this.radius; };

    // Recursion
    otherCirc([circs[0], circs[1], c, circs[2]], level - 1);
    otherCirc([circs[0], circs[2], c, circs[1]], level - 1);
    otherCirc([circs[1], circs[2], c, circs[0]], level - 1);
    return c;
};

//-------------------------------------------------------
var level = 3;
otherCirc([c0, c1, c2, c3], level);
otherCirc([c3, c1, c2, c0], level);
otherCirc([c0, c2, c3, c1], level);
otherCirc([c0, c1, c3, c2], level);
```

## 3D Vector Field

<https://jsxgraph.org/share/example/3d-vector-field>

```jsxgraph
const board = JXG.JSXGraph.initBoard(BOARDID, {
    boundingbox: [-8, 8, 8, -8],
    axis: false,
    showCopyright: false,
    keepAspectRatio: true,
    pan: {
        needTwoFingers: true
    }
});

var a = board.create('slider', [[-6, -7], [1, -7], [0, 0.5, 2]]);

const view = board.create('view3d',
    [
        [-6, -3],
        [8, 8],
        [[-3, 3], [-3, 3], [-3, 3]]
    ], {});

var vf = view.create('vectorfield3d', [
    [(x, y, z) => Math.cos(y), (x, y, z) => Math.sin(x), (x, y, z) => z],
    [-2, 5, 2], // x from -2 to 2 in 5 steps
    [-2, 5, 2], // y
    [-2, 5, 2] // z
], {
    strokeColor: 'red',
    scale: () => a.Value()
});
```
