// Generated by CoffeeScript 1.6.3
(function(exports) {
  var Bits, NamedRules, Rules, compose_transpositions;
  compose_transpositions = function(t1, t2) {
    var n, t1_i;
    if ((n = t1.length) !== t2.length) {
      throw new Error("Transpositions are incompatible");
    }
    return (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = t1.length; _i < _len; _i++) {
        t1_i = t1[_i];
        _results.push(t2[t1_i]);
      }
      return _results;
    })();
  };
  exports.Rules = Rules = {
    /*
    # Create rule object from list
    */

    from_list: typeof Int8Array !== "undefined" && Int8Array !== null ? function(rule_list) {
      return new Int8Array(rule_list);
    } : function(rule_list) {
      return rule_list;
    },
    to_list: typeof Int8Array !== "undefined" && Int8Array !== null ? function(tarr) {
      var ti, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = tarr.length; _i < _len; _i++) {
        ti = tarr[_i];
        _results.push(ti);
      }
      return _results;
    } : function(rule) {
      return rule;
    },
    /*
    # Parse string rule
    */

    parse: function(rule_str, separator) {
      var i, nparts, parts, ri, riStr, rule, _i, _len;
      if (separator == null) {
        separator = ",";
      }
      parts = rule_str.split(separator);
      nparts = parts.length;
      if (nparts !== 16) {
        throw new Error("Invalid rule string [" + rule_str + "], rule must have 16 parts, but have " + nparts);
      }
      rule = [];
      for (i = _i = 0, _len = parts.length; _i < _len; i = ++_i) {
        riStr = parts[i];
        rule.push(ri = parseInt(riStr, 10));
        if (!((0 <= ri && ri < 16))) {
          throw "Invalid value [" + ri + "] at position " + i + " in rule; must have values in range 0..15";
        }
      }
      return Rules.from_list(rule);
    },
    stringify: function(rule) {
      return Rules.to_list(rule).join(",");
    },
    equals: function(r1, r2) {
      var i, r1i, _i, _len;
      for (i = _i = 0, _len = r1.length; _i < _len; i = ++_i) {
        r1i = r1[i];
        if (r1i !== r2[i]) {
          return false;
        }
      }
      return true;
    },
    /*
    # Inverse rule, raise exception if impossible
    */

    reverse: function(rule) {
      var i, rrule, _i;
      if (!Rules.is_invertible(rule)) {
        throw new Error("Rule is not invertible");
      }
      rrule = (function() {
        var _i, _results;
        _results = [];
        for (i = _i = 0; _i <= 15; i = ++_i) {
          _results.push(null);
        }
        return _results;
      })();
      for (i = _i = 0; _i <= 15; i = ++_i) {
        rrule[rule[i]] = i;
      }
      return Rules.from_list(rrule);
    },
    /*
    # Checks whether the rule is invertible
    */

    is_invertible: function(rule) {
      var i, r, ri, _i, _len;
      r = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = rule.length; _i < _len; _i++) {
          ri = rule[_i];
          _results.push(ri);
        }
        return _results;
      })();
      r.sort(function(a, b) {
        return a - b;
      });
      for (i = _i = 0, _len = r.length; _i < _len; i = ++_i) {
        ri = r[i];
        if (ri !== i) {
          return false;
        }
      }
      return true;
    },
    make_from_samples: function(samples, invariants) {
      var a, a0, all_transforms, b, b0, i, ri, rule, _i, _j, _k, _len, _len1, _len2, _ref, _ref1;
      all_transforms = function(x, y, transforms) {
        var i, walk, x2y, xy_pairs;
        x2y = (function() {
          var _i, _results;
          _results = [];
          for (i = _i = 0; _i <= 15; i = ++_i) {
            _results.push(null);
          }
          return _results;
        })();
        xy_pairs = [];
        walk = function(x, y) {
          var tfm, y_old, _i, _len;
          if ((y_old = x2y[x]) != null) {
            if (y_old !== y) {
              throw new Error("Samples are contradicting invariants");
            }
          } else {
            x2y[x] = y;
            xy_pairs.push([x, y]);
            for (_i = 0, _len = transforms.length; _i < _len; _i++) {
              tfm = transforms[_i];
              walk(tfm(x), tfm(y));
            }
          }
          return null;
        };
        walk(x, y);
        return xy_pairs;
      };
      rule = (function() {
        var _i, _results;
        _results = [];
        for (i = _i = 0; _i <= 15; i = ++_i) {
          _results.push(null);
        }
        return _results;
      })();
      for (i = _i = 0, _len = samples.length; _i < _len; i = ++_i) {
        _ref = samples[i], a0 = _ref[0], b0 = _ref[1];
        _ref1 = all_transforms(a, b, invariants);
        for (b = _j = 0, _len1 = _ref1.length; _j < _len1; b = ++_j) {
          a = _ref1[b];
          if (rule[a] !== null && rule[a] !== b) {
            throw new Error("Sample " + (i + 1) + " conflicts with other samples");
          }
          rule[a] = b;
        }
      }
      for (i = _k = 0, _len2 = rule.length; _k < _len2; i = ++_k) {
        ri = rule[i];
        if (ri === null) {
          throw new Error("Samples incomplete. State " + i + " has no descendant");
        }
      }
      return Rules.from_list(rule);
    },
    /*
    #Take samples, pairs ( (a,b)... ) and builds rotation-invariant function,
    #that supports this transformation
    */

    make_rot_invariant_rule_from_samples: function(samples) {
      var a, b, i, r, ri, rule, _i, _j, _k, _len, _len1, _ref;
      rule = (function() {
        var _i, _results;
        _results = [];
        for (i = _i = 0; _i <= 15; i = ++_i) {
          _results.push(null);
        }
        return _results;
      })();
      for (i = _i = 0, _len = samples.length; _i < _len; i = ++_i) {
        _ref = samples[i], a = _ref[0], b = _ref[1];
        for (r = _j = 0; _j <= 3; r = ++_j) {
          if (rule[a] !== null && rule[a] !== b) {
            throw new Error("Sample #" + (i + 1) + " (rotated by" + r + ") conflicts");
          }
          rule[a] = b;
          a = Bits.rotate(a);
          b = Bits.rotate(b);
        }
      }
      for (i = _k = 0, _len1 = rule.length; _k < _len1; i = ++_k) {
        ri = rule[i];
        if (ri === null) {
          throw new Error("Samples incomplete. State " + i + " has no descendant");
        }
      }
      return Rules.from_list(rule);
    },
    /*
    (rule::Rule, transform::Int->Int).
    Checks, if  Rule*Transform == Transofmr*Rule
    */

    is_transposable_with: function(rule, transform) {
      var x, x_f_t, x_t_f, _i;
      for (x = _i = 0; _i < 16; x = ++_i) {
        x_t_f = rule[transform(x)];
        x_f_t = transform(rule[x]);
        if (x_t_f !== x_f_t) {
          return false;
        }
      }
      return true;
    },
    find_symmetries: function(rule) {
      var fliph_negate, flipv_negate, name, symmetries, transform, transforms, _i, _len, _ref;
      fliph_negate = function(x) {
        return Bits.negate(Bits.flip_h(x));
      };
      flipv_negate = function(x) {
        return Bits.negate(Bits.flip_v(x));
      };
      transforms = [["rot90", Bits.rotate], ["rot180", Bits.rotate180], ["flipx", Bits.flip_h], ["flipy", Bits.flip_v], ["negate", Bits.negate], ["flipy_neg", flipv_negate], ["flipx_neg", fliph_negate]];
      symmetries = {};
      for (_i = 0, _len = transforms.length; _i < _len; _i++) {
        _ref = transforms[_i], name = _ref[0], transform = _ref[1];
        if (Rules.is_transposable_with(rule, transform)) {
          symmetries[name] = true;
        }
      }
      return symmetries;
    },
    /*
    #Rules can be:
    #- Stable: population never changes
    #- Inverse-stable: population inverts on every step
    #- None: population changes.
    */

    invariance_type: function(rule) {
      var pop_invstable, pop_stable, sx, sy, x, _i;
      pop_stable = true;
      pop_invstable = true;
      for (x = _i = 0; _i < 16; x = ++_i) {
        sx = Bits.sum(x);
        sy = Bits.sum(rule[x]);
        if (sx !== sy) {
          pop_stable = false;
        }
        if (sx !== 4 - sy) {
          pop_invstable = false;
        }
        if (!pop_stable && !pop_invstable) {
          break;
        }
      }
      if (pop_stable) {
        return "const";
      }
      if (pop_invstable) {
        return "inv-const";
      }
      return "none";
    },
    vacuum_period: function(rule) {
      var mirror_bits, period, x, _i;
      mirror_bits = Bits.rotate180;
      x = 0;
      for (period = _i = 1; _i <= 16; period = ++_i) {
        if ((x = mirror_bits(rule[x])) === 0) {
          return period;
        }
      }
      return null;
    },
    flashing_to_regular: function(rule) {
      var transp_inv;
      if (!Rules.is_flashing(rule)) {
        throw new Error("Rule is not flashing");
      }
      transp_inv = Bits.tabulate(Bits.invert);
      return [compose_transpositions(rule, transp_inv), compose_transpositions(transp_inv, rule)];
    },
    is_flashing: function(rule) {
      return rule[0] === 15;
    },
    is_vacuum_stable: function(rule) {
      return rule[0] === 0;
    }
  };
  exports.Bits = Bits = {
    rotate: function(x) {
      var a, b, c, d, _ref;
      _ref = Bits.get(x), a = _ref[0], b = _ref[1], c = _ref[2], d = _ref[3];
      return Bits.fromBits(b, d, a, c);
    },
    get: function(x) {
      var i, _i, _results;
      _results = [];
      for (i = _i = 0; _i <= 3; i = ++_i) {
        _results.push((x >> i) & 1);
      }
      return _results;
    },
    fromBits: function(a, b, c, d) {
      return a | (b << 1) | (c << 2) | (d << 3);
    },
    rotate180: function(x) {
      var a, b, c, d, _ref;
      _ref = Bits.get(x), a = _ref[0], b = _ref[1], c = _ref[2], d = _ref[3];
      return Bits.fromBits(d, c, b, a);
    },
    flip_h: function(x) {
      var a, b, c, d, _ref;
      _ref = Bits.get(x), a = _ref[0], b = _ref[1], c = _ref[2], d = _ref[3];
      return Bits.fromBits(b, a, d, c);
    },
    flip_v: function(x) {
      var a, b, c, d, _ref;
      _ref = Bits.get(x), a = _ref[0], b = _ref[1], c = _ref[2], d = _ref[3];
      return Bits.fromBits(c, d, a, b);
    },
    negate: function(x) {
      return 15 - x;
    },
    sum: function(x) {
      var a, b, c, d, _ref;
      _ref = Bits.get(x), a = _ref[0], b = _ref[1], c = _ref[2], d = _ref[3];
      return a + b + c + d;
    },
    tabulate: function(func) {
      var i, _i, _results;
      _results = [];
      for (i = _i = 0; _i <= 15; i = ++_i) {
        _results.push(func(i));
      }
      return _results;
    }
  };
  exports.NamedRules = NamedRules = {
    tron: Rules.parse("15,1,2,3,4,5,6,7,8,9,10,11,12,13,14,0", ","),
    billiardBallMachine: Rules.parse("0,8,4,3,2,5,9,7,1,6,10,11,12,13,14,15"),
    bounceGas: Rules.parse("0,8,4,3,2,5,9,14, 1,6,10,13,12,11,7,15"),
    hppGas: Rules.parse("0,8,4,12,2,10,9, 14,1,6,5,13,3,11,7,15"),
    rotations: Rules.parse("0,2,8,12,1,10,9, 11,4,6,5,14,3,7,13,15"),
    rotations2: Rules.parse("0,2,8,12,1,10,9, 13,4,6,5,7,3,14,11,15"),
    rotations3: Rules.parse("0,4,1,10,8,3,9,11, 2,6,12,14,5,7,13,15"),
    rotations4: Rules.parse("0,4,1,12,8,10,6,14, 2,9,5,13,3,11,7,15"),
    sand: Rules.parse("0,4,8,12,4,12,12,13, 8,12,12,14,12,13,14,15"),
    stringThing: Rules.parse("0,1,2,12,4,10,9,7,8, 6,5,11,3,13,14,15", ","),
    stringThing2: Rules.parse("0,1,2,12,4,10,6,7,8, 9,5,11,3,13,14,15"),
    swapOnDiag: Rules.parse("0,8,4,12,2,10,6,14, 1,9,5,13,3,11,7,15"),
    critters: Rules.make_rot_invariant_rule_from_samples([[0, 15], [15, 0], [1, 14], [14, 8], [3, 3], [6, 6]]),
    doubleRotate: Rules.parse("0, 2, 8, 3, 1, 5, 6, 13, 4, 9, 10, 7, 12, 14, 11, 15"),
    singleRotate: Rules.make_rot_invariant_rule_from_samples([[0, 0], [1, 2], [3, 3], [6, 6], [7, 7], [15, 15]])
  };
  return exports.Rule2Name = (function() {
    var name, r2n, rule;
    r2n = {};
    for (name in NamedRules) {
      rule = NamedRules[name];
      r2n[Rules.stringify(rule)] = name;
    }
    return r2n;
  })();
})(typeof exports !== "undefined" && exports !== null ? exports : this["rules"] = {});

/*
//@ sourceMappingURL=rules.map
*/