(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Generated by CoffeeScript 1.8.0
(function() {
  var parseRle;

  parseRle = require("./rle").parseRle;

  exports.parseFieldDescriptionlLanguage = function(fdlText, defaultPalette) {
    var FLD, c, colors, colorsText, curColors, descriptions, i, instruction, line, m, pattern, pos, rule, size, x, y, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _ref3;
    FLD = {
      rle: /^\s*([bo0-9\$]+)\s*$/,
      at: /^\s*at\s+(-?\d+)\s+(-?\d+)\s*$/,
      colors: /^\s*colors\s+(.+)$/,
      comment: /^\s*--\s*(.*)$/,
      empty: /^\s*$/,
      size: /^\s*size\s+(\d+)\s+(\d+)\s*$/,
      rule: /^\s*rule\s+(.+)\s*$/
    };
    pos = [0, 0];
    pattern = [];
    colors = [];
    defaultPalette = defaultPalette != null ? defaultPalette : ["#FF0000", "#FFFF00", "#00FF00", "#00FFFF", "#0000FF", "#FF00FF"];
    curColors = defaultPalette;
    size = null;
    descriptions = [];
    rule = null;
    _ref = fdlText.split("\n");
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      line = _ref[_i];
      _ref1 = line.split(";");
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        instruction = _ref1[_j];
        instruction = instruction.trim();
        if (m = instruction.match(FLD.rle)) {
          _ref2 = parseRle(m[1]);
          for (i = _k = 0, _len2 = _ref2.length; _k < _len2; i = ++_k) {
            _ref3 = _ref2[i], x = _ref3[0], y = _ref3[1];
            pattern.push([x + pos[0], y + pos[1]]);
            colors.push(curColors[colors.length % curColors.length]);
          }
        } else if (m = instruction.match(FLD.at)) {
          pos = [parseInt(m[1], 10), parseInt(m[2], 10)];
        } else if (m = instruction.match(FLD.size)) {
          size = [parseInt(m[1], 10), parseInt(m[2], 10)];
        } else if (m = instruction.match(FLD.colors)) {
          colorsText = m[1].trim();
          curColors = colorsText === "default" ? defaultPalette : (function() {
            var _l, _len3, _ref4, _results;
            _ref4 = colorsText.split(":");
            _results = [];
            for (_l = 0, _len3 = _ref4.length; _l < _len3; _l++) {
              c = _ref4[_l];
              _results.push(c.trim());
            }
            return _results;
          })();
        } else if (instruction.match(FLD.empty)) {
          null;
        } else if (m = instruction.match(FLD.comment)) {
          descriptions.push(m[1]);
        } else if (m = instruction.match(FLD.rule)) {
          rule = makeRule(m[1].split('|').join(';'));
        } else {
          throw new Error("Unexpected instruction: " + instruction);
        }
      }
    }
    return {
      pattern: pattern,
      colors: colors,
      size: size,
      name: descriptions.join("\n"),
      rule: rule
    };
  };

}).call(this);

},{"./rle":4}],2:[function(require,module,exports){
// Generated by CoffeeScript 1.8.0
(function() {
  var CircularInterpolatingSimulator, Library, Simulator, SimulatorApp, getCanvasCursorPosition, makeRule, parseFieldDescriptionlLanguage, patternBounds, _ref;

  _ref = require("./revca_track"), CircularInterpolatingSimulator = _ref.CircularInterpolatingSimulator, Simulator = _ref.Simulator, makeRule = _ref.makeRule;

  parseFieldDescriptionlLanguage = require("./fdl_parser").parseFieldDescriptionlLanguage;

  if (window.requestAnimationFrame == null) {
    window.requestAnimationFrame = window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(callback) {
      return window.setTimeout(callback, 1000 / 30);
    };
  }

  getCanvasCursorPosition = function(e, canvas) {
    var rect, _ref1;
    if ((_ref1 = e.type) === "touchmove" || _ref1 === "touchstart" || _ref1 === "touchend") {
      e = e.touches[0];
    }
    if (e.clientX != null) {
      rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    }
  };

  SimulatorApp = (function() {
    function SimulatorApp() {
      var height, sim, width;
      this.colors = [];
      this.canvas = document.getElementById("sim-canvas");
      this.ctx = this.canvas.getContext("2d");
      this.size = 8;
      this.rule = makeRule("1,2,4,8:rot90");
      width = 80;
      if (typeof screen !== "undefined" && screen !== null) {
        height = Math.floor(screen.height / screen.width * width * 0.9) & ~1;
      } else {
        height = 60;
      }
      sim = new Simulator(width, height, this.rule);
      this.fadeRatio = 0.9;
      this.bgColor = [0, 0, 0];
      this.timeSteps = 100;
      this.maxStepsPerFrame = 10000 * this.timeSteps;
      this.gensPerSecond = 50;
      this.lanczosOrder = 3;
      this.smoothing = 4;
      this.isim = new CircularInterpolatingSimulator(sim, this.lanczosOrder, this.timeSteps, this.smoothing);
      this.bindEvents();
      this.playing = false;
      this.colorPalette = "#fe8f0f #f7325e #7dc410 #fef8cf #0264ed".split(" ");
      this._updateSimSpeed();
      this._updateSmoothing();
      this._updateTrails();
      this._onResize();
      this.putRandomPattern();
      this.library = new Library;
      this.library.loadItem = (function(_this) {
        return function(fdl) {
          return _this._loadFdl(fdl);
        };
      })(this);
      this._updatePlayBtn();
      this._delayedLoadLibrary();
    }

    SimulatorApp.prototype._delayedLoadLibrary = function() {
      var doLoad;
      doLoad = (function(_this) {
        return function() {
          var item, _i, _len, _ref1, _results;
          _ref1 = window.defaultLibrary;
          _results = [];
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            item = _ref1[_i];
            _results.push(_this.library.addFdl(item, _this.colorPalette));
          }
          return _results;
        };
      })(this);
      return window.setTimeout(doLoad, 100);
    };

    SimulatorApp.prototype.putRandomPattern = function(numCells, patternSize) {
      var f, i, r, s, x, y;
      s = this.isim.simulator;
      patternSize = Math.min(s.height, s.width) * 0.4;
      numCells = Math.pow(patternSize, 2) * 0.22;
      return this.putPattern((function() {
        var _i, _results;
        _results = [];
        for (i = _i = 0; _i < numCells; i = _i += 1) {
          f = Math.random() * 2 * Math.PI;
          r = (Math.random() * 2 - 1) * patternSize;
          x = Math.round(s.width * 0.5 + r * Math.cos(f));
          y = Math.round(s.height * 0.5 + r * Math.sin(f));
          _results.push([x | 0, y | 0]);
        }
        return _results;
      })());
    };

    SimulatorApp.prototype._updateSimSpeed = function() {
      return this.gensPerSecond = parseFloat(document.getElementById("sim-speed").value);
    };

    SimulatorApp.prototype._updateSmoothing = function() {
      return this.isim.setSmoothing(parseInt(document.getElementById("smoothing").value, 10));
    };

    SimulatorApp.prototype._updateTrails = function() {
      return this.fadeRatio = parseFloat(document.getElementById("trails").value);
    };

    SimulatorApp.prototype._loadFdl = function(fdl) {
      var cx, cy, e, parsed, _ref1;
      cx = (this.isim.simulator.width / 2) & ~1;
      cy = (this.isim.simulator.height / 2) & ~1;
      try {
        parsed = parseFieldDescriptionlLanguage(fdl, this.colorPalette);
        document.getElementById("fld-text").value = fdl;
      } catch (_error) {
        e = _error;
        alert("Failed to parse: " + e);
      }
      this.isim.clear();
      if (parsed.pattern.length > 0) {
        this.isim.put(parsed.pattern, cx, cy);
        this.colors = parsed.colors;
      }
      this.isim.simulator.rule = (_ref1 = parsed.rule) != null ? _ref1 : makeRule("1,2,4,8:rot90");
      this._updateClearBtnIcon();
      this._clearBackground();
      return window.scrollTo(0, 0);
    };

    SimulatorApp.prototype.clearAll = function() {
      this.isim.clear();
      if (!this.playing) {
        this._clearBackground();
      }
      return this._updateClearBtnIcon();
    };

    SimulatorApp.prototype._updateClearBtnIcon = function() {
      var clearVisible;
      clearVisible = this.isim.simulator.cells.length !== 0;
      if (this._clearBtnVisibility !== clearVisible) {
        this._clearBtnVisibility = clearVisible;
        if (clearVisible) {
          document.getElementById("btn-clear").style.display = "";
          document.getElementById("btn-random").style.display = "none";
        } else {
          document.getElementById("btn-clear").style.display = "none";
          document.getElementById("btn-random").style.display = "";
        }
      }
    };

    SimulatorApp.prototype.bindEvents = function() {
      document.getElementById("sim-speed").addEventListener("change", (function(_this) {
        return function(e) {
          return _this._updateSimSpeed();
        };
      })(this));
      document.getElementById("smoothing").addEventListener("change", (function(_this) {
        return function(e) {
          return _this._updateSmoothing();
        };
      })(this));
      document.getElementById("trails").addEventListener("change", (function(_this) {
        return function(e) {
          return _this._updateTrails();
        };
      })(this));
      document.getElementById("btn-clear").addEventListener("click", (function(_this) {
        return function(e) {
          return _this.clearAll();
        };
      })(this));
      document.getElementById("btn-random").addEventListener("click", (function(_this) {
        return function(e) {
          return _this.putRandomPattern();
        };
      })(this));
      document.getElementById("btn-play").addEventListener("click", (function(_this) {
        return function(e) {
          if (!_this.playing) {
            return _this.play();
          }
        };
      })(this));
      document.getElementById("btn-pause").addEventListener("click", (function(_this) {
        return function(e) {
          if (_this.playing) {
            return _this.stop();
          }
        };
      })(this));
      document.getElementById("btn-load-fdl").addEventListener("click", (function(_this) {
        return function(e) {
          return _this._loadFdl(document.getElementById("fld-text").value);
        };
      })(this));
      window.addEventListener("resize", (function(_this) {
        return function(e) {
          return _this._onResize();
        };
      })(this));
      return this.canvas.addEventListener("mousedown", (function(_this) {
        return function(e) {
          var ix, iy, x, y, _ref1;
          _ref1 = getCanvasCursorPosition(e, _this.canvas), x = _ref1[0], y = _ref1[1];
          ix = (x / _this.size) | 0;
          iy = (y / _this.size) | 0;
          _this.putCell(ix, iy);
          _this._updateClearBtnIcon();
          return e.preventDefault();
        };
      })(this));
    };

    SimulatorApp.prototype._onResize = function() {
      var container, desiredSize, newHeight, newWidth;
      container = document.getElementById("main-screen");
      desiredSize = Math.max(1, Math.floor(container.offsetWidth / this.isim.simulator.width)) | 0;
      if (desiredSize !== this.size) {
        this.size = desiredSize;
        newWidth = this.isim.simulator.width * desiredSize;
        newHeight = this.isim.simulator.height * desiredSize;
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        this._clearBackground();
        if (!this.playing) {
          return this.drawFrame();
        }
      }
    };

    SimulatorApp.prototype._clearBackground = function() {
      this.ctx.fillStyle = "rgb(" + this.bgColor[0] + "," + this.bgColor[1] + "," + this.bgColor[2] + ")";
      return this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    };

    SimulatorApp.prototype.putCell = function(ix, iy, color) {
      if (ix >= 0 && ix < this.isim.simulator.width && iy >= 0 && iy < this.isim.simulator.height) {
        if (this.isim.putCell(ix, iy)) {
          this.colors.push(color != null ? color : this.colorPalette[this.colors.length % this.colorPalette.length]);
          if (!this.playing) {
            this.drawFrame();
          }
          return this._updateClearBtnIcon();
        }
      }
    };

    SimulatorApp.prototype.putPattern = function(pattern, colors) {
      var i, numCells, palette, _i;
      if ((colors != null) && (colors.length === 0)) {
        throw new Error("EMpty color palette");
      }
      numCells = this.isim.put(pattern);
      palette = palette != null ? palette : this.colorPalette;
      for (i = _i = 0; 0 <= numCells ? _i < numCells : _i > numCells; i = 0 <= numCells ? ++_i : --_i) {
        this.colors.push(palette[this.colors.length % palette.length]);
      }
      if (!this.playing) {
        this.drawFrame();
      }
      this._updateClearBtnIcon();
    };

    SimulatorApp.prototype.drawFrame = function() {
      var ctx, i, size, x, xys, y, _i, _ref1;
      xys = this.isim.getInterpolatedState();
      ctx = this.ctx;
      ctx.fillStyle = "rgba(" + this.bgColor[0] + ", " + this.bgColor[1] + ", " + this.bgColor[2] + ", " + this.fadeRatio + ")";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#003300';
      size = this.size;
      for (i = _i = 0, _ref1 = xys.length; _i < _ref1; i = _i += 2) {
        x = xys[i];
        y = xys[i + 1];
        ctx.beginPath();
        ctx.arc(x * size, y * size, size / 2, 0, 2 * Math.PI, false);
        ctx.fillStyle = this.colors[i / 2];
        ctx.fill();
      }
    };

    SimulatorApp.prototype.togglePlay = function() {
      if (this.playing) {
        return this.stop();
      } else {
        return this.play();
      }
    };

    SimulatorApp.prototype._updatePlayBtn = function() {
      document.getElementById("btn-play").style.display = this.playing ? "none" : "";
      return document.getElementById("btn-pause").style.display = this.playing ? "" : "none";
    };

    SimulatorApp.prototype.stop = function() {
      this.playing = false;
      return this._updatePlayBtn();
    };

    SimulatorApp.prototype.play = function() {
      var drawFunc, previousFrameTime, stepsLeft;
      if (this.playing) {
        console.log("Already playing");
      } else {
        console.log("Play");
      }
      previousFrameTime = null;
      stepsLeft = 1;
      this.playing = true;
      this._updatePlayBtn();
      drawFunc = (function(_this) {
        return function() {
          var delta, iSteps, steps, timeNow;
          if (!_this.playing) {
            console.log("This is: " + _this);
            console.log("Stopping");
            return;
          }
          timeNow = Date.now();
          if (!previousFrameTime) {
            previousFrameTime = timeNow;
          }
          delta = timeNow - previousFrameTime;
          previousFrameTime = timeNow;
          steps = delta * _this.gensPerSecond * 0.001 * _this.timeSteps + stepsLeft;
          iSteps = Math.round(steps);
          if (iSteps > 0) {
            _this.drawFrame();
          }
          _this.isim.nextTime(Math.min(_this.maxStepsPerFrame, iSteps));
          stepsLeft = steps - iSteps;
          return window.requestAnimationFrame(drawFunc);
        };
      })(this);
      return drawFunc();
    };

    return SimulatorApp;

  })();

  Library = (function() {
    function Library() {
      this.list = document.getElementById("library");
      this.loadItem = null;
      this.iconSize = [64, 56];
    }

    Library.prototype.addFdl = function(fdl, palette) {
      var canvasContainer, colors, descText, itemImage, liAnchor, liItem, name, pattern, _ref1, _ref2;
      _ref1 = parseFieldDescriptionlLanguage(fdl, palette), pattern = _ref1.pattern, colors = _ref1.colors, name = _ref1.name;
      liItem = document.createElement("li");
      liItem.setAttribute("data-fdl", fdl);
      liAnchor = document.createElement("a");
      liAnchor.setAttribute("href", "#");
      liItem.appendChild(liAnchor);
      canvasContainer = document.createElement("div");
      canvasContainer.setAttribute("class", "library-icon");
      itemImage = document.createElement("canvas");
      _ref2 = this.iconSize, itemImage.width = _ref2[0], itemImage.height = _ref2[1];
      canvasContainer.appendChild(itemImage);
      liAnchor.appendChild(canvasContainer);
      descText = document.createTextNode(name);
      liAnchor.appendChild(descText);
      this.drawPatternOn(pattern, colors, itemImage);
      this.list.appendChild(liItem);
      liAnchor.addEventListener("click", (function(_this) {
        return function(e) {
          if (_this.loadItem != null) {
            _this.loadItem(fdl);
          }
          return e.preventDefault();
        };
      })(this));
    };

    Library.prototype.drawPatternOn = function(pattern, colors, canvas) {
      var ctx, h, i, ih, iw, ix, iy, r, w, x, x0, x1, y, y0, y1, _i, _len, _ref1, _ref2, _ref3;
      ctx = canvas.getContext("2d");
      if (ctx == null) {
        throw new Error("Not a canvas!");
      }
      w = canvas.width;
      h = canvas.height;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      _ref1 = patternBounds(pattern), x0 = _ref1[0], y0 = _ref1[1], x1 = _ref1[2], y1 = _ref1[3];
      iw = x1 - x0 + 1;
      ih = y1 - y0 + 1;
      r = Math.max(2, Math.min(w / iw, h / ih)) | 0;
      for (i = _i = 0, _len = pattern.length; _i < _len; i = ++_i) {
        _ref2 = pattern[i], x = _ref2[0], y = _ref2[1];
        ix = ((x - x0 - iw / 2 + 0.5) * r + w / 2) | 0;
        iy = ((y - y0 - ih / 2 + 0.5) * r + h / 2) | 0;
        ctx.beginPath();
        ctx.arc(ix, iy, r / 2, 0, 2 * Math.PI, false);
        ctx.fillStyle = (_ref3 = colors[i]) != null ? _ref3 : "blue";
        ctx.fill();
      }
    };

    Library.prototype._itemClick = function(fdl) {};

    return Library;

  })();

  patternBounds = function(lst) {
    var i, x, x0, x1, y, y0, y1, _i, _ref1, _ref2, _ref3, _ref4;
    if (lst.length === 0) {
      return [0, 0, 0, 0];
    }
    _ref2 = (_ref1 = lst[0], x0 = _ref1[0], y0 = _ref1[1], _ref1), x1 = _ref2[0], y1 = _ref2[1];
    for (i = _i = 1, _ref3 = lst.length; _i < _ref3; i = _i += 1) {
      _ref4 = lst[i], x = _ref4[0], y = _ref4[1];
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    return [x0, y0, x1, y1];
  };

  window.runCanvasSimulation = function() {
    var app;
    app = new SimulatorApp();
    return app.play();
  };

}).call(this);

},{"./fdl_parser":1,"./revca_track":3}],3:[function(require,module,exports){
// Generated by CoffeeScript 1.8.0
(function() {
  var CircularInterpolatingSimulator, Rules, Simulator, Transforms, addScaled, fillZeros, lanczosInterpolator, lanczosKernel, makeRule, mod, mod2, newFloatArray, newInt8Array, sinc, snap,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = [].slice;

  mod2 = function(x) {
    return x & 1;
  };

  mod = function(x, y) {
    var m;
    m = x % y;
    if (m < 0) {
      return m + y;
    } else {
      return m;
    }
  };

  snap = function(x, t) {
    return x - mod2(x + t);
  };

  exports.makeRule = makeRule = function(ruleString) {
    var code, codes, codes2tfm, iCode, part, rule, tfm, tfmName, _i, _j, _len, _len1, _ref, _ref1;
    rule = {};
    _ref = ruleString.split(";");
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      part = _ref[_i];
      codes2tfm = part.split(":");
      if (codes2tfm.length !== 2) {
        throw new Error("Parse error: " + part + " must have form n1,n2,...:tfm");
      }
      codes = codes2tfm[0], tfmName = codes2tfm[1];
      tfm = Transforms[tfmName.trim()];
      if (tfm == null) {
        throw new Error("Parse error: unknown transform " + tfmName);
      }
      _ref1 = codes.split(",");
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        code = _ref1[_j];
        iCode = parseInt(code.trim(), 10);
        if (__indexOf.call([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], iCode) < 0) {
          throw new Error("Error: code must be in range 0..15");
        }
        if (rule[iCode] != null) {
          throw new Error("Error: code " + iCode + " (");
        }
        rule[iCode] = tfm;
      }
    }
    return rule;
  };

  Transforms = {
    rot90: function(dx, dy) {
      return [-dy, dx];
    },
    rot180: function(dx, dy) {
      return [-dx, -dy];
    },
    rot270: function(dx, dy) {
      return [dy, -dx];
    },
    flipX: function(dx, dy) {
      return [-dx, dy];
    },
    flipY: function(dx, dy) {
      return [dx, -dy];
    },
    flipDiag: function(dx, dy) {
      return [dy, dx];
    },
    flipADiag: function(dx, dy) {
      return [-dy, -dx];
    }
  };

  fillZeros = function(arr) {
    var i, _i, _ref;
    for (i = _i = 0, _ref = arr.length; _i < _ref; i = _i += 1) {
      arr[i] = 0;
    }
    return arr;
  };

  newInt8Array = typeof Int8Array !== "undefined" && Int8Array !== null ? function(sz) {
    return new Int8Array(sz);
  } : function(sz) {
    return fillZeros(new Array(sz));
  };

  newFloatArray = typeof Float32Array !== "undefined" && Float32Array !== null ? function(sz) {
    return new Float32Array(sz);
  } : function(sz) {
    return fillZeros(new Array(sz));
  };

  exports.Rules = Rules = {
    singleRotation: {
      1: Transforms.rot90,
      2: Transforms.rot90,
      4: Transforms.rot90,
      8: Transforms.rot90
    }
  };

  exports.Simulator = Simulator = (function() {
    function Simulator(width, height, rule) {
      this.width = width;
      this.height = height;
      this.rule = rule != null ? rule : Rules.singleRotation;
      this.cells = [];
      this.field = newInt8Array(this.width * this.height);
      this.field1 = newInt8Array(this.width * this.height);
      this.phase = 0;
    }

    Simulator.prototype.cellCount = function() {
      return (this.cells.length / 2) | 0;
    };

    Simulator.prototype.index = function(x, y) {
      return x + y * this.width;
    };

    Simulator.prototype.indexw = function(x, y) {
      return this.index(mod(x, this.width), mod(y, this.height));
    };

    Simulator.prototype.putCell = function(x, y) {
      var c, idx;
      idx = this.index(x, y);
      if (this.field[idx] === 0) {
        c = this.cells;
        c.push(x);
        c.push(y);
        this.field[idx] = 1;
        return c.length - 1;
      } else {
        return null;
      }
    };

    Simulator.prototype.put = function(pattern, x0, y0) {
      var x, y, _i, _len, _ref;
      if (x0 == null) {
        x0 = 0;
      }
      if (y0 == null) {
        y0 = 0;
      }
      for (_i = 0, _len = pattern.length; _i < _len; _i++) {
        _ref = pattern[_i], x = _ref[0], y = _ref[1];
        this.putCell(x + x0, y + y0);
      }
    };

    Simulator.prototype.getCells = function() {
      var cc, i, _i, _ref, _results;
      cc = this.cells;
      _results = [];
      for (i = _i = 0, _ref = cc.length; _i < _ref; i = _i += 2) {
        _results.push([cc[i], cc[i + 1]]);
      }
      return _results;
    };

    Simulator.prototype.clear = function() {
      this.cells = [];
      this.phase = 0;
      this.field = newInt8Array(this.width * this.height);
    };

    Simulator.prototype.blockCode = function(x, y) {
      var f;
      f = this.field;
      return f[this.indexw(x, y)] * 1 + f[this.indexw(x + 1, y)] * 2 + f[this.indexw(x, y + 1)] * 4 + f[this.indexw(x + 1, y + 1)] * 8;
    };

    Simulator.prototype.step = function() {
      var dx, dy, field1, i, nextCells, oldCells, phase, tfm, x, x0, x1, y, y0, y1, _i, _j, _ref, _ref1, _ref2, _ref3;
      phase = this.phase;
      nextCells = [];
      field1 = this.field1;
      for (i = _i = 0, _ref = this.field1.length; _i < _ref; i = _i += 1) {
        field1[i] = 0;
      }
      for (i = _j = 0, _ref1 = this.cells.length; _j < _ref1; i = _j += 2) {
        x = this.cells[i];
        y = this.cells[i + 1];
        x0 = snap(x, phase);
        y0 = snap(y, phase);
        tfm = this.rule[this.blockCode(x0, y0)];
        if (tfm != null) {
          _ref2 = tfm(x - x0 - 0.5, y - y0 - 0.5), dx = _ref2[0], dy = _ref2[1];
          x1 = mod((x0 + 0.5 + dx) | 0, this.width);
          y1 = mod((y0 + 0.5 + dy) | 0, this.height);
        } else {
          x1 = x;
          y1 = y;
        }
        this.field1[this.index(x1, y1)] = 1;
        nextCells.push(x1);
        nextCells.push(y1);
      }
      _ref3 = [this.field, this.field1], this.field1 = _ref3[0], this.field = _ref3[1];
      this.phase = this.phase ^ 1;
      oldCells = this.cells;
      this.cells = nextCells;
      return oldCells;
    };

    return Simulator;

  })();

  sinc = function(x) {
    if (Math.abs(x) > 1e-8) {
      return Math.sin(x) / x;
    } else {
      return 1 - x * x / 6;
    }
  };

  lanczosKernel = function(a, n) {
    var ix, x, _i, _ref, _ref1, _results;
    if (a !== a | 0) {
      throw new Error("A must be integer");
    }
    _results = [];
    for (ix = _i = _ref = -a * n, _ref1 = a * n; _i <= _ref1; ix = _i += 1) {
      x = ix / n * Math.PI;
      _results.push(sinc(x) * sinc(x / a));
    }
    return _results;
  };

  lanczosInterpolator = function(a, n, downscale) {
    var interpolate, kernel, maxNumStates;
    if (downscale == null) {
      downscale = 1;
    }
    kernel = lanczosKernel(a, n * downscale);
    interpolate = function(states, offset) {
      var i, idx, state, sum, _i, _len;
      if (offset >= n || offset < 0) {
        throw new Error("Incorrect offset, must be in [0; " + n + ") ");
      }
      sum = newFloatArray(states[0].length);
      for (i = _i = 0, _len = states.length; _i < _len; i = ++_i) {
        state = states[i];
        idx = i * n + offset;
        if (idx >= kernel.length) {
          break;
        }
        addScaled(sum, state, kernel[idx]);
      }
      return sum;
    };
    maxNumStates = 2 * a * downscale;
    return [interpolate, maxNumStates];
  };

  addScaled = function(a, b, k) {
    var bi, i, _i, _len;
    for (i = _i = 0, _len = b.length; _i < _len; i = ++_i) {
      bi = b[i];
      a[i] += bi * k;
    }
    return a;
  };

  exports.CircularInterpolatingSimulator = CircularInterpolatingSimulator = (function() {
    function CircularInterpolatingSimulator(simulator, order, timeSteps, smoothing) {
      var _ref;
      this.simulator = simulator;
      this.timeSteps = timeSteps;
      this.smoothing = smoothing != null ? smoothing : 1;
      this.order = order * smoothing;
      _ref = lanczosInterpolator(this.order, this.timeSteps, this.smoothing), this.interpolator = _ref[0], this.neededStates = _ref[1];
      this.states = [];
      this._fillBuffer();
      this.time = 0;
    }

    CircularInterpolatingSimulator.prototype.setSmoothing = function(newSmoothing) {
      var _ref;
      if (newSmoothing === this.smoothing) {
        return;
      }
      this.smoothing = newSmoothing;
      _ref = lanczosInterpolator(this.order, this.timeSteps, newSmoothing), this.interpolator = _ref[0], this.neededStates = _ref[1];
      return this._fillBuffer();
    };

    CircularInterpolatingSimulator.prototype.put = function(pattern, x0, y0) {
      var h, newStates, w, x, y, _i, _len, _ref;
      if (x0 == null) {
        x0 = 0;
      }
      if (y0 == null) {
        y0 = 0;
      }
      newStates = [];
      w = this.simulator.width;
      h = this.simulator.height;
      for (_i = 0, _len = pattern.length; _i < _len; _i++) {
        _ref = pattern[_i], x = _ref[0], y = _ref[1];
        x = mod(x + x0, w);
        y = mod(y + y0, h);
        if (this.simulator.putCell(x, y) != null) {
          newStates.push(x);
          newStates.push(y);
        }
      }
      this._appendStateToBuffer(this._mapState(newStates));
      return newStates.length;
    };

    CircularInterpolatingSimulator.prototype.putCell = function() {
      var xy;
      xy = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this.put([xy]);
    };

    CircularInterpolatingSimulator.prototype.clear = function() {
      var i;
      this.simulator.clear();
      this.states = (function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = 0, _ref = this.neededStates; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          _results.push([]);
        }
        return _results;
      }).call(this);
    };

    CircularInterpolatingSimulator.prototype._appendStateToBuffer = typeof Float32Array !== "undefined" && Float32Array !== null ? function(tail) {
      var newState, state;
      this.states = (function() {
        var _i, _len, _ref, _results;
        _ref = this.states;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          state = _ref[_i];
          newState = newFloatArray(state.length + tail.length);
          newState.set(state);
          newState.set(tail, state.length);
          _results.push(newState);
        }
        return _results;
      }).call(this);
    } : function(tail) {
      var state;
      this.states = (function() {
        var _i, _len, _ref, _results;
        _ref = this.states;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          state = _ref[_i];
          _results.push(state.concat(tail));
        }
        return _results;
      }).call(this);
    };

    CircularInterpolatingSimulator.prototype._getState = function() {
      return this._mapState(this.simulator.step());
    };

    CircularInterpolatingSimulator.prototype._mapState = function(s) {
      var i, ih, iw, j, nx, ny, s1, _i, _ref;
      s1 = newFloatArray(s.length * 2);
      iw = 2 * Math.PI / this.simulator.width;
      ih = 2 * Math.PI / this.simulator.height;
      for (i = _i = 0, _ref = s.length; _i < _ref; i = _i += 2) {
        j = i * 2;
        nx = s[i] * iw;
        s1[j] = Math.cos(nx);
        s1[j + 1] = Math.sin(nx);
        ny = s[i + 1] * ih;
        s1[j + 2] = Math.cos(ny);
        s1[j + 3] = Math.sin(ny);
      }
      return s1;
    };

    CircularInterpolatingSimulator.prototype._unMapState = function(s) {
      var PI2, cx, cy, i, j, kx, ky, s1, sx, sy, wrapPi, _i, _ref;
      kx = this.simulator.width / (2 * Math.PI);
      ky = this.simulator.height / (2 * Math.PI);
      PI2 = Math.PI * 2;
      wrapPi = function(x) {
        if (x > 0) {
          return x;
        } else {
          return x + PI2;
        }
      };
      s1 = newFloatArray(s.length / 2);
      for (i = _i = 0, _ref = s.length; _i <= _ref; i = _i += 4) {
        j = (i / 2) | 0;
        cx = s[i];
        sx = s[i + 1];
        cy = s[i + 2];
        sy = s[i + 3];
        s1[j] = wrapPi(Math.atan2(sx, cx)) * kx;
        s1[j + 1] = wrapPi(Math.atan2(sy, cy)) * ky;
      }
      return s1;
    };

    CircularInterpolatingSimulator.prototype._fillBuffer = function() {
      if (this.states.length > this.neededStates) {
        this.states = this.states.slice(this.states.length - this.neededStates, this.states.length);
      } else {
        while (this.states.length < this.neededStates) {
          this.states.push(this._getState());
        }
      }
    };

    CircularInterpolatingSimulator.prototype.getInterpolatedState = function() {
      return this._unMapState(this.interpolator(this.states, this.timeSteps - this.time - 1));
    };

    CircularInterpolatingSimulator.prototype.nextTime = function(dt) {
      this.time += dt;
      while (this.time >= this.timeSteps) {
        this.time -= this.timeSteps;
        this.states = this.states.slice(1);
        this.states.push(this._getState());
      }
      return this.time;
    };

    return CircularInterpolatingSimulator;

  })();

}).call(this);

},{}],4:[function(require,module,exports){
// Generated by CoffeeScript 1.8.0
(function() {
  var parseRle;

  exports.parseRle = parseRle = function(rle) {
    var c, count, curCount, i, j, pattern, x, y, _i, _j, _ref;
    x = 0;
    y = 0;
    curCount = 0;
    pattern = [];
    for (i = _i = 0, _ref = rle.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      c = rle.charAt(i);
      if (("0" <= c && c <= "9")) {
        curCount = curCount * 10 + parseInt(c, 10);
      } else if (c === " " || c === "\n" || c === "\r" || c === "\t") {
        continue;
      } else if (c === "!") {
        return;
      } else {
        count = Math.max(curCount, 1);
        curCount = 0;
        switch (c) {
          case "b":
            x += count;
            break;
          case "$":
            y += count;
            x = 0;
            break;
          case "o":
            for (j = _j = 0; _j < count; j = _j += 1) {
              pattern.push([x, y]);
              x += 1;
            }
            break;
          default:
            throw new Error("Unexpected character '" + c + "' at position " + i);
        }
      }
    }
    return pattern;
  };

}).call(this);

},{}]},{},[2]);
