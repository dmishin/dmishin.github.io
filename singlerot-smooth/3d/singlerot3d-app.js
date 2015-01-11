(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Generated by CoffeeScript 1.8.0
(function() {
  var WorkerFlyingCurves, animate, bindEvents, camera, container, controls, curves, hidePatternsWindow, init, initLibrary, loadCustomPattern, minTimePerTube, onWindowResize, palette, parseFieldDescriptionlLanguage, parseUri, prevTime, render, renderer, requestStop, scene, showPatternsWindow, stats, stepsPerMs, visibilityDistance;

  parseFieldDescriptionlLanguage = require("../fdl_parser").parseFieldDescriptionlLanguage;

  parseUri = require("../parseuri").parseUri;

  container = void 0;

  stats = void 0;

  camera = void 0;

  scene = void 0;

  renderer = void 0;

  controls = void 0;

  curves = void 0;

  stepsPerMs = 10 / 1000;

  visibilityDistance = 10000;

  minTimePerTube = 1000 / 30;

  palette = [0xfe8f0f, 0xf7325e, 0x7dc410, 0xfef8cf, 0x0264ed];

  requestStop = false;

  WorkerFlyingCurves = (function() {
    function WorkerFlyingCurves(startZ, endZ) {
      var scale;
      if (startZ == null) {
        startZ = 4000;
      }
      if (endZ == null) {
        endZ = -4000;
      }
      this.worker = new Worker("./tubing_worker_app.js");
      this.worker.addEventListener("message", (function(_this) {
        return function(e) {
          return _this._onMsg(e);
        };
      })(this));
      this.worker.addEventListener("error", function(e) {
        return console.log(JSON.stringify(e));
      });
      this.scale = scale = 30;
      this.group = new THREE.Object3D;
      this.chunks = [];
      this.zMin = endZ / scale;
      this.zMax = startZ / scale;
      this.lastChunkZ = 0;
      this.group.scale.set(scale, scale, scale);
      this.ready = false;
      this.taskId2dummyChunks = {};
      this.nextTaskId = 0;
      this.chunkSize = 500;
      this.loadFDL("$3b2o$2bobob2o$2bo5bo$7b2o$b2o$bo5bo$2b2obobo$5b2obo");
    }

    WorkerFlyingCurves.prototype._finishInitialize = function(nCells, fldWidth, fldHeight, chunkLen) {
      var color, i;
      if (this.colors.length !== nCells) {
        this.colors = (function() {
          var _i, _results;
          _results = [];
          for (i = _i = 0; _i < nCells; i = _i += 1) {
            _results.push(palette[i % palette.length]);
          }
          return _results;
        })();
      }
      this.materials = (function() {
        var _i, _len, _ref, _results;
        _ref = this.colors;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          color = _ref[_i];
          _results.push(new THREE.MeshBasicMaterial({
            color: color
          }));
        }
        return _results;
      }).call(this);
      this.group.position.set(-0.5 * fldWidth * this.scale, -0.5 * fldHeight * this.scale, 0);
      this.group.updateMatrix();
      this.ready = true;
      this.chunkLen = chunkLen;
      return console.log("Initializatoin finished");
    };

    WorkerFlyingCurves.prototype._onMsg = function(e) {
      var cmd;
      cmd = e.data.cmd;
      if (cmd == null) {
        console.log("Bad message received! " + (JSON.stringify(e.data)));
        return;
      }
      switch (cmd) {
        case "init":
          return this._finishInitialize(e.data.nCells, e.data.fldWidth, e.data.fldHeight, e.data.chunkLen);
        case "chunk":
          return this._receiveChunk(e.data.blueprint, e.data.taskId);
        default:
          return console.log("Unknown responce " + e.cmd);
      }
    };

    WorkerFlyingCurves.prototype.requestChunk = function() {
      var dummy, taskId;
      taskId = this.nextTaskId;
      this.nextTaskId = (taskId + 1) % 65536;
      this.worker.postMessage({
        cmd: "chunk",
        taskId: taskId
      });
      dummy = new THREE.Object3D;
      this.taskId2dummyChunks[taskId] = dummy;
      return dummy;
    };

    WorkerFlyingCurves.prototype._receiveChunk = function(blueprint, taskId) {
      var chunk, chunkFlybyTime, completionTime, i, nPieces, processPart, processingDelay, timeStart, tubesPerPart;
      chunk = this.taskId2dummyChunks[taskId];
      if (chunk == null) {
        return;
      }
      delete this.taskId2dummyChunks[taskId];
      i = 0;
      chunkFlybyTime = this.chunkLen / stepsPerMs;
      completionTime = Math.min(1000, chunkFlybyTime * 0.75);
      nPieces = completionTime / minTimePerTube | 0;
      nPieces = Math.min(nPieces, blueprint.length);
      tubesPerPart = Math.ceil(blueprint.length / nPieces) | 0;
      nPieces = Math.ceil(blueprint.length / tubesPerPart) | 0;
      processingDelay = completionTime / nPieces;
      timeStart = Date.now();
      processPart = (function(_this) {
        return function() {
          var j, tube, tubeBp, tubeGeom, _i, _ref, _results;
          if (i + tubesPerPart < blueprint.length - 1) {
            setTimeout(processPart, processingDelay);
          }
          _results = [];
          for (j = _i = 0, _ref = Math.min(blueprint.length - 1 - i, tubesPerPart); _i < _ref; j = _i += 1) {
            tubeBp = blueprint[i];
            tubeGeom = _this.createTube(tubeBp);
            tube = new THREE.Mesh(tubeGeom, _this.materials[i]);
            chunk.add(tube);
            _results.push(i += 1);
          }
          return _results;
        };
      })(this);
      processPart();
    };

    WorkerFlyingCurves.prototype.createTube = function(blueprint) {
      var tube;
      tube = new THREE.BufferGeometry();
      tube.addAttribute('position', new THREE.BufferAttribute(blueprint.v, 3));
      tube.addAttribute('index', new THREE.BufferAttribute(blueprint.idx, 1));
      tube.computeBoundingSphere();
      return tube;
    };

    WorkerFlyingCurves.prototype.reset = function() {
      var chunk, _i, _len, _ref;
      this.taskId2dummyChunks = {};
      this.lastChunkZ = 0;
      _ref = this.chunks;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        chunk = _ref[_i];
        this.group.remove(chunk);
      }
    };

    WorkerFlyingCurves.prototype.loadFDL = function(fdlText) {
      var parsed;
      parsed = parseFieldDescriptionlLanguage(fdlText, palette);
      return this.loadPattern(parsed.pattern, parsed.colors);
    };

    WorkerFlyingCurves.prototype.loadPattern = function(pattern, colors) {
      this.reset();
      this.colors = colors;
      return this.worker.postMessage({
        cmd: "init",
        pattern: pattern,
        chunkSize: this.chunkSize,
        skipSteps: 1,
        size: 100
      });
    };

    WorkerFlyingCurves.prototype.step = function(dz) {
      var chunk, i;
      if (!this.ready) {
        return;
      }
      i = 0;
      while (i < this.chunks.length) {
        chunk = this.chunks[i];
        chunk.position.setZ(chunk.position.z - dz);
        if (chunk.position.z < this.zMin) {
          this.chunks.splice(i, 1);
          this.group.remove(chunk);
        } else {
          i += 1;
        }
      }
      this.lastChunkZ -= dz;
      if (this.lastChunkZ < this.zMax) {
        chunk = this.requestChunk();
        this.lastChunkZ += this.chunkLen;
        chunk.position.setZ(this.lastChunkZ);
        this.chunks.push(chunk);
        this.group.add(chunk);
      }
    };

    return WorkerFlyingCurves;

  })();

  init = function() {
    var keys, lines, vd;
    keys = parseUri(window.location).queryKey;
    container = document.getElementById("container");
    if (keys.visibility != null) {
      vd = parseFloat(keys.visibility);
      if (vd > 0 && vd < 1e5) {
        visibilityDistance = vd;
      }
    }
    camera = new THREE.PerspectiveCamera(27, window.innerWidth / window.innerHeight, 1, visibilityDistance * 1.1);
    camera.position.set(300, 0, -1550);
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000505, visibilityDistance * 0.85, visibilityDistance);
    controls = new THREE.TrackballControls(camera);
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 3.2;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.9;
    controls.keys = [65, 83, 68];
    curves = new WorkerFlyingCurves(visibilityDistance, -0.5 * visibilityDistance);
    lines = new THREE.Object3D;
    lines.add(curves.group);
    scene.add(lines);
    renderer = new THREE.WebGLRenderer({
      antialias: keys.antialias === "true"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    container.appendChild(renderer.domElement);
    if (typeof Stats !== "undefined" && Stats !== null) {
      stats = new Stats();
      stats.domElement.style.position = "absolute";
      stats.domElement.style.bottom = "0px";
      container.appendChild(stats.domElement);
    }
    window.addEventListener("resize", onWindowResize, false);
  };

  onWindowResize = function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    controls.handleResize();
  };

  showPatternsWindow = function() {
    var patterns;
    controls.enabled = false;
    patterns = document.getElementById("patterns-window");
    return patterns.style.display = "";
  };

  hidePatternsWindow = function() {
    var patterns;
    controls.enabled = true;
    patterns = document.getElementById("patterns-window");
    return patterns.style.display = "none";
  };

  loadCustomPattern = function() {
    var e;
    try {
      curves.loadFDL(document.getElementById("custom-rle").value);
      return true;
    } catch (_error) {
      e = _error;
      alert("" + e);
      return false;
    }
  };

  bindEvents = function() {
    var E, setSpeed;
    E = function(eid) {
      return document.getElementById(eid);
    };
    setSpeed = function(speed) {
      return function(e) {
        return stepsPerMs = speed * 1e-3;
      };
    };
    E("btn-speed-0").addEventListener("click", setSpeed(0));
    E("btn-speed-1").addEventListener("click", setSpeed(10));
    E("btn-speed-2").addEventListener("click", setSpeed(30));
    E("btn-speed-3").addEventListener("click", setSpeed(100));
    E("btn-speed-4").addEventListener("click", setSpeed(300));
    E("btn-show-patterns").addEventListener("click", showPatternsWindow);
    E("patterns-window").addEventListener("click", function(e) {
      if ((e.target || e.srcElement).id === "patterns-window") {
        return hidePatternsWindow();
      }
    });
    E("btn-close-patterns").addEventListener("click", hidePatternsWindow);
    E("btn-load-custom").addEventListener("click", function(e) {
      if (loadCustomPattern()) {
        return hidePatternsWindow();
      }
    });
    return E("select-pattern").addEventListener("change", function(e) {
      var rle;
      if ((rle = E("select-pattern").value)) {
        curves.loadFDL(rle);
        E("custom-rle").value = rle;
        return hidePatternsWindow();
      }
    });
  };

  initLibrary = function() {
    var fdl, parsed, select, _i, _len, _ref;
    if (window.defaultLibrary != null) {
      select = document.getElementById("select-pattern");
      _ref = window.defaultLibrary;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        fdl = _ref[_i];
        parsed = parseFieldDescriptionlLanguage(fdl, palette);
        select.options[select.options.length] = new Option(parsed.name, fdl);
      }
    }
  };

  prevTime = null;

  animate = function() {
    var dt, time;
    if (requestStop) {
      requestStop = false;
      prevTime = null;
      return;
    }
    requestAnimationFrame(animate);
    render();
    controls.update();
    if (stats != null) {
      stats.update();
    }
    time = Date.now();
    if (prevTime !== null) {
      dt = Math.min(time - prevTime, 100);
      curves.step(stepsPerMs * dt);
    }
    prevTime = time;
  };

  render = function() {
    return renderer.render(scene, camera);
  };

  if (!Detector.webgl) {
    Detector.addGetWebGLMessage();
  }

  bindEvents();

  init();

  initLibrary();

  animate();

}).call(this);

},{"../fdl_parser":2,"../parseuri":3}],2:[function(require,module,exports){
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

},{"./rle":4}],3:[function(require,module,exports){
// Generated by CoffeeScript 1.8.0
(function() {
  var parseUri;

  exports.parseUri = parseUri = function(str) {
    var i, k, m, o, uri, v, _ref;
    o = parseUri.options;
    m = o.parser[(o.strictMode ? "strict" : "loose")].exec(str);
    uri = {};
    i = 14;
    while (i--) {
      uri[o.key[i]] = m[i] || "";
    }
    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function($0, $1, $2) {
      if ($1) {
        return uri[o.q.name][$1] = $2;
      }
    });
    _ref = uri.queryKey;
    for (k in _ref) {
      v = _ref[k];
      uri.queryKey[k] = decodeURIComponent(v);
    }
    return uri;
  };

  parseUri.options = {
    strictMode: false,
    key: ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
    q: {
      name: "queryKey",
      parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
      strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
      loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
  };

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

},{}]},{},[1]);