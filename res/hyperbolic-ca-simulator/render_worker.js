(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var ContextDelegate, runCommands;

exports.ContextDelegate = ContextDelegate = (function() {
  function ContextDelegate() {
    this.commands = [];
  }

  ContextDelegate.prototype.moveTo = function(x, y) {
    return this.commands.push(1, x, y);
  };

  ContextDelegate.prototype.lineTo = function(x, y) {
    return this.commands.push(2, x, y);
  };

  ContextDelegate.prototype.bezierCurveTo = function(x1, y1, x2, y2, x3, y3) {
    return this.commands.push(3, x1, y1, x2, y2, x3, y3);
  };

  ContextDelegate.prototype.closePath = function() {
    return this.commands.push(4);
  };

  ContextDelegate.prototype.reset = function() {
    return this.commands = [];
  };

  ContextDelegate.prototype.take = function() {
    var c;
    c = this.commands;
    this.commands = [];
    return c;
  };

  return ContextDelegate;

})();

exports.runCommands = runCommands = function(context, cs) {
  var i, n;
  i = 0;
  n = cs.length;
  while (i < n) {
    switch (cs[i]) {
      case 1:
        context.moveTo(cs[i + 1], cs[i + 2]);
        i += 3;
        break;
      case 2:
        context.lineTo(cs[i + 1], cs[i + 2]);
        i += 3;
        break;
      case 3:
        context.bezierCurveTo(cs[i + 1], cs[i + 2], cs[i + 3], cs[i + 4], cs[i + 5], cs[i + 6]);
        i += 7;
        break;
      case 4:
        context.closePath();
        i += 1;
        break;
      default:
        throw new Error("Unnown drawing command " + cs[i]);
    }
  }
};


},{}],2:[function(require,module,exports){
var CenteredVonDyck, M, Tessellation, len2;

CenteredVonDyck = require("./triangle_group_representation.coffee").CenteredVonDyck;

M = require("./matrix3.coffee");

len2 = function(x, y) {
  return x * x + y * y;
};

exports.Tessellation = Tessellation = (function() {
  function Tessellation(n, m) {
    this.group = new CenteredVonDyck(n, m);
    this.cellShape = this._generateNGon(n, this.group.sinh_r, this.group.cosh_r);
  }

  Tessellation.prototype._generateNGon = function(n, sinh_r, cosh_r) {
    var alpha, angle, i, j, ref, results;
    alpha = Math.PI * 2 / n;
    results = [];
    for (i = j = 0, ref = n; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      angle = alpha * i;
      results.push([sinh_r * Math.cos(angle), sinh_r * Math.sin(angle), cosh_r]);
    }
    return results;
  };

  Tessellation.prototype.makeCellShapePoincare = function(cellTransformMatrix, context) {
    var i, inv_t0, inv_t1, j, len, pPrev, ref, ref1, ref2, t0, t1, vertex, x0, x1, xx0, xx1, y0, y1, yy0, yy1;
    pPrev = null;
    ref = this.cellShape;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      vertex = ref[i];
      ref1 = pPrev != null ? pPrev : M.mulv(cellTransformMatrix, vertex), x0 = ref1[0], y0 = ref1[1], t0 = ref1[2];
      ref2 = pPrev = M.mulv(cellTransformMatrix, this.cellShape[(i + 1) % this.cellShape.length]), x1 = ref2[0], y1 = ref2[1], t1 = ref2[2];
      inv_t0 = 1.0 / (t0 + 1);
      xx0 = x0 * inv_t0;
      yy0 = y0 * inv_t0;
      inv_t1 = 1.0 / (t1 + 1);
      xx1 = x1 * inv_t1;
      yy1 = y1 * inv_t1;
      if (i === 0) {
        context.moveTo(xx0, yy0);
      }
      this.drawPoincareCircleTo(context, xx0, yy0, xx1, yy1);
    }
  };

  Tessellation.prototype.drawPoincareCircleTo = function(context, x0, y0, x1, y1) {
    var cross, delta2, k0, k1, r, r2, sq_l0, sq_l1;
    sq_l0 = len2(x0, y0);
    sq_l1 = len2(x1, y1);
    k0 = (1 + 1 / sq_l0) * 0.5;
    k1 = (1 + 1 / sq_l1) * 0.5;
    delta2 = len2(x0 * k0 - x1 * k1, y0 * k0 - y1 * k1);
    if (delta2 < 1e-4) {
      context.lineTo(x1, y1);
      return;
    }
    cross = x0 * y1 - x1 * y0;
    r2 = (sq_l0 * sq_l1 * delta2) / (cross * cross) - 1;
    r = -Math.sqrt(r2);
    if (cross < 0) {
      r = -r;
    }
    if (Math.abs(r) < 100) {
      return this.drawBezierApproxArcTo(context, x0, y0, x1, y1, r, r < 0);
    } else {
      return context.lineTo(x1, y1);
    }
  };

  Tessellation.prototype.drawBezierApproxArcTo = function(context, x0, y0, x1, y1, r, reverse) {
    var ct, d, d2, kx, ky, p11x, p11y, p12x, p12y, r_ct, vx_x, vx_y, vy_x, vy_y, xc, yc;
    d2 = len2(x0 - x1, y0 - y1);
    d = Math.sqrt(d2);
    ct = Math.sqrt(r * r - d2 * 0.25);
    if (reverse) {
      ct = -ct;
    }
    r_ct = r - ct;
    kx = (4.0 / 3.0) * r_ct / d;
    ky = -(8.0 / 3.0) * r * r_ct / d2 + 1.0 / 6.0;
    vy_x = x1 - x0;
    vy_y = y1 - y0;
    vx_x = vy_y;
    vx_y = -vy_x;
    xc = (x0 + x1) * 0.5;
    yc = (y0 + y1) * 0.5;
    p11x = xc + vx_x * kx + vy_x * ky;
    p11y = yc + vx_y * kx + vy_y * ky;
    p12x = xc + vy_y * kx - vy_x * ky;
    p12y = yc + -vy_x * kx - vy_y * ky;
    return context.bezierCurveTo(p11x, p11y, p12x, p12y, x1, y1);
  };

  Tessellation.prototype.visiblePolygonSize = function(cellTransformMatrix) {
    var i, j, len, ref, ref1, t, vertex, x, xmax, xmin, xx, y, ymax, ymin, yy;
    xmin = xmax = ymin = ymax = 0.0;
    ref = this.cellShape;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      vertex = ref[i];
      ref1 = M.mulv(cellTransformMatrix, vertex), x = ref1[0], y = ref1[1], t = ref1[2];
      xx = x / t;
      yy = y / t;
      if (i === 0) {
        xmin = xmax = xx;
        ymin = ymax = yy;
      } else {
        xmin = Math.min(xmin, xx);
        xmax = Math.max(xmax, xx);
        ymin = Math.min(ymin, yy);
        ymax = Math.max(ymax, yy);
      }
    }
    return Math.max(xmax - xmin, ymax - ymin);
  };

  return Tessellation;

})();


},{"./matrix3.coffee":3,"./triangle_group_representation.coffee":5}],3:[function(require,module,exports){
var add, addScaledInplace, amplitude, approxEq, approxEqv, cleanupHyperbolicMoveMatrix, copy, eye, hrot, hyperbolicInv, inv, mul, mulv, rot, rotationMatrix, set, smul, translationMatrix, transpose, zero;

exports.eye = eye = function() {
  return [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];
};

exports.zero = zero = function() {
  return [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
};

exports.set = set = function(m, i, j, v) {
  m[i * 3 + j] = v;
  return m;
};

exports.rot = rot = function(i, j, angle) {
  var c, m, s;
  m = eye();
  s = Math.sin(angle);
  c = Math.cos(angle);
  set(m, i, i, c);
  set(m, i, j, -s);
  set(m, j, i, s);
  set(m, j, j, c);
  return m;
};

exports.hrot = hrot = function(i, j, sinhD) {
  var c, m, s;
  m = eye();
  s = sinhD;
  c = Math.sqrt(sinhD * sinhD + 1);
  set(m, i, i, c);
  set(m, i, j, s);
  set(m, j, i, s);
  set(m, j, j, c);
  return m;
};

exports.mul = mul = function(m1, m2) {
  var i, j, k, l, m, n, o, s;
  m = zero();
  for (i = l = 0; l < 3; i = ++l) {
    for (j = n = 0; n < 3; j = ++n) {
      s = 0.0;
      for (k = o = 0; o < 3; k = ++o) {
        s += m1[i * 3 + k] * m2[k * 3 + j];
      }
      m[i * 3 + j] = s;
    }
  }
  return m;
};

exports.approxEq = approxEq = function(m1, m2, eps) {
  var d, i, l;
  if (eps == null) {
    eps = 1e-6;
  }
  d = 0.0;
  for (i = l = 0; l < 9; i = ++l) {
    d += Math.abs(m1[i] - m2[i]);
  }
  return d < eps;
};

exports.copy = copy = function(m) {
  return m.slice(0);
};

exports.mulv = mulv = function(m, v) {
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
};

exports.approxEqv = approxEqv = function(v1, v2, eps) {
  var d, i, l;
  if (eps == null) {
    eps = 1e-6;
  }
  d = 0.0;
  for (i = l = 0; l < 3; i = ++l) {
    d += Math.abs(v1[i] - v2[i]);
  }
  return d < eps;
};


/*
 * m: matrix( [m0, m1, m2], [m3,m4,m5], [m6,m7,m8] );
 * ratsimp(invert(m)*determinant(m));
 * determinant(
 */

exports.inv = inv = function(m) {
  var iD;
  iD = 1.0 / (m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]));
  return [(m[4] * m[8] - m[5] * m[7]) * iD, (m[2] * m[7] - m[1] * m[8]) * iD, (m[1] * m[5] - m[2] * m[4]) * iD, (m[5] * m[6] - m[3] * m[8]) * iD, (m[0] * m[8] - m[2] * m[6]) * iD, (m[2] * m[3] - m[0] * m[5]) * iD, (m[3] * m[7] - m[4] * m[6]) * iD, (m[1] * m[6] - m[0] * m[7]) * iD, (m[0] * m[4] - m[1] * m[3]) * iD];
};

exports.smul = smul = function(k, m) {
  var l, len, mi, results;
  results = [];
  for (l = 0, len = m.length; l < len; l++) {
    mi = m[l];
    results.push(mi * k);
  }
  return results;
};

exports.add = add = function(m1, m2) {
  var i, l, results;
  results = [];
  for (i = l = 0; l < 9; i = ++l) {
    results.push(m1[i] + m2[i]);
  }
  return results;
};

exports.addScaledInplace = addScaledInplace = function(m, m1, k) {
  var i, l, ref;
  for (i = l = 0, ref = m.length; 0 <= ref ? l < ref : l > ref; i = 0 <= ref ? ++l : --l) {
    m[i] += m1[i] * k;
  }
  return m;
};

exports.transpose = transpose = function(m) {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
};

exports.hyperbolicInv = hyperbolicInv = function(m) {
  return [m[0], m[3], -m[6], m[1], m[4], -m[7], -m[2], -m[5], m[8]];
};

exports.cleanupHyperbolicMoveMatrix = cleanupHyperbolicMoveMatrix = function(m) {
  return smul(0.5, add(m, inv(hyperbolicInv(m))));
};

exports.translationMatrix = translationMatrix = function(dx, dy) {
  var dt, k, r2, xxk, xyk, yyk;
  r2 = dx * dx + dy * dy;
  dt = Math.sqrt(r2 + 1);
  k = r2 < 1e-6 ? 0.5 : (dt - 1) / r2;
  xxk = dx * dx * k;
  xyk = dx * dy * k;
  yyk = dy * dy * k;
  return [xxk + 1, xyk, dx, xyk, yyk + 1, dy, dx, dy, dt];
};

exports.rotationMatrix = rotationMatrix = function(angle) {
  var c, s;
  s = Math.sin(angle);
  c = Math.cos(angle);
  return [c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0];
};

exports.amplitude = amplitude = function(m) {
  var mi;
  return Math.max.apply(Math, (function() {
    var l, len, results;
    results = [];
    for (l = 0, len = m.length; l < len; l++) {
      mi = m[l];
      results.push(Math.abs(mi));
    }
    return results;
  })());
};

exports.hyperbolicDecompose = function(m) {
  var R, T, cos, dx, dy, ref, sin, t;
  ref = mulv(m, [0, 0, 1]), dx = ref[0], dy = ref[1], t = ref[2];
  T = translationMatrix(-dx, -dy);
  R = mul(T, m);
  cos = (R[0] + R[4]) * 0.5;
  sin = (R[1] - R[3]) * 0.5;
  return [Math.atan2(sin, cos), dx, dy];
};


},{}],4:[function(require,module,exports){
var ContextDelegate, M, Tessellation, cellMatrices, initialize, render, tessellation;

Tessellation = require("./hyperbolic_tessellation.coffee").Tessellation;

ContextDelegate = require("./context_delegate.coffee").ContextDelegate;

M = require("./matrix3.coffee");

cellMatrices = null;

tessellation = null;

initialize = function(n, m, newCellMatrices) {
  tessellation = new Tessellation(n, m);
  return cellMatrices = newCellMatrices;
};

render = function(viewMatrix) {
  var context, i, len, m, results;
  context = new ContextDelegate;
  results = [];
  for (i = 0, len = cellMatrices.length; i < len; i++) {
    m = cellMatrices[i];
    tessellation.makeCellShapePoincare(M.mul(viewMatrix, m), context);
    results.push(context.take());
  }
  return results;
};

self.onmessage = function(e) {
  var id, m, matrices, n, ref, shapes;
  switch (e.data[0]) {
    case "I":
      ref = e.data[1], n = ref[0], m = ref[1], matrices = ref[2];
      console.log("Init tessellation {" + n + ";" + m + "}");
      initialize(n, m, matrices);
      postMessage(["I", [n, m]]);
      shapes = render(M.eye());
      return postMessage(["R", shapes, 0]);
    case "R":
      id = e.data[2];
      shapes = render(e.data[1]);
      return postMessage(["R", shapes, id]);
    default:
      return console.log("Unknown message: " + (JSON.stringify(e.data)));
  }
};


},{"./context_delegate.coffee":1,"./hyperbolic_tessellation.coffee":2,"./matrix3.coffee":3}],5:[function(require,module,exports){
var CenteredVonDyck, M, TriangleGroup, powers;

M = require("./matrix3.coffee");

M;

exports.TriangleGroup = TriangleGroup = (function() {
  function TriangleGroup(p, q, r) {
    var i, im, m, n, ref, sigma, sp, sq, sr, toString;
    ref = (function() {
      var l, len, ref, results;
      ref = [p, q, r];
      results = [];
      for (l = 0, len = ref.length; l < len; l++) {
        n = ref[l];
        results.push(Math.cos(Math.PI / n));
      }
      return results;
    })(), sp = ref[0], sq = ref[1], sr = ref[2];
    this.pqr = [p, q, r];
    m = [-1.0, sp, sr, sp, -1.0, sq, sr, sq, -1.0];
    this.m = m;
    im = M.add(M.smul(2, m), M.eye());
    sigma = function(k) {
      var e, i, j, l, o, s;
      s = M.zero();
      e = M.eye();
      for (i = l = 0; l < 3; i = ++l) {
        for (j = o = 0; o < 3; j = ++o) {
          M.set(s, i, j, (i === k ? im : e)[i * 3 + j]);
        }
      }
      return s;
    };
    this.m_pqr = (function() {
      var l, results;
      results = [];
      for (i = l = 0; l < 3; i = ++l) {
        results.push(sigma(i));
      }
      return results;
    })();
    toString = function() {
      return ("Trg(" + this.pqr[0] + "," + this.pqr[1] + "," + this.pqr[2] + ")") % self.pqr;
    };
  }

  return TriangleGroup;

})();


/*  array of matrix powers
 */

powers = function(matrix, n) {
  var i, l, m_n, pows, ref;
  m_n = M.eye();
  pows = [m_n];
  for (i = l = 1, ref = n; 1 <= ref ? l < ref : l > ref; i = 1 <= ref ? ++l : --l) {
    m_n = M.mul(matrix, m_n);
    pows.push(m_n);
  }
  return pows;
};


/*
 * Impoementation of VD groups of order (n, m, 2)
 * with 2 generators: a, b
 *  and rules: a^n = b^m = abab = e
 *
 *  such that `a` has fixed point (0,0,1)
 */

exports.CenteredVonDyck = CenteredVonDyck = (function() {
  function CenteredVonDyck(n, m) {
    this.a = M.rot(0, 1, Math.PI * 2 / n);
    this.n = n;
    this.m = m;
    this.cosh_r = 1.0 / (Math.tan(Math.PI / n) * Math.tan(Math.PI / m));
    if (this.cosh_r <= 1.0) {
      throw new Error("von Dyck group is not hyperbolic!");
    }
    this.sinh_r = Math.sqrt(Math.pow(this.cosh_r, 2) - 1);
    this.b = M.mul(M.mul(M.hrot(0, 2, this.sinh_r), M.rot(0, 1, Math.PI * 2 / m)), M.hrot(0, 2, -this.sinh_r));
    this.aPowers = powers(this.a, n);
    this.bPowers = powers(this.b, m);
  }

  CenteredVonDyck.prototype.aPower = function(i) {
    return this.aPowers[((i % this.n) + this.n) % this.n];
  };

  CenteredVonDyck.prototype.bPower = function(i) {
    return this.bPowers[((i % this.m) + this.m) % this.m];
  };

  CenteredVonDyck.prototype.generatorPower = function(g, i) {
    if (g === 'a') {
      return this.aPower(i);
    } else if (g === 'b') {
      return this.bPower(i);
    } else {
      throw new Error("Unknown generator: " + g);
    }
  };

  return CenteredVonDyck;

})();


},{"./matrix3.coffee":3}]},{},[4]);
