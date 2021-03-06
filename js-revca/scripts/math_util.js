// Generated by CoffeeScript 1.6.3
(function(exports) {
  var Maximizer, gcd, isign, line_pixels, mod, rational2str, scale_array_inplace;
  exports.getReadableFileSizeString = function(fileSizeInBytes) {
    var byteUnits, i;
    i = -1;
    byteUnits = [" kB", " MB", " GB", " TB", "PB", "EB", "ZB", "YB"];
    while (true) {
      fileSizeInBytes = fileSizeInBytes / 1024;
      i++;
      if (!(fileSizeInBytes > 1024)) {
        break;
      }
    }
    return "" + Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
  };
  exports.rational2str = rational2str = function(num, den) {
    var d;
    if (den < 0) {
      return rational2str(-num, -den);
    }
    if (num === 0) {
      if (den === 0) {
        return "0/0";
      } else {
        return "0";
      }
    } else {
      if (den === 0) {
        return "1/0";
      } else {
        d = gcd(Math.abs(num), den);
        return "" + (num / d) + "/" + (den / d);
      }
    }
  };
  /*
  Mathematical modulo (works with negative values)
  */

  exports.mod = mod = function(x, y) {
    var m;
    m = x % y;
    if (m < 0) {
      return m + y;
    } else {
      return m;
    }
  };
  /*
  Integer division
  */

  exports.div = function(x, y) {
    return (x / y) | 0;
  };
  exports.isign = isign = function(x) {
    if (x > 0) {
      return 1;
    } else if (x < 0) {
      return -1;
    } else {
      return 0;
    }
  };
  /*
  Fill 0-based array with constant value
  */

  exports.fill_array = function(arr, n, x) {
    var i, _i;
    for (i = _i = 0; 0 <= n ? _i < n : _i > n; i = 0 <= n ? ++_i : --_i) {
      arr[i] = x;
    }
    return arr;
  };
  scale_array_inplace = function(arr, k) {
    var i, _i, _ref;
    for (i = _i = 0, _ref = arr.length; _i < _ref; i = _i += 1) {
      arr[i] *= k;
    }
    return arr;
  };
  /*
  Primitive line drawing algorithm
  */

  exports.line_pixels = line_pixels = function(dx, dy) {
    var k, sx, sy, x, xx, yy, _i, _ref, _ref1;
    sx = isign(dx);
    sy = isign(dy);
    if (sx < 0 || sy < 0) {
      _ref = line_pixels(dx * sx, dy * sy), xx = _ref[0], yy = _ref[1];
      if (sx !== 1) {
        scale_array_inplace(xx, sx);
      }
      if (sy !== 1) {
        scale_array_inplace(yy, sy);
      }
      return [xx, yy];
    }
    if (dy > dx) {
      _ref1 = line_pixels(dy, dx), xx = _ref1[0], yy = _ref1[1];
      return [yy, xx];
    }
    if (dx === 0) {
      return [[0], [0]];
    }
    xx = [];
    yy = [];
    k = dy / dx;
    for (x = _i = 0; 0 <= dx ? _i <= dx : _i >= dx; x = 0 <= dx ? ++_i : --_i) {
      xx.push(x);
      yy.push(Math.floor(x * k));
    }
    return [xx, yy];
  };
  exports.gcd = gcd = function(a, b) {
    if (a < b) {
      return gcd(b, a);
    } else if (b === 0) {
      return a;
    } else {
      return gcd(b, a % b);
    }
  };
  exports.cap = function(a, b, x) {
    return Math.min(b, Math.max(a, x));
  };
  return exports.Maximizer = Maximizer = (function() {
    function Maximizer(targetFunc) {
      this.targetFunc = targetFunc != null ? targetFunc : function(x) {
        return x;
      };
      this.bestX = null;
      this.bestY = null;
    }

    Maximizer.prototype.put = function(x) {
      var y;
      y = this.targetFunc(x);
      if (!this.hasAny() || (y > this.bestY)) {
        this.bestX = x;
        this.bestY = y;
      }
      return this;
    };

    Maximizer.prototype.putAll = function(xs) {
      var x, _i, _len;
      for (_i = 0, _len = xs.length; _i < _len; _i++) {
        x = xs[_i];
        this.put(x);
      }
      return null;
    };

    Maximizer.prototype.hasAny = function() {
      return this.bestY != null;
    };

    Maximizer.prototype.getArg = function() {
      if (!this.hasAny()) {
        throw new Error("Has no values");
      }
      return this.bestX;
    };

    Maximizer.prototype.getVal = function() {
      if (!this.hasAny()) {
        throw new Error("Has no values");
      }
      return this.bestY;
    };

    return Maximizer;

  })();
})(typeof exports !== "undefined" && exports !== null ? exports : this["math_util"] = {});

/*
//@ sourceMappingURL=math_util.map
*/
