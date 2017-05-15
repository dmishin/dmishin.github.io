(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var Animator, E, M, appendChain, appendInverseChain, flipSetTimeout, formatString, interpolateHyperbolic, inverseChain, pad, parseIntChecked, ref, ref1, ref2, showNode;

ref = require("./htmlutil.coffee"), E = ref.E, flipSetTimeout = ref.flipSetTimeout;

ref1 = require("./vondyck_chain.coffee"), inverseChain = ref1.inverseChain, appendChain = ref1.appendChain, appendInverseChain = ref1.appendInverseChain, showNode = ref1.showNode;

M = require("./matrix3.coffee");

parseIntChecked = require("./utils.coffee").parseIntChecked;

ref2 = require("./utils.coffee"), formatString = ref2.formatString, pad = ref2.pad;

interpolateHyperbolic = function(T) {
  var Tdist, Tdx, Tdy, Tr, Tr2, Trot, dirX, dirY, ref3;
  ref3 = M.hyperbolicDecompose(T), Trot = ref3[0], Tdx = ref3[1], Tdy = ref3[2];
  Tr2 = Math.pow(Tdx, 2) + Math.pow(Tdy, 2);
  Tdist = Math.acosh(Math.sqrt(Tr2 + 1.0));
  Tr = Math.sqrt(Tr2);
  if (Tr < 1e-6) {
    dirX = 0.0;
    dirY = 0.0;
  } else {
    dirX = Tdx / Tr;
    dirY = Tdy / Tr;
  }
  return function(p) {
    var dist, dx, dy, r, rot;
    rot = Trot * p;
    dist = Tdist * p;
    r = Math.sqrt(Math.pow(Math.cosh(dist), 2) - 1.0);
    dx = r * dirX;
    dy = r * dirY;
    return M.mul(M.translationMatrix(dx, dy), M.rotationMatrix(rot));
  };
};

exports.Animator = Animator = (function() {
  function Animator(application) {
    this.application = application;
    this.oldSize = null;
    this.uploadWorker = null;
    this.busy = false;
    this.reset();
  }

  Animator.prototype.assertNotBusy = function() {
    if (this.busy) {
      throw new Error("Animator is busy");
    }
  };

  Animator.prototype.reset = function() {
    if (this.busy) {
      this.cancelWork();
    }
    this.startChain = null;
    this.startOffset = null;
    this.endChain = null;
    this.endOffset = null;
    return this._updateButtons();
  };

  Animator.prototype._updateButtons = function() {
    E('animate-view-start').disabled = this.startChain === null;
    E('animate-view-end').disabled = this.endChain === null;
    E('btn-upload-animation').disabled = (this.startChain === null) || (this.endChain === null);
    E('btn-animate-cancel').style.display = this.busy ? '' : 'none';
    return E('btn-upload-animation').style.display = !this.busy ? '' : 'none';
  };

  Animator.prototype.setStart = function(observer) {
    this.assertNotBusy();
    this.startChain = observer.getViewCenter();
    this.startOffset = observer.getViewOffsetMatrix();
    return this._updateButtons();
  };

  Animator.prototype.setEnd = function(observer) {
    this.assertNotBusy();
    this.endChain = observer.getViewCenter();
    this.endOffset = observer.getViewOffsetMatrix();
    return this._updateButtons();
  };

  Animator.prototype.viewStart = function(observer) {
    this.assertNotBusy();
    return observer.navigateTo(this.startChain, this.startOffset);
  };

  Animator.prototype.viewEnd = function(observer) {
    this.assertNotBusy();
    return observer.navigateTo(this.endChain, this.endOffset);
  };

  Animator.prototype._setCanvasSize = function() {
    var canvas, size;
    size = parseIntChecked(E('animate-size').value);
    if (size <= 0 || size >= 65536) {
      throw new Error("Size " + size + " is inappropriate");
    }
    this.application.setCanvasResize(true);
    canvas = this.application.getCanvas();
    this.oldSize = [canvas.width, canvas.height];
    return canvas.width = canvas.height = size;
  };

  Animator.prototype._restoreCanvasSize = function() {
    var canvas, ref3;
    if (!this.oldSize) {
      throw new Error("restore withou set");
    }
    canvas = this.application.getCanvas();
    ref3 = this.oldSize, canvas.width = ref3[0], canvas.height = ref3[1];
    this.oldSize = null;
    this.application.setCanvasResize(false);
    return this.application.redraw();
  };

  Animator.prototype._beginWork = function() {
    this.busy = true;
    this._setCanvasSize();
    this._updateButtons();
    return console.log("Started animation");
  };

  Animator.prototype._endWork = function() {
    this._restoreCanvasSize();
    console.log("End animation");
    this.busy = false;
    return this._updateButtons();
  };

  Animator.prototype.cancelWork = function() {
    if (!this.busy) {
      return;
    }
    if (this.uploadWorker) {
      clearTimeout(this.uploadWorker);
    }
    this.uploadWorker = null;
    return this._endWork();
  };

  Animator.prototype.animate = function(observer, stepsPerGen, generations, callback) {
    var Mdelta, T, Tinterp, app, appendRewrite, framesBeforeGeneration, imageNameTemplate, index, inv, totalSteps, uploadStep;
    if (!((this.startChain != null) && (this.endChain != null))) {
      return;
    }
    this.assertNotBusy();
    appendRewrite = this.application.getAppendRewrite();
    inv = function(c) {
      return inverseChain(c, appendRewrite);
    };
    app = function(c1, c2) {
      return appendChain(c1, c2, appendRewrite);
    };
    Mdelta = app(inv(this.endChain), this.startChain).repr(this.application.getGroup());
    T = M.mul(M.mul(this.endOffset, Mdelta), M.hyperbolicInv(this.startOffset));
    Tinterp = interpolateHyperbolic(M.hyperbolicInv(T));
    index = 0;
    totalSteps = generations * stepsPerGen;
    framesBeforeGeneration = stepsPerGen;
    imageNameTemplate = E('upload-name').value;
    this._beginWork();
    uploadStep = (function(_this) {
      return function() {
        var imageName, p;
        _this.uploadWorker = null;
        if (!_this.busy) {
          return;
        }
        _this.application.getObserver().navigateTo(_this.startChain, _this.startOffset);
        p = index / totalSteps;
        _this.application.getObserver().modifyView(M.hyperbolicInv(Tinterp(p)));
        _this.application.drawEverything();
        imageName = formatString(imageNameTemplate, [pad(index, 4)]);
        return _this.application.uploadToServer(imageName, function(ajax) {
          if (!_this.busy) {
            return;
          }
          if (ajax.readyState === XMLHttpRequest.DONE && ajax.status === 200) {
            console.log("Upload success");
            index += 1;
            framesBeforeGeneration -= 1;
            if (framesBeforeGeneration === 0) {
              _this.application.doStep();
              framesBeforeGeneration = stepsPerGen;
            }
            if (index <= totalSteps) {
              console.log("request next frame");
              return _this.uploadWorker = flipSetTimeout(50, uploadStep);
            } else {
              return _this._endWork();
            }
          } else {
            console.log("Upload failure, cancel");
            console.log(ajax.responseText);
            return _this._endWork();
          }
        });
      };
    })(this);
    return uploadStep();
  };

  return Animator;

})();


},{"./htmlutil.coffee":6,"./matrix3.coffee":11,"./utils.coffee":19,"./vondyck_chain.coffee":20}],2:[function(require,module,exports){
"use strict";
var Animator, Application, BinaryTransitionFunc, ButtonGroup, DayNightTransitionFunc, DefaultConfig, DomBuilder, E, FieldObserver, GenerateFileList, GenericTransitionFunc, M, MIN_WIDTH, MouseToolCombo, Navigator, NodeHashMap, OpenDialog, PaintStateSelector, RewriteRuleset, SaveDialog, Tessellation, UriConfig, addClass, appendChain, appendInverseChain, application, autoplayCriticalPopulation, binaryTransitionFunc2GenericCode, canvas, canvasSizeUpdateBlocked, context, dayNightBinaryTransitionFunc2GenericCode, dirty, doCanvasMouseDown, doCanvasMouseMove, doCanvasMouseUp, doClearMemory, doCloseEditor, doDisableGeneric, doEditAsGeneric, doExport, doExportClose, doExportVisible, doImport, doImportCancel, doMemorize, doNavigateHome, doOpenEditor, doRemember, doSetFixedSize, doSetGrid, doSetPanMode, doSetRule, doSetRuleGeneric, doShowImport, doStartPlayer, doStopPlayer, doTogglePlayer, documentWidth, dragHandler, drawEverything, dtMax, eliminateFinalA, encodeVisible, evaluateTotalisticAutomaton, exportField, fpsDefault, fpsLimiting, getAjax, getCanvasCursorPosition, importField, inverseChain, isPanMode, knuthBendix, lastTime, lzw_encode, makeAppendRewrite, memo, minVisibleSize, mooreNeighborhood, mouseMoveReceiver, parseFieldData, parseFloatChecked, parseGenericTransitionFunction, parseIntChecked, parseNode, parseTransitionFunction, parseUri, player, playerTimeout, randomFillFixedNum, randomFillNum, randomFillPercent, randomStateGenerator, redraw, redrawLoop, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, removeClass, serverSupportsUpload, shortcuts, showExporDialog, showNode, stringifyFieldData, toggleCellAt, unity, updateCanvasSize, updateGeneration, updateGenericRuleStatus, updateGrid, updateMemoryButtons, updatePlayButtons, updatePopulation, uploadToServer, vdRule, windowHeight, windowWidth;

Tessellation = require("./hyperbolic_tessellation.coffee").Tessellation;

ref = require("./vondyck_chain.coffee"), unity = ref.unity, inverseChain = ref.inverseChain, appendChain = ref.appendChain, appendInverseChain = ref.appendInverseChain, NodeHashMap = ref.NodeHashMap, showNode = ref.showNode, parseNode = ref.parseNode;

ref1 = require("./vondyck_rewriter.coffee"), makeAppendRewrite = ref1.makeAppendRewrite, vdRule = ref1.vdRule, eliminateFinalA = ref1.eliminateFinalA;

ref2 = require("./knuth_bendix.coffee"), RewriteRuleset = ref2.RewriteRuleset, knuthBendix = ref2.knuthBendix;

ref3 = require("./field.coffee"), stringifyFieldData = ref3.stringifyFieldData, parseFieldData = ref3.parseFieldData, mooreNeighborhood = ref3.mooreNeighborhood, evaluateTotalisticAutomaton = ref3.evaluateTotalisticAutomaton, importField = ref3.importField, randomFillFixedNum = ref3.randomFillFixedNum, exportField = ref3.exportField, randomStateGenerator = ref3.randomStateGenerator;

ref4 = require("./indexeddb.coffee"), OpenDialog = ref4.OpenDialog, SaveDialog = ref4.SaveDialog;

GenerateFileList = require("./indexeddb.coffee").GenerateFileList;

getCanvasCursorPosition = require("./canvas_util.coffee").getCanvasCursorPosition;

lzw_encode = require("./lzw.coffee").lzw_encode;

Navigator = require("./navigator.coffee").Navigator;

DomBuilder = require("./dom_builder.coffee").DomBuilder;

ref5 = require("./htmlutil.coffee"), E = ref5.E, getAjax = ref5.getAjax, ButtonGroup = ref5.ButtonGroup, windowWidth = ref5.windowWidth, windowHeight = ref5.windowHeight, documentWidth = ref5.documentWidth, removeClass = ref5.removeClass, addClass = ref5.addClass;

FieldObserver = require("./observer.coffee").FieldObserver;

ref6 = require("./utils.coffee"), parseIntChecked = ref6.parseIntChecked, parseFloatChecked = ref6.parseFloatChecked;

Animator = require("./animator.coffee").Animator;

MouseToolCombo = require("./mousetool.coffee").MouseToolCombo;

ref7 = require("./rule.coffee"), GenericTransitionFunc = ref7.GenericTransitionFunc, BinaryTransitionFunc = ref7.BinaryTransitionFunc, DayNightTransitionFunc = ref7.DayNightTransitionFunc, binaryTransitionFunc2GenericCode = ref7.binaryTransitionFunc2GenericCode, dayNightBinaryTransitionFunc2GenericCode = ref7.dayNightBinaryTransitionFunc2GenericCode, parseGenericTransitionFunction = ref7.parseGenericTransitionFunction, parseTransitionFunction = ref7.parseTransitionFunction;

parseUri = require("./parseuri.coffee").parseUri;

M = require("./matrix3.coffee");

MIN_WIDTH = 100;

minVisibleSize = 1 / 100;

canvasSizeUpdateBlocked = false;

randomFillNum = 2000;

randomFillPercent = 0.4;

DefaultConfig = (function() {
  function DefaultConfig() {}

  DefaultConfig.prototype.getGrid = function() {
    return [7, 3];
  };

  DefaultConfig.prototype.getCellData = function() {
    return "";
  };

  DefaultConfig.prototype.getGeneration = function() {
    return 0;
  };

  DefaultConfig.prototype.getFunctionCode = function() {
    return "B 3 S 2 3";
  };

  DefaultConfig.prototype.getViewBase = function() {
    return unity;
  };

  DefaultConfig.prototype.getViewOffset = function() {
    return M.eye();
  };

  return DefaultConfig;

})();

UriConfig = (function() {
  function UriConfig() {
    this.keys = parseUri("" + window.location).queryKey;
  }

  UriConfig.prototype.getGrid = function() {
    var e, error, m, match, n;
    if (this.keys.grid != null) {
      try {
        match = this.keys.grid.match(/{(\d+)[,;](\d+)}/);
        if (!match) {
          throw new Error("Syntax is bad: " + this.keys.grid);
        }
        n = parseIntChecked(match[1]);
        m = parseIntChecked(match[2]);
        return [n, m];
      } catch (error) {
        e = error;
        alert("Bad grid paramters: " + this.keys.grid);
      }
    }
    return [7, 3];
  };

  UriConfig.prototype.getCellData = function() {
    return this.keys.cells;
  };

  UriConfig.prototype.getGeneration = function() {
    var e, error;
    if (this.keys.generation != null) {
      try {
        return parseIntChecked(this.keys.generation);
      } catch (error) {
        e = error;
        alert("Bad generationn umber: " + this.keys.generation);
      }
    }
    return 0;
  };

  UriConfig.prototype.getFunctionCode = function() {
    if (this.keys.rule != null) {
      return this.keys.rule.replace(/_/g, ' ');
    } else {
      return "B 3 S 2 3";
    }
  };

  UriConfig.prototype.getViewBase = function() {
    if (this.keys.viewbase == null) {
      return unity;
    }
    return parseNode(this.keys.viewbase);
  };

  UriConfig.prototype.getViewOffset = function() {
    var dx, dy, part, ref8, rot;
    if (this.keys.viewoffset == null) {
      return M.eye();
    }
    ref8 = (function() {
      var i, len, ref8, results;
      ref8 = this.keys.viewoffset.split(':');
      results = [];
      for (i = 0, len = ref8.length; i < len; i++) {
        part = ref8[i];
        results.push(parseFloatChecked(part));
      }
      return results;
    }).call(this), rot = ref8[0], dx = ref8[1], dy = ref8[2];
    return M.mul(M.translationMatrix(dx, dy), M.rotationMatrix(rot));
  };

  return UriConfig;

})();

Application = (function() {
  function Application() {
    this.tessellation = null;
    this.appendRewrite = null;
    this.observer = null;
    this.navigator = null;
    this.animator = null;
    this.cells = null;
    this.generation = 0;
    this.transitionFunc = null;
    this.lastBinaryTransitionFunc = null;
    this.ObserverClass = FieldObserver;
  }

  Application.prototype.getAppendRewrite = function() {
    return this.appendRewrite;
  };

  Application.prototype.setCanvasResize = function(enable) {
    return canvasSizeUpdateBlocked = enable;
  };

  Application.prototype.getCanvasResize = function() {
    return canvasSizeUpdateBlocked;
  };

  Application.prototype.redraw = function() {
    return redraw();
  };

  Application.prototype.getObserver = function() {
    return this.observer;
  };

  Application.prototype.drawEverything = function() {
    return drawEverything();
  };

  Application.prototype.uploadToServer = function(name, cb) {
    return uploadToServer(name, cb);
  };

  Application.prototype.getCanvas = function() {
    return canvas;
  };

  Application.prototype.getGroup = function() {
    return this.tessellation.group;
  };

  Application.prototype.getTransitionFunc = function() {
    return this.transitionFunc;
  };

  Application.prototype.initialize = function(config) {
    var cellData, m, n, ref8, rewriteRuleset;
    if (config == null) {
      config = new DefaultConfig;
    }
    ref8 = config.getGrid(), n = ref8[0], m = ref8[1];
    this.tessellation = new Tessellation(n, m);
    console.log("Running knuth-bendix algorithm....");
    rewriteRuleset = knuthBendix(vdRule(this.getGroup().n, this.getGroup().m));
    console.log("Finished");
    this.appendRewrite = makeAppendRewrite(rewriteRuleset);
    this.getNeighbors = mooreNeighborhood(this.getGroup().n, this.getGroup().m, this.appendRewrite);
    cellData = config.getCellData();
    if (cellData) {
      console.log("import: " + cellData);
      this.importData(cellData);
    } else {
      this.cells = new NodeHashMap;
      this.cells.put(unity, 1);
    }
    this.observer = new this.ObserverClass(this.tessellation, this.appendRewrite, minVisibleSize, config.getViewBase(), config.getViewOffset());
    this.observer.onFinish = function() {
      return redraw();
    };
    this.navigator = new Navigator(this);
    this.animator = new Animator(this);
    this.paintStateSelector = new PaintStateSelector(this, E("state-selector"), E("state-selector-buttons"));
    this.transitionFunc = parseTransitionFunction(config.getFunctionCode(), application.getGroup().n, application.getGroup().m);
    this.lastBinaryTransitionFunc = this.transitionFunc;
    this.openDialog = new OpenDialog(this);
    return this.saveDialog = new SaveDialog(this);
  };

  Application.prototype.setGridImpl = function(n, m) {
    var ref8, rewriteRuleset;
    this.tessellation = new Tessellation(n, m);
    console.log("Running knuth-bendix algorithm for {" + n + ", " + m + "}....");
    rewriteRuleset = knuthBendix(vdRule(this.getGroup().n, this.getGroup().m));
    console.log("Finished");
    this.appendRewrite = makeAppendRewrite(rewriteRuleset);
    this.getNeighbors = mooreNeighborhood(this.getGroup().n, this.getGroup().m, this.appendRewrite);
    this.transitionFunc = parseTransitionFunction(this.transitionFunc.toString(), this.getGroup().n, this.getGroup().m);
    if ((ref8 = this.observer) != null) {
      ref8.shutdown();
    }
    this.observer = new this.ObserverClass(this.tessellation, this.appendRewrite, minVisibleSize);
    this.observer.onFinish = function() {
      return redraw();
    };
    this.navigator.clear();
    doClearMemory();
    return doStopPlayer();
  };

  Application.prototype.doRandomFill = function() {
    randomFillFixedNum(this.cells, randomFillPercent, unity, randomFillNum, this.appendRewrite, this.getGroup().n, this.getGroup().m, randomStateGenerator(this.transitionFunc.numStates));
    updatePopulation();
    return redraw();
  };

  Application.prototype.doStep = function(onFinish) {
    this.transitionFunc.setGeneration(this.generation);
    this.cells = evaluateTotalisticAutomaton(this.cells, this.getNeighbors, this.transitionFunc.evaluate.bind(this.transitionFunc), this.transitionFunc.plus, this.transitionFunc.plusInitial);
    this.generation += 1;
    redraw();
    updatePopulation();
    updateGeneration();
    return typeof onFinish === "function" ? onFinish() : void 0;
  };

  Application.prototype.doReset = function() {
    this.cells = new NodeHashMap;
    this.generation = 0;
    this.cells.put(unity, 1);
    updatePopulation();
    updateGeneration();
    return redraw();
  };

  Application.prototype.doSearch = function() {
    var found;
    found = this.navigator.search(this.cells);
    updateCanvasSize();
    if (found > 0) {
      return this.navigator.navigateToResult(0);
    }
  };

  Application.prototype.importData = function(data) {
    var e, error;
    try {
      console.log("importing " + data);
      this.cells = importField(parseFieldData(data));
      return console.log("Imported " + this.cells.count + " cells");
    } catch (error) {
      e = error;
      alert("Faield to import data: " + e);
      return this.cells = new NodeHashMap;
    }
  };

  Application.prototype.loadData = function(record, cellData) {
    var assert;
    assert = function(x) {
      if (x == null) {
        throw new Error("Assertion failure");
      }
      return x;
    };
    console.dir(record);
    console.log(cellData);
    this.setGridImpl(assert(record.gridN), assert(record.gridM));
    this.animator.reset();
    this.cells = importField(parseFieldData(assert(cellData)));
    this.generation = assert(record.generation);
    this.observer.navigateTo(parseNode(assert(record.base)), assert(record.offset));
    if (record.funcType === "binary") {
      this.transitionFunc = parseTransitionFunction(record.funcId, record.gridN, record.gridM);
      E('rule-entry').value = "" + this.transitionFunc;
    } else if (record.funcType === "cusom") {
      this.transitionFunc = parseGenericTransitionFunction(record.funcId);
    } else {
      throw new Error("unknown TF type " + record.funcType);
    }
    updatePopulation();
    updateGeneration();
    updateGenericRuleStatus();
    return redraw();
  };

  Application.prototype.getSaveData = function(fname) {
    var catalogRecord, fieldData, funcId, funcType;
    fieldData = stringifyFieldData(exportField(application.cells));
    funcId = "" + this.getTransitionFunc();
    funcType = this.getTransitionFunc().getType();
    catalogRecord = {
      gridN: this.getGroup().n,
      gridM: this.getGroup().m,
      name: fname,
      funcId: funcId,
      funcType: funcType,
      base: showNode(this.getObserver().getViewCenter()),
      offset: this.getObserver().getViewOffsetMatrix(),
      size: fieldData.length,
      time: Date.now(),
      field: null,
      generation: this.generation
    };
    return [fieldData, catalogRecord];
  };

  return Application;

})();

updateCanvasSize = function() {
  var canvasRect, containerAvail, docW, h, navWrap, usedWidth, w, winH, winW;
  if (canvasSizeUpdateBlocked) {
    return;
  }
  docW = documentWidth();
  winW = windowWidth();
  if (docW > winW) {
    console.log("overflow");
    usedWidth = docW - canvas.width;
    w = winW - usedWidth;
  } else {
    containerAvail = E('canvas-container').clientWidth;
    w = containerAvail;
  }
  canvasRect = canvas.getBoundingClientRect();
  winH = windowHeight();
  h = winH - canvasRect.top;
  navWrap = E('navigator-wrap');
  navWrap.style.height = (winH - navWrap.getBoundingClientRect().top - 16) + "px";
  w = Math.min(w, h);
  w -= 16;
  w = w & ~15;
  if (w <= MIN_WIDTH) {
    w = MIN_WIDTH;
  }
  if (canvas.width !== w) {
    canvas.width = canvas.height = w;
    redraw();
    E('image-size').value = "" + w;
  }
};

doSetFixedSize = function(isFixed) {
  var size;
  if (isFixed) {
    size = parseIntChecked(E('image-size').value);
    if (size <= 0 || size >= 65536) {
      throw new Error("Bad size: " + size);
    }
    canvasSizeUpdateBlocked = true;
    canvas.width = canvas.height = size;
    return redraw();
  } else {
    canvasSizeUpdateBlocked = false;
    return updateCanvasSize();
  }
};

PaintStateSelector = (function() {
  function PaintStateSelector(application1, container, buttonContainer) {
    this.application = application1;
    this.container = container;
    this.buttonContainer = buttonContainer;
    this.state = 1;
    this.numStates = 2;
  }

  PaintStateSelector.prototype.update = function() {
    var btnId, color, dom, i, id2state, numStates, ref8, state;
    numStates = this.application.getTransitionFunc().numStates;
    if (numStates === this.numStates) {
      return;
    }
    this.numStates = numStates;
    console.log("Num states changed to " + numStates);
    if (this.state >= numStates) {
      this.state = 1;
    }
    this.buttonContainer.innerHTML = '';
    if (numStates <= 2) {
      this.container.style.display = 'none';
      this.buttons = null;
      return this.state2id = null;
    } else {
      this.container.style.display = '';
      dom = new DomBuilder();
      id2state = {};
      this.state2id = {};
      for (state = i = 1, ref8 = numStates; 1 <= ref8 ? i < ref8 : i > ref8; state = 1 <= ref8 ? ++i : --i) {
        color = this.application.observer.getColorForState(state);
        btnId = "select-state-" + state;
        this.state2id[state] = btnId;
        id2state[btnId] = state;
        dom.tag('button').store('btn').CLASS(state === this.state ? 'btn-selected' : '').ID(btnId).a('style', "background-color:" + color).text('' + state).end();
      }
      this.buttonContainer.appendChild(dom.finalize());
      this.buttons = new ButtonGroup(this.buttonContainer, 'button');
      return this.buttons.addEventListener('change', (function(_this) {
        return function(e, btnId, oldBtn) {
          if ((state = id2state[btnId]) != null) {
            return _this.state = state;
          }
        };
      })(this));
    }
  };

  PaintStateSelector.prototype.setState = function(newState) {
    if (newState === this.state) {
      return;
    }
    if (this.state2id[newState] == null) {
      return;
    }
    this.state = newState;
    if (this.buttons) {
      return this.buttons.setButton(this.state2id[newState]);
    }
  };

  return PaintStateSelector;

})();

serverSupportsUpload = function() {
  return (("" + window.location).match(/:8000\//)) && true;
};

if (serverSupportsUpload()) {
  console.log("Enable upload");
  E('animate-controls').style.display = '';
}

canvas = E("canvas");

context = canvas.getContext("2d");

application = new Application;

application.initialize(new UriConfig);

dragHandler = null;

player = null;

playerTimeout = 500;

autoplayCriticalPopulation = 90000;

doStartPlayer = function() {
  var runPlayerStep;
  if (player != null) {
    return;
  }
  runPlayerStep = function() {
    if (application.cells.count >= autoplayCriticalPopulation) {
      alert("Population reached " + application.cells.count + ", stopping auto-play");
      player = null;
    } else {
      player = setTimeout((function() {
        return application.doStep(runPlayerStep);
      }), playerTimeout);
    }
    return updatePlayButtons();
  };
  return runPlayerStep();
};

doStopPlayer = function() {
  if (player) {
    clearTimeout(player);
    player = null;
    return updatePlayButtons();
  }
};

doTogglePlayer = function() {
  if (player) {
    return doStopPlayer();
  } else {
    return doStartPlayer();
  }
};

updateGenericRuleStatus = function(status) {
  var span;
  span = E('generic-tf-status');
  span.innerHTML = status;
  return span.setAttribute('class', 'generic-tf-status-#{status.toLowerCase()}');
};

updatePlayButtons = function() {
  E('btn-play-start').style.display = player ? "none" : '';
  return E('btn-play-stop').style.display = !player ? "none" : '';
};

dirty = true;

redraw = function() {
  return dirty = true;
};

drawEverything = function() {
  var s;
  if (!application.observer.canDraw()) {
    return false;
  }
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  s = Math.min(canvas.width, canvas.height) / 2;
  context.scale(s, s);
  context.translate(1, 1);
  context.fillStyle = "black";
  context.lineWidth = 1.0 / s;
  context.strokeStyle = "rgb(128,128,128)";
  application.observer.draw(application.cells, context);
  context.restore();
  return true;
};

fpsLimiting = true;

lastTime = Date.now();

fpsDefault = 30;

dtMax = 1000.0 / fpsDefault;

redrawLoop = function() {
  var t, tDraw;
  if (dirty) {
    if (!fpsLimiting || ((t = Date.now()) - lastTime > dtMax)) {
      if (drawEverything()) {
        tDraw = Date.now() - t;
        dtMax = dtMax * 0.9 + tDraw * 2 * 0.1;
        dirty = false;
      }
      lastTime = t;
    }
  }
  return requestAnimationFrame(redrawLoop);
};

toggleCellAt = function(x, y) {
  var cell, e, error, s, xp, yp;
  s = Math.min(canvas.width, canvas.height) * 0.5;
  xp = x / s - 1;
  yp = y / s - 1;
  try {
    cell = application.observer.cellFromPoint(xp, yp);
  } catch (error) {
    e = error;
    return;
  }
  if (application.cells.get(cell) === application.paintStateSelector.state) {
    application.cells.remove(cell);
  } else {
    application.cells.put(cell, application.paintStateSelector.state);
  }
  return redraw();
};

isPanMode = true;

doCanvasMouseDown = function(e) {
  var isPanAction, ref8, x, y;
  E('canvas-container').focus();
  if (e.button === 2) {
    return;
  }
  if (typeof canvas.setCapture === "function") {
    canvas.setCapture(true);
  }
  e.preventDefault();
  ref8 = getCanvasCursorPosition(e, canvas), x = ref8[0], y = ref8[1];
  isPanAction = (e.button === 1) ^ e.shiftKey ^ isPanMode;
  console.log("Pan: " + isPanAction);
  if (!isPanAction) {
    toggleCellAt(x, y);
    return updatePopulation();
  } else {
    return dragHandler = new MouseToolCombo(application, x, y);
  }
};

doSetPanMode = function(mode) {
  var bedit, bpan;
  isPanMode = mode;
  bpan = E('btn-mode-pan');
  bedit = E('btn-mode-edit');
  removeClass(bpan, 'button-active');
  removeClass(bedit, 'button-active');
  return addClass((isPanMode ? bpan : bedit), 'button-active');
};

doCanvasMouseMove = function(e) {
  var isPanAction;
  isPanAction = e.shiftKey ^ isPanMode;
  E('canvas-container').style.cursor = isPanAction ? 'move' : 'default';
  if (dragHandler !== null) {
    e.preventDefault();
    return dragHandler.mouseMoved(e);
  }
};

doCanvasMouseUp = function(e) {
  if (dragHandler !== null) {
    e.preventDefault();
    if (dragHandler != null) {
      dragHandler.mouseUp(e);
    }
    return dragHandler = null;
  }
};

doSetRule = function() {
  var e, error, ref8;
  try {
    application.transitionFunc = parseTransitionFunction(E('rule-entry').value, application.getGroup().n, application.getGroup().m);
    application.lastBinaryTransitionFunc = application.transitionFunc;
    application.paintStateSelector.update(application.transitionFunc);
    console.log(application.transitionFunc);
  } catch (error) {
    e = error;
    alert("Failed to parse function: " + e);
    application.transitionFunc = (ref8 = application.lastBinaryTransitionFunc) != null ? ref8 : application.transitionFunc;
  }
  E('controls-rule-simple').style.display = "";
  return E('controls-rule-generic').style.display = "none";
};

doOpenEditor = function() {
  return E('generic-tf-editor').style.display = '';
};

doCloseEditor = function() {
  return E('generic-tf-editor').style.display = 'none';
};

doSetRuleGeneric = function() {
  var e, error;
  try {
    console.log("Set generic rule");
    application.transitionFunc = parseGenericTransitionFunction(E('generic-tf-code').value);
    updateGenericRuleStatus('Compiled');
    application.paintStateSelector.update(application.transitionFunc);
    E('controls-rule-simple').style.display = "none";
    return E('controls-rule-generic').style.display = "";
  } catch (error) {
    e = error;
    alert("Failed to parse function: " + e);
    return updateGenericRuleStatus('Error');
  }
};

doSetGrid = function() {
  var e, error, m, n;
  try {
    n = parseInt(E('entry-n').value, 10);
    m = parseInt(E('entry-m').value, 10);
    if (Number.isNaN(n) || n <= 0) {
      throw new Error("Parameter N is bad");
    }
    if (Number.isNaN(m) || m <= 0) {
      throw new Error("Parameter M is bad");
    }
    if (2 * (n + m) >= n * m) {
      throw new Error("Tessellation {" + n + "; " + m + "} is not hyperbolic and not supported.");
    }
  } catch (error) {
    e = error;
    alert("" + e);
    return;
  }
  application.setGridImpl(n, m);
  application.doReset();
  return application.animator.reset();
};

updateGrid = function() {
  E('entry-n').value = "" + application.getGroup().n;
  E('entry-m').value = "" + application.getGroup().m;
};

updatePopulation = function() {
  return E('population').innerHTML = "" + application.cells.count;
};

updateGeneration = function() {
  return E('generation').innerHTML = "" + application.generation;
};

doExport = function() {
  var data;
  data = stringifyFieldData(exportField(application.cells));
  return showExporDialog(data);
};

doExportClose = function() {
  return E('export-dialog').style.display = 'none';
};

uploadToServer = function(imgname, callback) {
  var cb, dataURL;
  dataURL = canvas.toDataURL();
  cb = function(blob) {
    var ajax, formData;
    formData = new FormData();
    formData.append("file", blob, imgname);
    ajax = getAjax();
    ajax.open('POST', '/uploads/', false);
    ajax.onreadystatechange = function() {
      return callback(ajax);
    };
    return ajax.send(formData);
  };
  return canvas.toBlob(cb, "image/png");
};

memo = null;

doMemorize = function() {
  memo = {
    cells: application.cells.copy(),
    viewCenter: application.observer.getViewCenter(),
    viewOffset: application.observer.getViewOffsetMatrix(),
    generation: application.generation
  };
  console.log("Position memoized");
  return updateMemoryButtons();
};

doRemember = function() {
  if (memo === null) {
    return console.log("nothing to remember");
  } else {
    application.cells = memo.cells.copy();
    application.generation = memo.generation;
    application.observer.navigateTo(memo.viewCenter, memo.viewOffset);
    updatePopulation();
    return updateGeneration();
  }
};

doClearMemory = function() {
  memo = null;
  return updateMemoryButtons();
};

updateMemoryButtons = function() {
  return E('btn-mem-get').disabled = E('btn-mem-clear').disabled = memo === null;
};

encodeVisible = function() {
  var cell, i, iCenter, len, ref8, ref9, state, translatedCell, visibleCells;
  iCenter = inverseChain(application.observer.cellFromPoint(0, 0), application.appendRewrite);
  visibleCells = new NodeHashMap;
  ref8 = application.observer.visibleCells(application.cells);
  for (i = 0, len = ref8.length; i < len; i++) {
    ref9 = ref8[i], cell = ref9[0], state = ref9[1];
    translatedCell = appendChain(iCenter, cell, application.appendRewrite);
    translatedCell = eliminateFinalA(translatedCell, application.appendRewrite, application.getGroup().n);
    visibleCells.put(translatedCell, state);
  }
  return exportField(visibleCells);
};

showExporDialog = function(sdata) {
  E('export').value = sdata;
  E('export-dialog').style.display = '';
  E('export').focus();
  return E('export').select();
};

doExportVisible = function() {
  return showExporDialog(stringifyFieldData(encodeVisible()));
};

doShowImport = function() {
  E('import-dialog').style.display = '';
  return E('import').focus();
};

doImportCancel = function() {
  E('import-dialog').style.display = 'none';
  return E('import').value = '';
};

doImport = function() {
  var e, error;
  try {
    application.importData(E('import').value);
    updatePopulation();
    redraw();
    E('import-dialog').style.display = 'none';
    return E('import').value = '';
  } catch (error) {
    e = error;
    return alert("Error parsing: " + e);
  }
};

doEditAsGeneric = function() {
  var code;
  console.log("Generate code");
  if (application.transitionFunc instanceof BinaryTransitionFunc) {
    code = binaryTransitionFunc2GenericCode(application.transitionFunc);
  } else if (application.transitionFunc instanceof DayNightTransitionFunc) {
    code = dayNightBinaryTransitionFunc2GenericCode(application.transitionFunc);
  } else {
    alert("Active transition function is not a binary");
    return;
  }
  E('generic-tf-code').value = code;
  updateGenericRuleStatus("modified");
  return doSetRuleGeneric();
};

doDisableGeneric = function() {
  return doSetRule();
};

doNavigateHome = function() {
  return application.observer.navigateTo(unity);
};

E("btn-reset").addEventListener("click", function() {
  return application.doReset();
});

E("btn-step").addEventListener("click", function() {
  return application.doStep();
});

mouseMoveReceiver = E("canvas-container");

mouseMoveReceiver.addEventListener("mousedown", doCanvasMouseDown);

mouseMoveReceiver.addEventListener("mouseup", doCanvasMouseUp);

mouseMoveReceiver.addEventListener("mousemove", doCanvasMouseMove);

mouseMoveReceiver.addEventListener("mousedrag", doCanvasMouseMove);

E("btn-set-rule").addEventListener("click", doSetRule);

E("rule-entry").addEventListener("change", doSetRule);

E("btn-set-rule-generic").addEventListener("click", function(e) {
  doSetRuleGeneric();
  return doCloseEditor();
});

E("btn-rule-generic-close-editor").addEventListener("click", doCloseEditor);

E("btn-set-grid").addEventListener("click", doSetGrid);

E("btn-export").addEventListener("click", doExport);

E('btn-search').addEventListener('click', function() {
  return application.doSearch();
});

E('btn-random').addEventListener('click', function() {
  return application.doRandomFill();
});

E('btn-rule-make-generic').addEventListener('click', doEditAsGeneric);

E('btn-edit-rule').addEventListener('click', doOpenEditor);

E('btn-disable-generic-rule').addEventListener('click', doDisableGeneric);

E('btn-export-close').addEventListener('click', doExportClose);

E('btn-import').addEventListener('click', doShowImport);

E('btn-import-cancel').addEventListener('click', doImportCancel);

E('btn-import-run').addEventListener('click', doImport);

E('btn-mem-set').addEventListener('click', doMemorize);

E('btn-mem-get').addEventListener('click', doRemember);

E('btn-mem-clear').addEventListener('click', doClearMemory);

E('btn-exp-visible').addEventListener('click', doExportVisible);

E('btn-nav-home').addEventListener('click', doNavigateHome);

window.addEventListener('resize', updateCanvasSize);

E('btn-nav-clear').addEventListener('click', function(e) {
  return application.navigator.clear();
});

E('btn-play-start').addEventListener('click', doTogglePlayer);

E('btn-play-stop').addEventListener('click', doTogglePlayer);

E('animate-set-start').addEventListener('click', function() {
  return application.animator.setStart(application.observer);
});

E('animate-set-end').addEventListener('click', function() {
  return application.animator.setEnd(application.observer);
});

E('animate-view-start').addEventListener('click', function() {
  return application.animator.viewStart(application.observer);
});

E('animate-view-end').addEventListener('click', function() {
  return application.animator.viewEnd(application.observer);
});

E('btn-upload-animation').addEventListener('click', function(e) {
  return application.animator.animate(application.observer, parseIntChecked(E('animate-frame-per-generation').value), parseIntChecked(E('animate-generations').value), (function() {
    return null;
  }));
});

E('btn-animate-cancel').addEventListener('click', function(e) {
  return application.animator.cancelWork();
});

E('view-straighten').addEventListener('click', function(e) {
  return application.observer.straightenView();
});

E('view-straighten').addEventListener('click', function(e) {
  return application.observer.straightenView();
});

E('image-fix-size').addEventListener('click', function(e) {
  return doSetFixedSize(E('image-fix-size').checked);
});

E('image-size').addEventListener('change', function(e) {
  E('image-fix-size').checked = true;
  return doSetFixedSize(true);
});

E('btn-mode-edit').addEventListener('click', function(e) {
  return doSetPanMode(false);
});

E('btn-mode-pan').addEventListener('click', function(e) {
  return doSetPanMode(true);
});

E('btn-db-save').addEventListener('click', function(e) {
  return application.saveDialog.show();
});

E('btn-db-load').addEventListener('click', function(e) {
  return application.openDialog.show();
});

shortcuts = {
  'N': function() {
    return application.doStep();
  },
  'C': function() {
    return application.doReset();
  },
  'S': function() {
    return application.doSearch();
  },
  'R': function() {
    return application.doRandomFill();
  },
  '1': function(e) {
    return application.paintStateSelector.setState(1);
  },
  '2': function(e) {
    return application.paintStateSelector.setState(2);
  },
  '3': function(e) {
    return application.paintStateSelector.setState(3);
  },
  '4': function(e) {
    return application.paintStateSelector.setState(4);
  },
  '5': function(e) {
    return application.paintStateSelector.setState(5);
  },
  'M': doMemorize,
  'U': doRemember,
  'UA': doClearMemory,
  'H': doNavigateHome,
  'G': doTogglePlayer,
  'SA': function(e) {
    return application.observer.straightenView();
  },
  '#32': doTogglePlayer,
  'P': function(e) {
    return doSetPanMode(true);
  },
  'E': function(e) {
    return doSetPanMode(false);
  },
  'SC': function(e) {
    return application.saveDialog.show();
  },
  'OC': function(e) {
    return application.openDialog.show();
  }
};

document.addEventListener("keydown", function(e) {
  var focused, handler, keyCode, ref8;
  focused = document.activeElement;
  if (focused && ((ref8 = focused.tagName.toLowerCase()) === 'textarea' || ref8 === 'input')) {
    return;
  }
  keyCode = e.keyCode > 32 && e.keyCode < 128 ? String.fromCharCode(e.keyCode) : '#' + e.keyCode;
  if (e.ctrlKey) {
    keyCode += "C";
  }
  if (e.altKey) {
    keyCode += "A";
  }
  if (e.shiftKey) {
    keyCode += "S";
  }
  console.log(keyCode);
  if ((handler = shortcuts[keyCode]) != null) {
    e.preventDefault();
    return handler(e);
  }
});

E('rule-entry').value = application.transitionFunc.toString();

doSetPanMode(true);

updatePopulation();

updateGeneration();

updateCanvasSize();

updateGrid();

updateMemoryButtons();

updatePlayButtons();

redrawLoop();


},{"./animator.coffee":1,"./canvas_util.coffee":3,"./dom_builder.coffee":4,"./field.coffee":5,"./htmlutil.coffee":6,"./hyperbolic_tessellation.coffee":7,"./indexeddb.coffee":8,"./knuth_bendix.coffee":9,"./lzw.coffee":10,"./matrix3.coffee":11,"./mousetool.coffee":12,"./navigator.coffee":13,"./observer.coffee":14,"./parseuri.coffee":15,"./rule.coffee":17,"./utils.coffee":19,"./vondyck_chain.coffee":20,"./vondyck_rewriter.coffee":21}],3:[function(require,module,exports){
exports.getCanvasCursorPosition = function(e, canvas) {
  var rect;
  if (e.type === "touchmove" || e.type === "touchstart" || e.type === "touchend") {
    e = e.touches[0];
  }
  if (e.clientX != null) {
    rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }
};


},{}],4:[function(require,module,exports){
var DomBuilder;

exports.DomBuilder = DomBuilder = (function() {
  function DomBuilder(tag) {
    var root;
    if (tag == null) {
      tag = null;
    }
    this.root = root = tag === null ? document.createDocumentFragment() : document.createElement(tag);
    this.current = this.root;
    this.vars = {};
  }

  DomBuilder.prototype.tag = function(name) {
    var e;
    this.current.appendChild(e = document.createElement(name));
    this.current = e;
    return this;
  };

  DomBuilder.prototype.store = function(varname) {
    this.vars[varname] = this.current;
    return this;
  };

  DomBuilder.prototype.rtag = function(var_name, name) {
    this.tag(name);
    return this.store(var_name);
  };

  DomBuilder.prototype.end = function() {
    var cur;
    this.current = cur = this.current.parentNode;
    if (cur === null) {
      throw new Error("Too many end()'s");
    }
    return this;
  };

  DomBuilder.prototype.text = function(txt) {
    this.current.appendChild(document.createTextNode(txt));
    return this;
  };

  DomBuilder.prototype.a = function(name, value) {
    this.current.setAttribute(name, value);
    return this;
  };

  DomBuilder.prototype.append = function(elementReference) {
    this.current.appendChild(elementReference);
    return this;
  };

  DomBuilder.prototype.DIV = function() {
    return this.tag("div");
  };

  DomBuilder.prototype.A = function() {
    return this.tag("a");
  };

  DomBuilder.prototype.SPAN = function() {
    return this.tag("span");
  };

  DomBuilder.prototype.ID = function(id) {
    return this.a("id", id);
  };

  DomBuilder.prototype.CLASS = function(cls) {
    return this.a("class", cls);
  };

  DomBuilder.prototype.finalize = function() {
    var r;
    r = this.root;
    this.root = this.current = this.vars = null;
    return r;
  };

  return DomBuilder;

})();


},{}],5:[function(require,module,exports){
var NodeHashMap, eliminateFinalA, evaluateTotalisticAutomaton, extractClusterAt, farNeighborhood, forFarNeighborhood, importFieldTo, makeAppendRewrite, mooreNeighborhood, neighborsSum, newNode, node2array, ref, ref1, showNode, unity;

ref = require("./vondyck_chain.coffee"), unity = ref.unity, NodeHashMap = ref.NodeHashMap, newNode = ref.newNode, showNode = ref.showNode, node2array = ref.node2array;

ref1 = require("./vondyck_rewriter.coffee"), makeAppendRewrite = ref1.makeAppendRewrite, eliminateFinalA = ref1.eliminateFinalA;

exports.mooreNeighborhood = mooreNeighborhood = function(n, m, appendRewrite) {
  return function(chain) {
    var i, j, k, nStep, neigh, neighbors, powerA, powerB, ref2, ref3;
    neighbors = new Array(n * (m - 2));
    i = 0;
    for (powerA = j = 0, ref2 = n; j < ref2; powerA = j += 1) {
      for (powerB = k = 1, ref3 = m - 1; k < ref3; powerB = k += 1) {
        nStep = powerA ? [['b', powerB], ['a', powerA]] : [['b', powerB]];
        neigh = eliminateFinalA(appendRewrite(chain, nStep), appendRewrite, n);
        neighbors[i] = neigh;
        i += 1;
      }
    }
    return neighbors;
  };
};

exports.neighborsSum = neighborsSum = function(cells, getNeighbors, plus, plusInitial) {
  var sums;
  if (plus == null) {
    plus = (function(x, y) {
      return x + y;
    });
  }
  if (plusInitial == null) {
    plusInitial = 0;
  }
  sums = new NodeHashMap;
  cells.forItems(function(cell, value) {
    var j, len, neighbor, ref2;
    ref2 = getNeighbors(cell);
    for (j = 0, len = ref2.length; j < len; j++) {
      neighbor = ref2[j];
      sums.putAccumulate(neighbor, value, plus, plusInitial);
    }
    if (sums.get(cell) === null) {
      return sums.put(cell, plusInitial);
    }
  });
  return sums;
};

exports.evaluateTotalisticAutomaton = evaluateTotalisticAutomaton = function(cells, getNeighborhood, nextStateFunc, plus, plusInitial) {
  var newCells, sums;
  newCells = new NodeHashMap;
  sums = neighborsSum(cells, getNeighborhood, plus, plusInitial);
  sums.forItems(function(cell, neighSum) {
    var cellState, nextState, ref2;
    cellState = (ref2 = cells.get(cell)) != null ? ref2 : 0;
    nextState = nextStateFunc(cellState, neighSum);
    if (nextState !== 0) {
      return newCells.put(cell, nextState);
    }
  });
  return newCells;
};

exports.farNeighborhood = farNeighborhood = function(center, r, appendRewrite, n, m) {
  var cell, cells, getCellList, getNeighbors, i, j, k, l, len, len1, nei, ref2, ref3, ref4;
  cells = new NodeHashMap;
  cells.put(center, true);
  getNeighbors = mooreNeighborhood(n, m, appendRewrite);
  getCellList = function(cells) {
    var cellList;
    cellList = [];
    cells.forItems(function(cell, state) {
      return cellList.push(cell);
    });
    return cellList;
  };
  for (i = j = 0, ref2 = r; j < ref2; i = j += 1) {
    ref3 = getCellList(cells);
    for (k = 0, len = ref3.length; k < len; k++) {
      cell = ref3[k];
      ref4 = getNeighbors(cell);
      for (l = 0, len1 = ref4.length; l < len1; l++) {
        nei = ref4[l];
        cells.put(nei, true);
      }
    }
  }
  return getCellList(cells);
};

exports.forFarNeighborhood = forFarNeighborhood = function(center, appendRewrite, n, m, callback) {
  var cell, cells, getNeighbors, j, k, l, len, len1, len2, neighCell, newLayer, prevLayer, radius, ref2, thisLayer;
  getNeighbors = mooreNeighborhood(n, m, appendRewrite);
  cells = new NodeHashMap;
  cells.put(center, true);
  thisLayer = [center];
  prevLayer = [];
  radius = 0;
  if (!callback(center, radius)) {
    return;
  }
  while (true) {
    radius += 1;
    newLayer = [];
    for (j = 0, len = thisLayer.length; j < len; j++) {
      cell = thisLayer[j];
      ref2 = getNeighbors(cell);
      for (k = 0, len1 = ref2.length; k < len1; k++) {
        neighCell = ref2[k];
        if (!cells.get(neighCell)) {
          newLayer.push(neighCell);
          cells.put(neighCell, true);
          if (!callback(neighCell, radius)) {
            return;
          }
        }
      }
    }
    for (l = 0, len2 = prevLayer.length; l < len2; l++) {
      cell = prevLayer[l];
      if (!cells.remove(cell)) {
        throw new Error("Assertion failed: cell not present");
      }
    }
    prevLayer = thisLayer;
    thisLayer = newLayer;
  }
};

exports.extractClusterAt = extractClusterAt = function(cells, getNeighbors, chain) {
  var c, cluster, j, len, neighbor, ref2, stack;
  stack = [chain];
  cluster = [];
  while (stack.length > 0) {
    c = stack.pop();
    if (cells.get(c) === null) {
      continue;
    }
    cells.remove(c);
    cluster.push(c);
    ref2 = getNeighbors(c);
    for (j = 0, len = ref2.length; j < len; j++) {
      neighbor = ref2[j];
      if (cells.get(neighbor) !== null) {
        stack.push(neighbor);
      }
    }
  }
  return cluster;
};

exports.allClusters = function(cells, n, m, appendRewrite) {
  var cellsCopy, clusters, getNeighbors;
  cellsCopy = cells.copy();
  clusters = [];
  getNeighbors = mooreNeighborhood(n, m, appendRewrite);
  cells.forItems(function(chain, value) {
    if (cellsCopy.get(chain) !== null) {
      return clusters.push(extractClusterAt(cellsCopy, getNeighbors, chain));
    }
  });
  return clusters;
};

exports.exportField = function(cells) {
  var chain2treeNode, putChain, root;
  root = {};
  chain2treeNode = new NodeHashMap;
  chain2treeNode.put(unity, root);
  putChain = function(chain) {
    var node, parentNode;
    node = chain2treeNode.get(chain);
    if (node === null) {
      parentNode = putChain(chain.t);
      node = {};
      node[chain.letter] = chain.p;
      if (parentNode.cs != null) {
        parentNode.cs.push(node);
      } else {
        parentNode.cs = [node];
      }
      chain2treeNode.put(chain, node);
    }
    return node;
  };
  cells.forItems(function(chain, value) {
    return putChain(chain).v = value;
  });
  return root;
};

exports.importFieldTo = importFieldTo = function(fieldData, callback) {
  var putNode;
  putNode = function(rootChain, rootNode) {
    var childNode, j, len, ref2;
    if (rootNode.v != null) {
      callback(rootChain, rootNode.v);
    }
    if (rootNode.cs != null) {
      ref2 = rootNode.cs;
      for (j = 0, len = ref2.length; j < len; j++) {
        childNode = ref2[j];
        if (childNode.a != null) {
          putNode(newNode('a', childNode.a, rootChain), childNode);
        } else if (childNode.b != null) {
          putNode(newNode('b', childNode.b, rootChain), childNode);
        } else {
          throw new Error("Node has neither A nor B generator");
        }
      }
    }
  };
  return putNode(unity, fieldData);
};

exports.importField = function(fieldData, cells) {
  if (cells == null) {
    cells = new NodeHashMap;
  }
  importFieldTo(fieldData, function(chain, value) {
    return cells.put(chain, value);
  });
  return cells;
};

exports.randomStateGenerator = function(nStates) {
  return function() {
    return (Math.floor(Math.random() * (nStates - 1)) | 0) + 1;
  };
};

exports.randomFill = function(field, density, center, r, appendRewrite, n, m, randomState) {
  var cell, j, len, ref2;
  if (density < 0 || density > 1.0) {
    throw new Error("Density must be in [0;1]");
  }
  randomState = randomState != null ? randomState : function() {
    return 1;
  };
  ref2 = farNeighborhood(center, r, appendRewrite, n, m);
  for (j = 0, len = ref2.length; j < len; j++) {
    cell = ref2[j];
    if (Math.random() < density) {
      field.put(cell, randomState());
    }
  }
};

exports.randomFillFixedNum = function(field, density, center, numCells, appendRewrite, n, m, randomState) {
  var visited;
  if (density < 0 || density > 1.0) {
    throw new Error("Density must be in [0;1]");
  }
  randomState = randomState != null ? randomState : function() {
    return 1;
  };
  visited = 0;
  forFarNeighborhood(center, appendRewrite, n, m, function(cell, _) {
    if (visited >= numCells) {
      return false;
    }
    if (Math.random() < density) {
      field.put(cell, randomState());
    }
    visited += 1;
    return true;
  });
};

exports.stringifyFieldData = function(data) {
  var doStringify, parts;
  parts = [];
  doStringify = function(data) {
    var child, gen, j, len, pow, ref2, results;
    if (data.v != null) {
      parts.push("|" + data.v);
    }
    if (data.cs != null) {
      ref2 = data.cs;
      results = [];
      for (j = 0, len = ref2.length; j < len; j++) {
        child = ref2[j];
        parts.push('(');
        if (child.a != null) {
          gen = 'a';
          pow = child.a;
        } else if (child.b != null) {
          gen = 'b';
          pow = child.b;
        } else {
          throw new Error("bad data, neither a nor b");
        }
        if (pow < 0) {
          gen = gen.toUpperCase();
          pow = -pow;
        }
        parts.push(gen);
        if (pow !== 1) {
          parts.push("" + pow);
        }
        doStringify(child);
        results.push(parts.push(')'));
      }
      return results;
    }
  };
  doStringify(data);
  return parts.join("");
};

exports.parseFieldData = function(text) {
  var allRes, awaitChar, integer, parseChildSpec, parseValueSpec, pos, skipSpaces;
  integer = function(text, pos) {
    var c, getResult, sign, value;
    sign = 1;
    value = '';
    getResult = function() {
      var v;
      if (value === '') {
        return null;
      } else {
        v = sign * parseInt(value, 10);
        return [v, pos];
      }
    };
    while (true) {
      if (pos >= text.length) {
        return getResult();
      }
      c = text[pos];
      if (c === '-') {
        sign = -sign;
      } else if (c >= '0' && c <= '9') {
        value += c;
      } else {
        return getResult();
      }
      pos += 1;
    }
  };
  skipSpaces = function(text, pos) {
    var ref2;
    while (pos < text.length && ((ref2 = text[pos]) === ' ' || ref2 === '\t' || ref2 === '\r' || ref2 === '\n')) {
      pos += 1;
    }
    return pos;
  };
  awaitChar = function(char, text, pos) {
    var c;
    pos = skipSpaces(text, pos);
    if (pos >= text.length) {
      return null;
    }
    c = text[pos];
    pos += 1;
    if (c !== char) {
      return null;
    }
    return pos;
  };
  parseChildSpec = function(text, pos) {
    var gen, genLower, power, powerRes, powerSign, value, valueRes;
    pos = awaitChar('(', text, pos);
    if (pos === null) {
      return null;
    }
    pos = skipSpaces(text, pos);
    if (pos >= text.length) {
      return null;
    }
    gen = text[pos];
    pos += 1;
    if (gen !== 'a' && gen !== 'b' && gen !== 'A' && gen !== 'B') {
      return null;
    }
    genLower = gen.toLowerCase();
    powerSign = genLower === gen ? 1 : -1;
    gen = genLower;
    pos = skipSpaces(text, pos);
    powerRes = integer(text, pos);
    if (powerRes === null) {
      power = 1;
    } else {
      power = powerRes[0], pos = powerRes[1];
    }
    power *= powerSign;
    pos = skipSpaces(text, pos);
    valueRes = parseValueSpec(text, pos);
    if (valueRes === null) {
      return null;
    }
    value = valueRes[0], pos = valueRes[1];
    value[gen] = power;
    pos = skipSpaces(text, pos);
    pos = awaitChar(')', text, pos);
    if (pos === null) {
      return null;
    }
    return [value, pos];
  };
  parseValueSpec = function(text, pos) {
    var childRes, children, intResult, pos1, value;
    value = {};
    pos = skipSpaces(text, pos);
    pos1 = awaitChar('|', text, pos);
    if (pos1 !== null) {
      pos = pos1;
      intResult = integer(text, pos);
      if (intResult !== null) {
        value.v = intResult[0], pos = intResult[1];
      }
    }
    children = [];
    while (true) {
      childRes = parseChildSpec(text, pos);
      if (childRes === null) {
        break;
      }
      children.push(childRes[0]);
      pos = childRes[1];
    }
    if (children.length > 0) {
      value.cs = children;
    }
    return [value, pos];
  };
  allRes = parseValueSpec(text, 0);
  if (allRes === null) {
    throw new Error("Faield to parse!");
  }
  pos = allRes[1];
  pos = skipSpaces(text, pos);
  if (pos !== text.length) {
    throw new Error("garbage after end");
  }
  return allRes[0];
};


/*        
"""
exports.parseFieldData1 = (data) ->
  #data format (separators not included) is:
   *
   * text ::= value_spec
   * value_spec ::= [value]? ( '(' child_spec ')' )*
   * value ::= integer
   * child_spec ::= generator power value_spec
   * generator ::= a | b
   * power ::= integer
   *
   *

  #parser returns either null or pair:
   *  (parse result, next position)
   *
   * optional combinator
   * parse result is value of the inner parser or null
   * always succeeds
   *
  optional = (parser) -> (text, start) ->
    parsed = parser(text, start)
    if parsed is null
      [null, start]
    else
      parsed


  literal = (lit) -> (text, pos) ->
    for lit_i, i in lit
      if pos+i >= text.length
        return null
      if text[pos+i] isnt lit_i
        return null
    return [lit, pos+lit.length]

  oneOf = (parsers...) -> (text, pos) ->
    for p in parsers
      res = p(text,pos)
      return res if res isnt null
    return null
    
  word = (allowedChars) ->
    charSet = {}
    for c in allowedChars
      charSet[c] = true
    return (text, start) ->
      parseResult = ""
      pos = start
      while pos < text.length
        c = text[pos]
        if charSet.hasOwnProperty c
          parseResult += c
          pos += 1
        else
          break
      if parseResult is ""
        null
      else

  seq = (parsers) -> (text, pos) ->
    results = []
    for p in parsers
      r = p(text, pos)
      if r isnt null
        results.push r
        pos = r[1]
      else
        return null
    return [results, pos]
    
  map = (parser, func) -> (text, pos) ->
    r = parser(text, pos)
    return null if r is null
    return [func(r[0]), r[1]]
    
  integer = seq( optional(literal('-')), word('123456789')
  integer = map( parseInteger, [sign, digits]->
    parseInt((sign or '')+digits, 10) )

    
    
  parseInteger = (text, start) ->
    hasSign = false
    """
 */


},{"./vondyck_chain.coffee":20,"./vondyck_rewriter.coffee":21}],6:[function(require,module,exports){
var ButtonGroup, Debouncer, E, addClass, idOrNull, removeClass;

exports.flipSetTimeout = function(t, cb) {
  return setTimeout(cb, t);
};

exports.E = E = function(id) {
  return document.getElementById(id);
};

exports.removeClass = removeClass = function(e, c) {
  var ci;
  return e.className = ((function() {
    var j, len1, ref, results;
    ref = e.className.split(" ");
    results = [];
    for (j = 0, len1 = ref.length; j < len1; j++) {
      ci = ref[j];
      if (c !== ci) {
        results.push(ci);
      }
    }
    return results;
  })()).join(" ");
};

exports.addClass = addClass = function(e, c) {
  var classes;
  return e.className = (classes = e.className) === "" ? c : classes + " " + c;
};

idOrNull = function(elem) {
  if (elem === null) {
    return null;
  } else {
    return elem.getAttribute("id");
  }
};

exports.ButtonGroup = ButtonGroup = (function() {
  function ButtonGroup(containerElem, tag, selectedId, selectedClass) {
    var btn, j, len1, ref;
    if (selectedId == null) {
      selectedId = null;
    }
    this.selectedClass = selectedClass != null ? selectedClass : "btn-selected";
    if (selectedId !== null) {
      addClass((this.selected = E(selectedId)), this.selectedClass);
    } else {
      this.selected = null;
    }
    this.handlers = {
      change: []
    };
    ref = containerElem.getElementsByTagName(tag);
    for (j = 0, len1 = ref.length; j < len1; j++) {
      btn = ref[j];
      btn.addEventListener("click", this._btnClickListener(btn));
    }
    return;
  }

  ButtonGroup.prototype._changeActiveButton = function(newBtn, e) {
    var handler, j, len1, newId, oldBtn, oldId, ref;
    newId = idOrNull(newBtn);
    oldBtn = this.selected;
    oldId = idOrNull(oldBtn);
    if (newId !== oldId) {
      if (oldBtn !== null) {
        removeClass(oldBtn, this.selectedClass);
      }
      if (newBtn !== null) {
        addClass(newBtn, this.selectedClass);
      }
      this.selected = newBtn;
      ref = this.handlers.change;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        handler = ref[j];
        handler(e, newId, oldId);
      }
    }
  };

  ButtonGroup.prototype._btnClickListener = function(newBtn) {
    return (function(_this) {
      return function(e) {
        return _this._changeActiveButton(newBtn, e);
      };
    })(this);
  };

  ButtonGroup.prototype.addEventListener = function(name, handler) {
    var handlers;
    if ((handlers = this.handlers[name]) == null) {
      throw new Error("Hander " + name + " is not supported");
    }
    return handlers.push(handler);
  };

  ButtonGroup.prototype.setButton = function(newId) {
    if (newId === null) {
      return this._changeActiveButton(null, null);
    } else {
      return this._changeActiveButton(document.getElementById(newId), null);
    }
  };

  return ButtonGroup;

})();

exports.windowWidth = function() {
  return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
};

exports.windowHeight = function() {
  return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
};

exports.documentWidth = function() {
  return document.documentElement.scrollWidth || document.body.scrollWidth;
};

if (HTMLCanvasElement.prototype.toBlob == null) {
  Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
    value: function(callback, type, quality) {
      var arr, binStr, i, j, len, ref;
      binStr = atob(this.toDataURL(type, quality).split(',')[1]);
      len = binStr.length;
      arr = new Uint8Array(len);
      for (i = j = 0, ref = len; j < ref; i = j += 1) {
        arr[i] = binStr.charCodeAt(i);
      }
      return callback(new Blob([arr], {
        type: type || 'image/png'
      }));
    }
  });
}

exports.Debouncer = Debouncer = (function() {
  function Debouncer(timeout, callback1) {
    this.timeout = timeout;
    this.callback = callback1;
    this.timer = null;
  }

  Debouncer.prototype.fire = function() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    return this.timer = setTimeout(((function(_this) {
      return function() {
        return _this.onTimer();
      };
    })(this)), this.timeout);
  };

  Debouncer.prototype.onTimer = function() {
    this.timer = null;
    return this.callback();
  };

  return Debouncer;

})();

exports.getAjax = function() {
  if (window.XMLHttpRequest != null) {
    return new XMLHttpRequest();
  } else if (window.ActiveXObject != null) {
    return new ActiveXObject("Microsoft.XMLHTTP");
  }
};


},{}],7:[function(require,module,exports){
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


},{"./matrix3.coffee":11,"./triangle_group_representation.coffee":18}],8:[function(require,module,exports){
var DomBuilder, E, GenerateFileList, M, OpenDialog, SaveDialog, VERSION, addClass, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8, removeClass, upgradeNeeded;

ref = require("./htmlutil.coffee"), E = ref.E, removeClass = ref.removeClass, addClass = ref.addClass;

DomBuilder = require("./dom_builder.coffee").DomBuilder;

M = require("./matrix3.coffee");

VERSION = 1;

window.indexedDB = (ref1 = (ref2 = (ref3 = window.indexedDB) != null ? ref3 : window.mozIndexedDB) != null ? ref2 : window.webkitIndexedDB) != null ? ref1 : window.msIndexedDB;

window.IDBTransaction = (ref4 = (ref5 = (ref6 = window.IDBTransaction) != null ? ref6 : window.webkitIDBTransaction) != null ? ref5 : window.msIDBTransaction) != null ? ref4 : {
  READ_WRITE: "readwrite"
};

window.IDBKeyRange = (ref7 = (ref8 = window.IDBKeyRange) != null ? ref8 : window.webkitIDBKeyRange) != null ? ref7 : window.msIDBKeyRange;

exports.hasDbSupport = function() {
  return window.indexedDB != null;
};

upgradeNeeded = function(e) {
  var catalogStore, db;
  console.log("Upgrade !");
  db = e.target.result;
  if (db.objectStoreNames.contains("files")) {
    console.log("Dropping files...");
    db.deleteObjectStore("files");
  }
  if (db.objectStoreNames.contains("catalog")) {
    console.log("Dropping catalog");
    db.deleteObjectStore("catalog");
  }
  console.log("Create files and database store");
  db.createObjectStore("files", {
    autoIncrement: true
  });
  catalogStore = db.createObjectStore("catalog", {
    autoIncrement: true
  });
  return catalogStore.createIndex("catalogByGrid", ['gridN', 'gridM', 'funcId', 'name', 'time'], {
    unique: false
  });
};

exports.OpenDialog = OpenDialog = (function() {
  function OpenDialog(application) {
    this.application = application;
    this.container = E('file-dialog-open');
    this.btnCancel = E('btn-files-cancel');
    this.filelistElement = E('file-dialog-files');
    this.btnAllGrids = E('toggle-all-grids');
    this.btnAllRules = E('toggle-all-rules');
    this.btnDelete = E('btn-files-delete');
    this.allGridsEnabled = false;
    this.allRuelsEnabled = false;
    this.fileList = null;
    this.btnAllRules.addEventListener('click', (function(_this) {
      return function(e) {
        return _this._toggleAllRules();
      };
    })(this));
    this.btnAllGrids.addEventListener('click', (function(_this) {
      return function(e) {
        return _this._toggleAllGrids();
      };
    })(this));
    this.btnCancel.addEventListener('click', (function(_this) {
      return function(e) {
        return _this.close();
      };
    })(this));
    this.btnDelete.addEventListener('click', (function(_this) {
      return function(e) {
        return _this._deleteSelected();
      };
    })(this));
  }

  OpenDialog.prototype._deleteSelected = function() {
    var ids;
    ids = this.fileList.selectedIds();
    if (!ids) {
      alert("No files selected");
      return;
    }
    if (!confirm("Are you sure to delete " + ids.length + " files?")) {
      return;
    }
    return this._deleteIds(ids);
  };

  OpenDialog.prototype._deleteIds = function(ids) {
    return indexedDB.open("SavedFields", VERSION).onsuccess = (function(_this) {
      return function(e) {
        var catalog, db, doDelete, files, idx, request;
        db = e.target.result;
        request = db.transaction(["catalog", "files"], "readwrite");
        catalog = request.objectStore("catalog");
        files = request.objectStore("files");
        idx = 0;
        doDelete = function() {
          var catalogKey, record, ref9, rq;
          ref9 = ids[idx], catalogKey = ref9[0], record = ref9[1];
          return rq = catalog["delete"](catalogKey).onsuccess = function(e) {
            return files["delete"](record.field).onsuccess = function(e) {
              idx += 1;
              if (idx >= ids.length) {
                return console.log("Deleted selected fiels");
              } else {
                return doDelete();
              }
            };
          };
        };
        request.oncomplete = function(e) {
          return _this._generateFileList();
        };
        return doDelete();
      };
    })(this);
  };

  OpenDialog.prototype.show = function() {
    this._updateUI();
    this.container.style.display = '';
    return this._generateFileList();
  };

  OpenDialog.prototype._generateFileList = function() {
    var grid, rule;
    this.filelistElement.innerHTML = '<img src="media/hrz-spinner.gif"/>';
    grid = this.allGridsEnabled ? null : [this.application.getGroup().n, this.application.getGroup().m];
    rule = this.allGridsEnabled || this.allRuelsEnabled ? null : "" + this.application.getTransitionFunc();
    return this.fileList = new GenerateFileList(grid, rule, this.filelistElement, (function(_this) {
      return function(fileRecord, fileData) {
        return _this._loadFile(fileRecord, fileData);
      };
    })(this), (function(_this) {
      return function() {
        return _this._fileListReady();
      };
    })(this));
  };

  OpenDialog.prototype._loadFile = function(fileRecord, fileData) {
    this.application.loadData(fileRecord, fileData);
    return this.close();
  };

  OpenDialog.prototype._fileListReady = function() {
    return console.log("File list ready");
  };

  OpenDialog.prototype.close = function() {
    return this.container.style.display = 'none';
  };

  OpenDialog.prototype._updateUI = function() {
    this.btnAllRules.disabled = this.allGridsEnabled;
    removeClass(this.btnAllGrids, 'button-active');
    removeClass(this.btnAllRules, 'button-active');
    if (this.allGridsEnabled) {
      addClass(this.btnAllGrids, 'button-active');
    }
    if (this.allRuelsEnabled || this.allGridsEnabled) {
      return addClass(this.btnAllRules, 'button-active');
    }
  };

  OpenDialog.prototype._toggleAllGrids = function() {
    this.allGridsEnabled = !this.allGridsEnabled;
    this._updateUI();
    return this._generateFileList();
  };

  OpenDialog.prototype._toggleAllRules = function() {
    this.allRuelsEnabled = !this.allRuelsEnabled;
    this._updateUI();
    return this._generateFileList();
  };

  return OpenDialog;

})();

exports.SaveDialog = SaveDialog = (function() {
  function SaveDialog(application) {
    this.application = application;
    this.container = E('file-dialog-save');
    this.btnCancel = E('btn-files-save-cancel');
    this.btnSave = E('file-dialog-save-btn');
    this.fldName = E('file-dialog-save-as');
    this.filelistElement = E('file-dialog-save-files');
    this.allGridsEnabled = false;
    this.allRuelsEnabled = false;
    this.btnCancel.addEventListener('click', (function(_this) {
      return function(e) {
        return _this.close();
      };
    })(this));
    this.btnSave.addEventListener('click', (function(_this) {
      return function(e) {
        return _this.save();
      };
    })(this));
  }

  SaveDialog.prototype.show = function() {
    this._updateUI();
    this.container.style.display = '';
    this._generateFileList();
    this.fldName.focus();
    return this.fldName.select();
  };

  SaveDialog.prototype._updateUI = function() {};

  SaveDialog.prototype._generateFileList = function() {
    var fileListGen, grid, rule;
    this.filelistElement.innerHTML = '<img src="media/hrz-spinner.gif"/>';
    grid = [this.application.getGroup().n, this.application.getGroup().m];
    rule = "" + this.application.getTransitionFunc();
    return fileListGen = new GenerateFileList(grid, rule, this.filelistElement, (function(_this) {
      return function(fileRecord, fileData) {
        return _this._loadFile(fileRecord, fileData);
      };
    })(this), (function(_this) {
      return function() {
        return _this._fileListReady();
      };
    })(this));
  };

  SaveDialog.prototype._fileListReady = function() {
    return console.log("list ready");
  };

  SaveDialog.prototype.close = function() {
    return this.container.style.display = 'none';
  };

  SaveDialog.prototype.save = function() {
    var catalogRecord, fieldData, fname, ref9, request;
    console.log("Saving!");
    fname = this.fldName.value;
    if (!fname) {
      alert("File name can not be empty");
      return;
    }
    ref9 = this.application.getSaveData(fname), fieldData = ref9[0], catalogRecord = ref9[1];
    request = window.indexedDB.open("SavedFields", VERSION);
    request.onupgradeneeded = upgradeNeeded;
    request.onerror = (function(_this) {
      return function(e) {
        return console.log("DB error: " + e.target.errorCode);
      };
    })(this);
    return request.onsuccess = (function(_this) {
      return function(e) {
        var db, rqStoreData, transaction;
        db = e.target.result;
        transaction = db.transaction(["files", "catalog"], "readwrite");
        rqStoreData = transaction.objectStore("files").add(fieldData);
        rqStoreData.onerror = function(e) {
          return console.log("Error storing data " + e.target.error);
        };
        return rqStoreData.onsuccess = function(e) {
          var key, rqStoreCatalog;
          key = e.target.result;
          catalogRecord.field = key;
          rqStoreCatalog = transaction.objectStore("catalog").add(catalogRecord);
          rqStoreCatalog.onerror = function(e) {
            return console.log("Error storing catalog record " + e.target.error);
          };
          return rqStoreCatalog.onsuccess = function(e) {
            return _this.fileSaved();
          };
        };
      };
    })(this);
  };

  SaveDialog.prototype.fileSaved = function() {
    console.log("File saved OK");
    return this.close();
  };

  return SaveDialog;

})();

GenerateFileList = (function() {
  function GenerateFileList(grid, rule, container, fileCallback, readyCallback) {
    var request;
    this.container = container;
    this.fileCallback = fileCallback;
    this.readyCallback = readyCallback;
    self.db = null;
    this.status = "working";
    this.recordId2Controls = {};
    request = window.indexedDB.open("SavedFields", VERSION);
    request.onupgradeneeded = upgradeNeeded;
    request.onerror = (function(_this) {
      return function(e) {
        console.log("DB error: " + e.target.errorCode);
        return _this.status = "error";
      };
    })(this);
    request.onsuccess = (function(_this) {
      return function(e) {
        _this.db = e.target.result;
        console.log("Success");
        if (grid === null) {
          console.log("Loading whole list");
          return _this.loadData();
        } else {
          console.log("Loading data: {" + grid[0] + ";" + grid[1] + "}, rule='" + rule + "'");
          return _this.loadDataFor(grid[0], grid[1], rule);
        }
      };
    })(this);
  }

  GenerateFileList.prototype.selectAll = function() {
    var _, controls, ref9, results;
    ref9 = this.recordId2Controls;
    results = [];
    for (_ in ref9) {
      controls = ref9[_];
      results.push(controls.check.checked = true);
    }
    return results;
  };

  GenerateFileList.prototype.selectNone = function() {
    var _, controls, ref9, results;
    ref9 = this.recordId2Controls;
    results = [];
    for (_ in ref9) {
      controls = ref9[_];
      results.push(controls.check.checked = true);
    }
    return results;
  };

  GenerateFileList.prototype.selectedIds = function() {
    var controls, id, ref9, results;
    ref9 = this.recordId2Controls;
    results = [];
    for (id in ref9) {
      controls = ref9[id];
      if (controls.check.checked) {
        results.push([id | 0, controls.record]);
      }
    }
    return results;
  };

  GenerateFileList.prototype.loadFromCursor = function(cursor, predicate) {
    var closeFuncGroup, closeGridGroup, dom, filesEnumerated, lastFunc, lastGrid, onRecord, startFuncGroup, startGridGroup;
    dom = new DomBuilder();
    startGridGroup = function(gridName) {
      return dom.tag("div").CLASS("files-grid-group").tag("h1").text("Grid: " + gridName).end();
    };
    closeGridGroup = function() {
      return dom.end();
    };
    startFuncGroup = function(funcType, funcId) {
      var funcName;
      funcName = funcType + ": " + funcId;
      return dom.tag("div").CLASS("files-func-group").tag("h2").text("Rule: " + funcName).end().tag("table").tag("thead").tag("tr").tag("th").text('#').end().tag("th").text("Name").end().tag("th").text("Time").end().end().end().tag("tbody");
    };
    closeFuncGroup = function() {
      return dom.end().end().end();
    };
    lastGrid = null;
    lastFunc = null;
    filesEnumerated = 0;
    onRecord = (function(_this) {
      return function(res, record) {
        var grid;
        grid = "{" + record.gridN + ";" + record.gridM + "}";
        if (grid !== lastGrid) {
          if (lastFunc !== null) {
            closeFuncGroup();
          }
          if (lastGrid !== null) {
            closeGridGroup();
          }
          startGridGroup(grid);
          lastGrid = grid;
          lastFunc = null;
        }
        if (record.funcId !== lastFunc) {
          if (lastFunc !== null) {
            closeFuncGroup();
          }
          startFuncGroup(record.funcType, record.funcId);
          lastFunc = record.funcId;
        }
        dom.tag('tr').tag('td').rtag('filesel', 'input').a('type', 'checkbox').end().end().tag('td').rtag('alink', 'a').a('href', "#load" + record.name).text(res.value.name).end().end().tag('td').text((new Date(res.value.time)).toLocaleString()).end().end();
        dom.vars.alink.addEventListener("click", (function(key) {
          return function(e) {
            e.preventDefault();
            return _this.clickedFile(key);
          };
        })(record));
        return _this.recordId2Controls[res.primaryKey] = {
          check: dom.vars.filesel,
          record: record
        };
      };
    })(this);
    return cursor.onsuccess = (function(_this) {
      return function(e) {
        var record, res;
        res = e.target.result;
        if (res) {
          filesEnumerated += 1;
          record = res.value;
          if (predicate(record)) {
            onRecord(res, record);
          }
          return res["continue"]();
        } else {
          if (lastFunc !== null) {
            closeFuncGroup();
          }
          if (lastGrid !== null) {
            closeGridGroup();
          }
          _this.container.innerHTML = "";
          _this.container.appendChild(dom.finalize());
          console.log("Enumerated " + filesEnumerated + " files");
          return _this.readyCallback();
        }
      };
    })(this);
  };

  GenerateFileList.prototype.clickedFile = function(catalogRecord) {
    var filesStore, request, transaction;
    console.log("Load key " + (JSON.stringify(catalogRecord)));
    transaction = this.db.transaction(["files"], "readonly");
    filesStore = transaction.objectStore("files");
    request = filesStore.get(catalogRecord.field);
    request.onerror = function(e) {
      return console.log("Failed to load file " + catalogRecord.field);
    };
    return request.onsuccess = (function(_this) {
      return function(e) {
        var res;
        res = e.target.result;
        return _this.fileCallback(catalogRecord, res);
      };
    })(this);
  };

  GenerateFileList.prototype.loadData = function() {
    var cursor, filesStore, transaction;
    console.log("Loaddata");
    transaction = this.db.transaction(["catalog"], "readonly");
    filesStore = transaction.objectStore("catalog");
    cursor = filesStore.index("catalogByGrid").openCursor();
    return this.loadFromCursor(cursor, function(rec) {
      return true;
    });
  };

  GenerateFileList.prototype.loadDataFor = function(gridN, gridM, funcId) {
    var catalog, catalogIndex, cursor, transaction;
    transaction = this.db.transaction(["catalog"], "readonly");
    catalog = transaction.objectStore("catalog");
    catalogIndex = catalog.index("catalogByGrid");
    cursor = catalogIndex.openCursor();
    return this.loadFromCursor(cursor, function(rec) {
      return (rec.gridN === gridN) && (rec.gridM === gridM) && ((funcId === null) || (rec.funcId === funcId));
    });
  };

  return GenerateFileList;

})();


},{"./dom_builder.coffee":4,"./htmlutil.coffee":6,"./matrix3.coffee":11}],9:[function(require,module,exports){
var RewriteRuleset, findOverlap, knuthBendixCompletion, le2cmp, overlap, print, shortLex, simplifyRules, sortPairReverse, splitBy,
  slice = [].slice;

print = function() {
  var s;
  s = 1 <= arguments.length ? slice.call(arguments, 0) : [];
  return console.log(s.join(" "));
};

le2cmp = function(leFunc) {
  return function(a, b) {
    if (a === b) {
      return 0;
    } else if (leFunc(a, b)) {
      return -1;
    } else {
      return 1;
    }
  };
};

exports.RewriteRuleset = RewriteRuleset = (function() {
  function RewriteRuleset(rules) {
    this.rules = rules;
  }

  RewriteRuleset.prototype.pprint = function() {
    var j, len, ref, ref1, v, w;
    print("{");
    ref = this._sortedItems();
    for (j = 0, len = ref.length; j < len; j++) {
      ref1 = ref[j], v = ref1[0], w = ref1[1];
      print("  " + v + " -> " + w);
    }
    return print("}");
  };

  RewriteRuleset.prototype.copy = function() {
    return new RewriteRuleset(JSON.parse(JSON.stringify(this.rules)));
  };

  RewriteRuleset.prototype._sortedItems = function() {
    var items;
    items = this.items();
    items.sort(le2cmp(shortLex));
    return items;
  };

  RewriteRuleset.prototype.suffices = function() {
    var k, results;
    results = [];
    for (k in this.rules) {
      results.push(k);
    }
    return results;
  };

  RewriteRuleset.prototype.size = function() {
    return this.suffices().length;
  };

  RewriteRuleset.prototype.items = function() {
    var k, ref, results, v;
    ref = this.rules;
    results = [];
    for (k in ref) {
      v = ref[k];
      results.push([k, v]);
    }
    return results;
  };

  RewriteRuleset.prototype.__equalOneSided = function(other) {
    var k, ref, v;
    ref = this.rules;
    for (k in ref) {
      v = ref[k];
      if (other.rules[k] !== v) {
        return false;
      }
    }
    return true;
  };

  RewriteRuleset.prototype.equals = function(other) {
    return this.__equalOneSided(other) && other.__equalOneSided(this);
  };

  RewriteRuleset.prototype.add = function(v, w) {
    return this.rules[v] = w;
  };

  RewriteRuleset.prototype.remove = function(v) {
    return delete this.rules[v];
  };

  RewriteRuleset.prototype.normalize = function(lessOrEq) {
    var SS, ref, ref1, v, w;
    SS = {};
    ref = this.rules;
    for (v in ref) {
      w = ref[v];
      ref1 = sortPairReverse(v, w, lessOrEq), v = ref1[0], w = ref1[1];
      if (SS[v] == null) {
        SS[v] = w;
      } else {
        SS[v] = sortPairReverse(w, SS[v], lessOrEq)[1];
      }
    }
    return new RewriteRuleset(SS);
  };

  RewriteRuleset.prototype.__ruleLengths = function() {
    var k, lens, lenslist;
    lens = {};
    for (k in this.rules) {
      lens[k.length] = null;
    }
    lenslist = (function() {
      var results;
      results = [];
      for (k in lens) {
        results.push(parseInt(k, 10));
      }
      return results;
    })();
    lenslist.sort();
    return lenslist;
  };

  RewriteRuleset.prototype.appendRewrite = function(s, xs_) {
    var i, j, l, len, lengths, ref, rewriteAs, rules, suffix, suffixLen, xs;
    rules = this.rules;
    if (xs_.length === 0) {
      return s;
    }
    xs = xs_.split("");
    xs.reverse();
    lengths = this.__ruleLengths();
    while (xs.length > 0) {
      s = s + xs.pop();
      for (j = 0, len = lengths.length; j < len; j++) {
        suffixLen = lengths[j];
        suffix = s.substring(s.length - suffixLen);
        rewriteAs = rules[suffix];
        if (rewriteAs != null) {
          s = s.substring(0, s.length - suffixLen);
          for (i = l = ref = rewriteAs.length - 1; l >= 0; i = l += -1) {
            xs.push(rewriteAs[i]);
          }
          continue;
        }
      }
    }
    return s;
  };

  RewriteRuleset.prototype.has = function(key) {
    return this.rules.hasOwnProperty(key);
  };

  RewriteRuleset.prototype.rewrite = function(s) {
    return this.appendRewrite("", s);
  };

  return RewriteRuleset;

})();

exports.shortLex = shortLex = function(s1, s2) {
  if (s1.length > s2.length) {
    return false;
  }
  if (s1.length < s2.length) {
    return true;
  }
  return s1 <= s2;
};

exports.overlap = overlap = function(s1, s2) {
  var i, i1, i2, istart, j, ref, ref1, ref2, s1_i, s2_0;
  if (s2.length === 0) {
    return [s1, "", s2];
  }
  ref = [0, 0], i1 = ref[0], i2 = ref[1];
  s2_0 = s2[0];
  istart = Math.max(0, s1.length - s2.length);
  for (i = j = ref1 = istart, ref2 = s1.length; ref1 <= ref2 ? j < ref2 : j > ref2; i = ref1 <= ref2 ? ++j : --j) {
    s1_i = s1[i];
    if (s1_i === s2_0) {
      if (s1.substring(i + 1) === s2.substring(1, s1.length - i)) {
        return [s1.substring(0, i), s1.substring(i), s2.substring(s1.length - i)];
      }
    }
  }
  return [s1, "", s2];
};

exports.splitBy = splitBy = function(s1, s2) {
  var i, j, ref;
  if (s2.length === 0) {
    [true, s1, ""];
  }
  for (i = j = 0, ref = s1.length - s2.length + 1; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
    if (s1.substring(i, i + s2.length) === s2) {
      return [true, s1.substring(0, i), s1.substring(i + s2.length)];
    }
  }
  return [false, null, null];
};

sortPairReverse = function(a, b, lessOrEq) {
  if (lessOrEq(a, b)) {
    return [b, a];
  } else {
    return [a, b];
  }
};

findOverlap = function(v1, w1, v2, w2) {
  var hasSplit, ref, ref1, x, y, z;
  ref = overlap(v1, v2), x = ref[0], y = ref[1], z = ref[2];
  if (y) {
    return [true, x + w2, w1 + z];
  }
  ref1 = splitBy(v1, v2), hasSplit = ref1[0], x = ref1[1], z = ref1[2];
  if (hasSplit) {
    return [true, w1, x + w2 + z];
  }
  return [false, null, null];
};

knuthBendixCompletion = function(S, lessOrEqual) {
  var SS, hasOverlap, j, l, len, len1, ref, ref1, ref2, ref3, ref4, ref5, s1, s2, t1, t2, v1, v2, w1, w2;
  SS = S.copy();
  ref = S.items();
  for (j = 0, len = ref.length; j < len; j++) {
    ref1 = ref[j], v1 = ref1[0], w1 = ref1[1];
    ref2 = S.items();
    for (l = 0, len1 = ref2.length; l < len1; l++) {
      ref3 = ref2[l], v2 = ref3[0], w2 = ref3[1];
      ref4 = findOverlap(v1, w1, v2, w2), hasOverlap = ref4[0], s1 = ref4[1], s2 = ref4[2];
      if (hasOverlap) {
        t1 = S.rewrite(s1);
        t2 = S.rewrite(s2);
        if (t1 !== t2) {
          ref5 = sortPairReverse(t1, t2, lessOrEqual), t1 = ref5[0], t2 = ref5[1];
          SS.add(t1, t2);
        }
      }
    }
  }
  return SS;
};

simplifyRules = function(S_, lessOrEqual) {
  var S, Slist, addBack, ref, v, vv, vw, vw1, w, ww;
  S = S_.copy();
  Slist = S_.items();
  while (Slist.length > 0) {
    ref = vw = Slist.pop(), v = ref[0], w = ref[1];
    S.remove(v);
    vv = S.rewrite(vw[0]);
    ww = S.rewrite(vw[1]);
    addBack = true;
    if (vv === ww) {
      addBack = false;
    } else {
      vw1 = sortPairReverse(vv, ww, lessOrEqual);
      if (vw1[0] !== vw[0] && vw1[1] !== vw[1]) {
        S.add.apply(S, vw1);
        Slist.push(vw1);
        addBack = false;
      }
    }
    if (addBack) {
      S.add(v, w);
    }
  }
  return S;
};

exports.knuthBendix = function(S0, lessOrEqual, maxIters, maxRulesetSize, onIteration) {
  var S, SS, SSS, i, j, ref;
  if (lessOrEqual == null) {
    lessOrEqual = shortLex;
  }
  if (maxIters == null) {
    maxIters = 1000;
  }
  if (maxRulesetSize == null) {
    maxRulesetSize = 1000;
  }
  if (onIteration == null) {
    onIteration = null;
  }
  S = S0.normalize(lessOrEqual);
  for (i = j = 0, ref = maxIters; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
    if (S.size() > maxRulesetSize) {
      throw new Error("Ruleset grew too big");
    }
    SS = simplifyRules(S, lessOrEqual);
    SSS = knuthBendixCompletion(SS, lessOrEqual);
    if (SSS.equals(S)) {
      return SSS;
    }
    if (onIteration != null) {
      onIteration(i, S);
    }
    S = SSS;
  }
  throw new Error("Iterations exceeded");
};


},{}],10:[function(require,module,exports){
exports.lzw_encode = function(s) {
  var code, currChar, data, dict, i, out, phrase;
  if (s === "") {
    return "";
  }
  dict = {};
  data = s;
  out = [];
  currChar = void 0;
  phrase = data[0];
  code = 256;
  i = 1;
  while (i < data.length) {
    currChar = data[i];
    if (dict[phrase + currChar] != null) {
      phrase += currChar;
    } else {
      out.push(String.fromCharCode((phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0))));
      dict[phrase + currChar] = code;
      code++;
      phrase = currChar;
    }
    i++;
  }
  out.push(String.fromCharCode((phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0))));
  i = 0;
  return out.join("");
};

exports.lzw_decode = function(s) {
  var code, currChar, currCode, data, dict, i, oldPhrase, out, phrase;
  if (s === "") {
    return "";
  }
  dict = {};
  data = s;
  currChar = data[0];
  oldPhrase = currChar;
  out = [currChar];
  code = 256;
  phrase = void 0;
  i = 1;
  while (i < data.length) {
    currCode = data[i].charCodeAt(0);
    if (currCode < 256) {
      phrase = data[i];
    } else {
      phrase = (dict[currCode] ? dict[currCode] : oldPhrase + currChar);
    }
    out.push(phrase);
    currChar = phrase.charAt(0);
    dict[code] = oldPhrase + currChar;
    code++;
    oldPhrase = phrase;
    i++;
  }
  return out.join("");
};


},{}],11:[function(require,module,exports){
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


},{}],12:[function(require,module,exports){
var Debouncer, M, MouseTool, MouseToolCombo, getCanvasCursorPosition,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

M = require("./matrix3.coffee");

getCanvasCursorPosition = require("./canvas_util.coffee").getCanvasCursorPosition;

Debouncer = require("./htmlutil.coffee").Debouncer;

exports.MouseTool = MouseTool = (function() {
  function MouseTool(application1) {
    this.application = application1;
  }

  MouseTool.prototype.mouseMoved = function() {};

  MouseTool.prototype.mouseUp = function() {};

  MouseTool.prototype.mouseDown = function() {};

  MouseTool.prototype.moveView = function(dx, dy) {
    return this.application.getObserver().modifyView(M.translationMatrix(dx, dy));
  };

  MouseTool.prototype.rotateView = function(angle) {
    return this.application.getObserver().modifyView(M.rotationMatrix(angle));
  };

  return MouseTool;

})();

exports.MouseToolCombo = MouseToolCombo = (function(superClass) {
  extend(MouseToolCombo, superClass);

  function MouseToolCombo(application, x0, y0) {
    var canvas;
    this.x0 = x0;
    this.y0 = y0;
    MouseToolCombo.__super__.constructor.call(this, application);
    canvas = this.application.getCanvas();
    this.xc = canvas.width * 0.5;
    this.yc = canvas.width * 0.5;
    this.angle0 = this.angle(this.x0, this.y0);
  }

  MouseToolCombo.prototype.angle = function(x, y) {
    return Math.atan2(x - this.xc, y - this.yc);
  };

  MouseToolCombo.prototype.mouseMoved = function(e) {
    var canvas, dAngle, dx, dy, k, mv, newAngle, q, r, r2, ref, rt, x, y;
    canvas = this.application.getCanvas();
    ref = getCanvasCursorPosition(e, canvas), x = ref[0], y = ref[1];
    dx = x - this.x0;
    dy = y - this.y0;
    this.x0 = x;
    this.y0 = y;
    k = 2.0 / canvas.height;
    newAngle = this.angle(x, y);
    dAngle = newAngle - this.angle0;
    if (dAngle > Math.PI) {
      dAngle = dAngle - Math.PI * 2;
    } else if (dAngle < -Math.PI) {
      dAngle = dAngle + Math.PI * 2;
    }
    this.angle0 = newAngle;
    r = Math.min(this.xc, this.yc);
    r2 = (Math.pow(x - this.xc, 2) + Math.pow(y - this.yc, 2)) / (Math.pow(r, 2));
    q = Math.min(1.0, r2);
    mv = M.translationMatrix(dx * k * (1 - q), dy * k * (1 - q));
    rt = M.rotationMatrix(dAngle * q);
    return this.application.getObserver().modifyView(M.mul(M.mul(mv, rt), mv));
  };

  return MouseToolCombo;

})(MouseTool);


/*    
exports.MouseToolPan = class MouseToolPan extends MouseTool
  constructor: (application, @x0, @y0) ->
    super application
    @panEventDebouncer = new Debouncer 1000, =>
      @application.getObserver.rebaseView()
      
  mouseMoved: (e)->
    canvas = @application.getCanvas()
    [x, y] = getCanvasCursorPosition e, canvas
    dx = x - @x0
    dy = y - @y0

    @x0 = x
    @y0 = y
    k = 2.0 / canvas.height
    xc = (x - canvas.width*0.5)*k
    yc = (y - canvas.height*0.5)*k

    r2 = xc*xc + yc*yc
    s = 2 / Math.max(0.3, 1-r2)
    
    @moveView dx*k*s , dy*k*s
    @panEventDebouncer.fire()
    
exports.MouseToolRotate = class MouseToolRotate extends MouseTool
  constructor: (application, x, y) ->
    super application
    canvas = @application.getCanvas()
    @xc = canvas.width * 0.5
    @yc = canvas.width * 0.5
    @angle0 = @angle x, y 
    
  angle: (x,y) -> Math.atan2( x-@xc, y-@yc)
    
  mouseMoved: (e)->
    canvas = @application.getCanvas()
    [x, y] = getCanvasCursorPosition e, canvas
    newAngle = @angle x, y
    dAngle = newAngle - @angle0
    @angle0 = newAngle
    @rotateView dAngle
 */


},{"./canvas_util.coffee":3,"./htmlutil.coffee":6,"./matrix3.coffee":11}],13:[function(require,module,exports){
var DomBuilder, E, Navigator, allClusters, chainLen;

chainLen = require("./vondyck_chain.coffee").chainLen;

allClusters = require("./field.coffee").allClusters;

DomBuilder = require("./dom_builder.coffee").DomBuilder;

E = require("./htmlutil.coffee").E;

exports.Navigator = Navigator = (function() {
  function Navigator(application, navigatorElemId, btnClearId) {
    this.application = application;
    if (navigatorElemId == null) {
      navigatorElemId = "navigator-cluster-list";
    }
    if (btnClearId == null) {
      btnClearId = "btn-nav-clear";
    }
    this.clustersElem = E(navigatorElemId);
    this.btnClear = E(btnClearId);
    this.clusters = [];
    this.btnClear.style.display = 'none';
  }

  Navigator.prototype.search = function(field) {
    var m, n;
    n = this.application.getGroup().n;
    m = this.application.getGroup().m;
    this.clusters = allClusters(field, n, m, this.application.getAppendRewrite());
    this.sortByDistance();
    this.updateClusterList();
    this.btnClear.style.display = this.clusters ? '' : 'none';
    return this.clusters.length;
  };

  Navigator.prototype.sortByDistance = function() {
    return this.clusters.sort(function(a, b) {
      var d;
      d = chainLen(b[0]) - chainLen(a[0]);
      if (d !== 0) {
        return d;
      }
      d = b.length - a.length;
      return d;
    });
  };

  Navigator.prototype.sortBySize = function() {
    return this.clusters.sort(function(a, b) {
      var d;
      d = b.length - a.length;
      if (d !== 0) {
        return d;
      }
      d = chainLen(b[0]) - chainLen(a[0]);
      return d;
    });
  };

  Navigator.prototype.makeNavigateTo = function(chain) {
    return (function(_this) {
      return function(e) {
        var observer;
        e.preventDefault();
        observer = _this.application.getObserver();
        if (observer != null) {
          observer.navigateTo(chain);
        }
      };
    })(this);
  };

  Navigator.prototype.navigateToResult = function(index) {
    var observer;
    observer = this.application.getObserver();
    if (observer != null) {
      return observer.navigateTo(this.clusters[index][0]);
    }
  };

  Navigator.prototype.clear = function() {
    this.clusters = [];
    this.clustersElem.innerHTML = "";
    return this.btnClear.style.display = 'none';
  };

  Navigator.prototype.updateClusterList = function() {
    var cluster, dist, dom, i, idx, len, listener, ref, size;
    dom = new DomBuilder;
    dom.tag("table").tag("thead").tag('tr').tag('th').rtag('ssort').a("href", "#sort-size").text('Cells').end().end().tag('th').rtag('dsort').a("href", "#sort-dist").text('Distance').end().end().end().end();
    dom.vars.ssort.addEventListener('click', (function(_this) {
      return function(e) {
        e.preventDefault();
        _this.sortBySize();
        return _this.updateClusterList();
      };
    })(this));
    dom.vars.dsort.addEventListener('click', (function(_this) {
      return function(e) {
        e.preventDefault();
        _this.sortByDistance();
        return _this.updateClusterList();
      };
    })(this));
    dom.tag("tbody");
    ref = this.clusters;
    for (idx = i = 0, len = ref.length; i < len; idx = ++i) {
      cluster = ref[idx];
      size = cluster.length;
      dist = chainLen(cluster[0]);
      dom.tag("tr").tag("td").rtag("navtag", "a").a("href", "#nav-cluster" + idx).text("" + size).end().end().tag('td').rtag("navtag1", "a").a("href", "#nav-cluster" + idx).text("" + dist).end().end().end();
      listener = this.makeNavigateTo(cluster[0]);
      dom.vars.navtag.addEventListener("click", listener);
      dom.vars.navtag1.addEventListener("click", listener);
    }
    dom.end();
    this.clustersElem.innerHTML = "";
    return this.clustersElem.appendChild(dom.finalize());
  };

  return Navigator;

})();


},{"./dom_builder.coffee":4,"./field.coffee":5,"./htmlutil.coffee":6,"./vondyck_chain.coffee":20}],14:[function(require,module,exports){
"use strict";
var FieldObserver, M, eliminateFinalA, makeXYT2path, node2array, poincare2hyperblic, ref, ref1, showNode, unity, visibleNeighborhood;

ref = require("./vondyck_chain.coffee"), unity = ref.unity, showNode = ref.showNode, node2array = ref.node2array;

ref1 = require("./poincare_view.coffee"), makeXYT2path = ref1.makeXYT2path, poincare2hyperblic = ref1.poincare2hyperblic, visibleNeighborhood = ref1.visibleNeighborhood;

eliminateFinalA = require("./vondyck_rewriter.coffee").eliminateFinalA;

M = require("./matrix3.coffee");

exports.FieldObserver = FieldObserver = (function() {
  function FieldObserver(tessellation, appendRewrite, minCellSize, center, tfm) {
    var c, cells;
    this.tessellation = tessellation;
    this.appendRewrite = appendRewrite;
    this.minCellSize = minCellSize != null ? minCellSize : 1.0 / 400.0;
    if (center == null) {
      center = unity;
    }
    this.tfm = tfm != null ? tfm : M.eye();
    this.cells = null;
    this.center = null;
    cells = visibleNeighborhood(this.tessellation, this.appendRewrite, this.minCellSize);
    this.cellOffsets = (function() {
      var j, len, results;
      results = [];
      for (j = 0, len = cells.length; j < len; j++) {
        c = cells[j];
        results.push(node2array(c));
      }
      return results;
    })();
    if (center !== unity) {
      this.rebuildAt(center);
    } else {
      this.cells = cells;
      this.center = center;
    }
    this.cellTransforms = (function() {
      var j, len, results;
      results = [];
      for (j = 0, len = cells.length; j < len; j++) {
        c = cells[j];
        results.push(c.repr(this.tessellation.group));
      }
      return results;
    }).call(this);
    this.drawEmpty = true;
    this.jumpLimit = 1.5;
    this.viewUpdates = 0;
    this.maxViewUpdatesBeforeCleanup = 50;
    this.xyt2path = makeXYT2path(this.tessellation.group, this.appendRewrite);
    this.pattern = ["red", "black", "green", "blue", "yellow", "cyan", "magenta", "gray", "orange"];
    this.onFinish = null;
  }

  FieldObserver.prototype.getColorForState = function(state) {
    return this.pattern[(state % this.pattern.length + this.pattern.length) % this.pattern.length];
  };

  FieldObserver.prototype.getViewCenter = function() {
    return this.center;
  };

  FieldObserver.prototype.getViewOffsetMatrix = function() {
    return this.tfm;
  };

  FieldObserver.prototype.setViewOffsetMatrix = function(m) {
    this.tfm = m;
    return this.renderGrid(this.tfm);
  };

  FieldObserver.prototype.rebuildAt = function(newCenter) {
    var offset;
    this.center = newCenter;
    this.cells = (function() {
      var j, len, ref2, results;
      ref2 = this.cellOffsets;
      results = [];
      for (j = 0, len = ref2.length; j < len; j++) {
        offset = ref2[j];
        results.push(eliminateFinalA(this.appendRewrite(newCenter, offset.slice(0)), this.appendRewrite, this.tessellation.group.n));
      }
      return results;
    }).call(this);
    this._observedCellsChanged();
  };

  FieldObserver.prototype.navigateTo = function(chain, offsetMatrix) {
    if (offsetMatrix == null) {
      offsetMatrix = M.eye();
    }
    console.log("navigated to " + (showNode(chain)));
    this.rebuildAt(chain);
    this.tfm = offsetMatrix;
    this.renderGrid(this.tfm);
  };

  FieldObserver.prototype._observedCellsChanged = function() {};

  FieldObserver.prototype.translateBy = function(appendArray) {
    return this.rebuildAt(this.appendRewrite(this.center, appendArray));
  };

  FieldObserver.prototype.canDraw = function() {
    return true;
  };

  FieldObserver.prototype.draw = function(cells, context) {
    var cell, cellIndex, cellIndices, cellTfm, i, j, k, len, len1, mtx, ref2, ref3, state, state2cellIndexList, stateCells, strState;
    state2cellIndexList = {};
    ref2 = this.cells;
    for (i = j = 0, len = ref2.length; j < len; i = ++j) {
      cell = ref2[i];
      state = (ref3 = cells.get(cell)) != null ? ref3 : 0;
      if ((state !== 0) || this.drawEmpty) {
        stateCells = state2cellIndexList[state];
        if (stateCells == null) {
          state2cellIndexList[state] = stateCells = [];
        }
        stateCells.push(i);
      }
    }
    for (strState in state2cellIndexList) {
      cellIndices = state2cellIndexList[strState];
      state = parseInt(strState, 10);
      context.beginPath();
      for (k = 0, len1 = cellIndices.length; k < len1; k++) {
        cellIndex = cellIndices[k];
        cellTfm = this.cellTransforms[cellIndex];
        mtx = M.mul(this.tfm, cellTfm);
        this.tessellation.makeCellShapePoincare(mtx, context);
      }
      if (state === 0) {
        context.stroke();
      } else {
        context.fillStyle = this.getColorForState(state);
        context.fill();
      }
    }
    return true;
  };

  FieldObserver.prototype.visibleCells = function(cells) {
    var cell, j, len, ref2, results, value;
    ref2 = this.cells;
    results = [];
    for (j = 0, len = ref2.length; j < len; j++) {
      cell = ref2[j];
      if ((value = cells.get(cell)) !== null) {
        results.push([cell, value]);
      }
    }
    return results;
  };

  FieldObserver.prototype.checkViewMatrix = function() {
    if ((this.viewUpdates += 1) > this.maxViewUpdatesBeforeCleanup) {
      this.viewUpdates = 0;
      return this.tfm = M.cleanupHyperbolicMoveMatrix(this.tfm);
    }
  };

  FieldObserver.prototype.modifyView = function(m) {
    var originDistance;
    this.tfm = M.mul(m, this.tfm);
    this.checkViewMatrix();
    originDistance = this.viewDistanceToOrigin();
    if (originDistance > this.jumpLimit) {
      return this.rebaseView();
    } else {
      return this.renderGrid(this.tfm);
    }
  };

  FieldObserver.prototype.renderGrid = function(viewMatrix) {
    return typeof this.onFinish === "function" ? this.onFinish() : void 0;
  };

  FieldObserver.prototype.viewDistanceToOrigin = function() {
    return Math.acosh(this.tfm[8]);
  };

  FieldObserver.prototype.rebaseView1 = function() {
    var centerCoord, m, pathToCenterCell;
    centerCoord = M.mulv(M.inv(this.tfm), [0.0, 0.0, 1.0]);
    pathToCenterCell = this.xyt2path(centerCoord);
    m = pathToCenterCell.repr(this.tessellation.group);
    this.tfm = M.mul(this.tfm, m);
    this.checkViewMatrix();
    return this.translateBy(node2array(pathToCenterCell));
  };

  FieldObserver.prototype.rebaseView = function() {
    var centerCoord, m, pathToCenterCell;
    centerCoord = M.mulv(M.inv(this.tfm), [0.0, 0.0, 1.0]);
    pathToCenterCell = this.xyt2path(centerCoord);
    if (pathToCenterCell === unity) {
      return;
    }
    m = pathToCenterCell.repr(this.tessellation.group);
    this.tfm = M.mul(this.tfm, m);
    this.checkViewMatrix();
    this.translateBy(node2array(pathToCenterCell));
    return this.renderGrid(this.tfm);
  };

  FieldObserver.prototype.straightenView = function() {
    var additionalAngle, angle, angleOffsets, bestDifference, bestRotationMtx, dAngle, difference, distanceToEye, i, j, k, len, minusEye, originalTfm, ref2, rotMtx;
    this.rebaseView();
    originalTfm = this.getViewOffsetMatrix();
    dAngle = Math.PI / this.tessellation.group.n;
    minusEye = M.smul(-1, M.eye());
    distanceToEye = function(m) {
      var d, di;
      d = M.add(m, minusEye);
      return Math.max.apply(Math, (function() {
        var j, len, results;
        results = [];
        for (j = 0, len = d.length; j < len; j++) {
          di = d[j];
          results.push(Math.abs(di));
        }
        return results;
      })());
    };
    bestRotationMtx = null;
    bestDifference = null;
    angleOffsets = [0.0];
    if (this.tessellation.group.n % 2 === 1) {
      angleOffsets.push(Math.PI / 2);
    }
    for (j = 0, len = angleOffsets.length; j < len; j++) {
      additionalAngle = angleOffsets[j];
      for (i = k = 0, ref2 = 2 * this.tessellation.group.n; 0 <= ref2 ? k < ref2 : k > ref2; i = 0 <= ref2 ? ++k : --k) {
        angle = dAngle * i + additionalAngle;
        rotMtx = M.rotationMatrix(angle);
        difference = distanceToEye(M.mul(originalTfm, M.hyperbolicInv(rotMtx)));
        if ((bestDifference === null) || (bestDifference > difference)) {
          bestDifference = difference;
          bestRotationMtx = rotMtx;
        }
      }
    }
    return this.setViewOffsetMatrix(bestRotationMtx);
  };

  FieldObserver.prototype.cellFromPoint = function(xp, yp) {
    var visibleCell, xyt;
    xyt = poincare2hyperblic(xp, yp);
    if (xyt === null) {
      throw new Error("point outside");
    }
    xyt = M.mulv(M.inv(this.tfm), xyt);
    visibleCell = this.xyt2path(xyt);
    return eliminateFinalA(this.appendRewrite(this.center, node2array(visibleCell)), this.appendRewrite, this.tessellation.group.n);
  };

  FieldObserver.prototype.shutdown = function() {};

  return FieldObserver;

})();


},{"./matrix3.coffee":11,"./poincare_view.coffee":16,"./vondyck_chain.coffee":20,"./vondyck_rewriter.coffee":21}],15:[function(require,module,exports){
var parseUri;

exports.parseUri = parseUri = function(str) {
  var i, k, m, o, ref, uri, v;
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
  ref = uri.queryKey;
  for (k in ref) {
    v = ref[k];
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


},{}],16:[function(require,module,exports){
var M, NodeHashMap, mooreNeighborhood, node2array, nodeMatrixRepr, ref, unity;

mooreNeighborhood = require("./field.coffee").mooreNeighborhood;

M = require("./matrix3.coffee");

ref = require("./vondyck_chain.coffee"), unity = ref.unity, nodeMatrixRepr = ref.nodeMatrixRepr, node2array = ref.node2array, NodeHashMap = ref.NodeHashMap;

exports.makeXYT2path = function(group, appendRewrite, maxSteps) {
  var cell2point, getNeighbors, nearestNeighbor, vectorDist;
  if (maxSteps == null) {
    maxSteps = 100;
  }
  getNeighbors = mooreNeighborhood(group.n, group.m, appendRewrite);
  cell2point = function(cell) {
    return M.mulv(cell.repr(group), [0.0, 0.0, 1.0]);
  };
  vectorDist = function(arg, arg1) {
    var t1, t2, x1, x2, y1, y2;
    x1 = arg[0], y1 = arg[1], t1 = arg[2];
    x2 = arg1[0], y2 = arg1[1], t2 = arg1[2];
    return t1 * t2 - x1 * x2 - y1 * y2 - 1;
  };
  nearestNeighbor = function(cell, xyt) {
    var dBest, dNei, i, len, nei, neiBest, ref1;
    dBest = null;
    neiBest = null;
    ref1 = getNeighbors(cell);
    for (i = 0, len = ref1.length; i < len; i++) {
      nei = ref1[i];
      dNei = vectorDist(cell2point(nei), xyt);
      if ((dBest === null) || (dNei < dBest)) {
        dBest = dNei;
        neiBest = nei;
      }
    }
    return [neiBest, dBest];
  };
  return function(xyt) {
    var cell, cellDist, nextNei, nextNeiDist, ref1, step;
    cell = unity;
    cellDist = vectorDist(cell2point(cell), xyt);
    step = 0;
    while (step < maxSteps) {
      step += 1;
      ref1 = nearestNeighbor(cell, xyt), nextNei = ref1[0], nextNeiDist = ref1[1];
      if (nextNeiDist > cellDist) {
        break;
      } else {
        cell = nextNei;
        cellDist = nextNeiDist;
      }
    }
    return cell;
  };
};

exports.poincare2hyperblic = function(x, y) {
  var r2, th;
  r2 = x * x + y * y;
  if (r2 >= 1.0) {
    return null;
  }
  th = (r2 + 1) / (1 - r2);
  return [x * (th + 1), y * (th + 1), th];
};

exports.visibleNeighborhood = function(tessellation, appendRewrite, minCellSize) {
  var cells, getNeighbors, visibleCells, walk;
  getNeighbors = mooreNeighborhood(tessellation.group.n, tessellation.group.m, appendRewrite);
  cells = new NodeHashMap;
  walk = function(cell) {
    var cellSize, i, len, nei, ref1;
    if (cells.get(cell) !== null) {
      return;
    }
    cellSize = tessellation.visiblePolygonSize(cell.repr(tessellation.group));
    cells.put(cell, cellSize);
    if (cellSize > minCellSize) {
      ref1 = getNeighbors(cell);
      for (i = 0, len = ref1.length; i < len; i++) {
        nei = ref1[i];
        walk(nei);
      }
    }
  };
  walk(unity);
  visibleCells = [];
  cells.forItems(function(cell, size) {
    if (size >= minCellSize) {
      return visibleCells.push(cell);
    }
  });
  return visibleCells;
};


},{"./field.coffee":5,"./matrix3.coffee":11,"./vondyck_chain.coffee":20}],17:[function(require,module,exports){
var BaseFunc, BinaryTransitionFunc, DayNightTransitionFunc, GenericTransitionFunc, isDayNightRule, parseIntChecked,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

parseIntChecked = require("./utils.coffee").parseIntChecked;

BaseFunc = (function() {
  function BaseFunc() {}

  BaseFunc.prototype.plus = function(x, y) {
    return x + y;
  };

  BaseFunc.prototype.plusInitial = 0;

  BaseFunc.prototype.setGeneration = function(g) {};

  return BaseFunc;

})();

exports.GenericTransitionFunc = GenericTransitionFunc = (function(superClass) {
  extend(GenericTransitionFunc, superClass);

  function GenericTransitionFunc(numStates, plus, plusInitial, evaluate) {
    this.numStates = numStates;
    this.plus = plus;
    this.plusInitial = plusInitial;
    this.evaluate = evaluate;
    if (this.numStates <= 0) {
      throw new Error("Number if states incorrect");
    }
    this.generation = 0;
  }

  GenericTransitionFunc.prototype.toString = function() {
    return "GenericFunction( " + this.numStates + " states )";
  };

  GenericTransitionFunc.prototype.isStable = function() {
    return this.evaluate(0, 0) === 0;
  };

  GenericTransitionFunc.prototype.setGeneration = function(g) {
    return this.generation = g;
  };

  GenericTransitionFunc.prototype.getType = function() {
    return "custom";
  };

  return GenericTransitionFunc;

})(BaseFunc);

isDayNightRule = function(binaryFunc) {
  return binaryFunc.evaluate(0, 0) === 1 && binaryFunc.evaluate(1, binaryFunc.numNeighbors) === 0;
};

exports.DayNightTransitionFunc = DayNightTransitionFunc = (function(superClass) {
  extend(DayNightTransitionFunc, superClass);

  function DayNightTransitionFunc(base) {
    this.base = base;
    if (!isDayNightRule(this.base)) {
      throw new Error("base function is not flashing");
    }
    this.phase = 0;
  }

  DayNightTransitionFunc.prototype.toString = function() {
    return this.base.toString();
  };

  DayNightTransitionFunc.prototype.numStates = 2;

  DayNightTransitionFunc.prototype.getType = function() {
    return "binary";
  };

  DayNightTransitionFunc.prototype.setGeneration = function(g) {
    return this.phase = g & 1;
  };

  DayNightTransitionFunc.prototype.isStable = function() {
    return this.base.evaluate(0, 0) === 1 && this.base.evaluate(1, this.base.numNeighbors) === 0;
  };

  DayNightTransitionFunc.prototype.evaluate = function(x, s) {
    if (this.phase) {
      return 1 - this.base.evaluate(x, s);
    } else {
      return this.base.evaluate(1 - x, this.base.numNeighbors - s);
    }
  };

  return DayNightTransitionFunc;

})(BaseFunc);

exports.BinaryTransitionFunc = BinaryTransitionFunc = (function(superClass) {
  extend(BinaryTransitionFunc, superClass);

  function BinaryTransitionFunc(n1, m1, bornAt, stayAt) {
    var arr, s;
    this.n = n1;
    this.m = m1;
    this.numNeighbors = this.n * (this.m - 2);
    this.table = (function() {
      var j, len, ref, results;
      ref = [bornAt, stayAt];
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        arr = ref[j];
        results.push((function() {
          var k, ref1, results1;
          results1 = [];
          for (s = k = 0, ref1 = this.numNeighbors; k <= ref1; s = k += 1) {
            if (indexOf.call(arr, s) >= 0) {
              results1.push(1);
            } else {
              results1.push(0);
            }
          }
          return results1;
        }).call(this));
      }
      return results;
    }).call(this);
  }

  BinaryTransitionFunc.prototype.isStable = function() {
    return table[0][0] === 0;
  };

  BinaryTransitionFunc.prototype.plus = function(x, y) {
    return x + y;
  };

  BinaryTransitionFunc.prototype.plusInitial = 0;

  BinaryTransitionFunc.prototype.numStates = 2;

  BinaryTransitionFunc.prototype.getType = function() {
    return "binary";
  };

  BinaryTransitionFunc.prototype.evaluate = function(state, sum) {
    if (state !== 0 && state !== 1) {
      throw new Error("Bad state: " + state);
    }
    if (sum < 0 || sum > this.numNeighbors) {
      throw new Error("Bad sum: " + sum);
    }
    return this.table[state][sum];
  };

  BinaryTransitionFunc.prototype.toString = function() {
    return "B " + this._nonzeroIndices(this.table[0]).join(" ") + " S " + this._nonzeroIndices(this.table[1]).join(" ");
  };

  BinaryTransitionFunc.prototype._nonzeroIndices = function(arr) {
    var i, j, len, results, x;
    results = [];
    for (i = j = 0, len = arr.length; j < len; i = ++j) {
      x = arr[i];
      if (x !== 0) {
        results.push(i);
      }
    }
    return results;
  };

  return BinaryTransitionFunc;

})(BaseFunc);

exports.parseGenericTransitionFunction = function(str) {
  var ref, ref1, tfObject;
  tfObject = eval('(' + str + ')');
  if (tfObject.states == null) {
    throw new Error("Numer of states not specified");
  }
  if (tfObject.next == null) {
    throw new Error("Transition function not specified");
  }
  return new GenericTransitionFunc(tfObject.states, (ref = tfObject.sum) != null ? ref : (function(x, y) {
    return x + y;
  }), (ref1 = tfObject.sumInitial) != null ? ref1 : 0, tfObject.next);
};

exports.parseTransitionFunction = function(str, n, m, allowDayNight) {
  var bArray, func, match, sArray, strings2array;
  if (allowDayNight == null) {
    allowDayNight = true;
  }
  match = str.match(/B([\d\s]+)S([\d\s]+)/);
  if (match == null) {
    throw new Error("Bad function string: " + str);
  }
  strings2array = function(s) {
    var j, len, part, ref, results;
    ref = s.split(' ');
    results = [];
    for (j = 0, len = ref.length; j < len; j++) {
      part = ref[j];
      if (part) {
        results.push(parseIntChecked(part));
      }
    }
    return results;
  };
  bArray = strings2array(match[1]);
  sArray = strings2array(match[2]);
  func = new BinaryTransitionFunc(n, m, bArray, sArray);
  if (allowDayNight && isDayNightRule(func)) {
    return new DayNightTransitionFunc(func);
  } else {
    return func;
  }
};

exports.binaryTransitionFunc2GenericCode = function(binTf) {
  var code, conditionBorn, conditionStay, row2condition;
  row2condition = function(row) {
    var nextValue, sum;
    return ((function() {
      var j, len, results;
      results = [];
      for (sum = j = 0, len = row.length; j < len; sum = ++j) {
        nextValue = row[sum];
        if (nextValue) {
          results.push("s===" + sum);
        }
      }
      return results;
    })()).join(" || ");
  };
  conditionBorn = row2condition(binTf.table[0]);
  conditionStay = row2condition(binTf.table[1]);
  return code = ["//Automatically generated code for binary rule " + binTf + "\n{\n    //number of states\n    'states': 2,\n\n    //Neighbors sum calculation is default. Code for reference.\n    //'plus': function(s,x){ return s+x; },\n    //'plusInitial': 0,\n    \n    //Transition function. Takes current state and sum, returns new state.\n    //this.generation stores current generation number\n    'next': function(x, s){\n        if (x===1 && (" + conditionStay + ")) return 1;\n        if (x===0 && (" + conditionBorn + ")) return 1;\n        return 0;\n     }\n}"];
};

exports.dayNightBinaryTransitionFunc2GenericCode = function(binTf) {
  var code, conditionBorn, conditionBornInv, conditionStay, conditionStayInv, row2condition, row2conditionInv;
  row2condition = function(row) {
    var nextValue, sum;
    return ((function() {
      var j, len, results;
      results = [];
      for (sum = j = 0, len = row.length; j < len; sum = ++j) {
        nextValue = row[sum];
        if (nextValue) {
          results.push("s===" + sum);
        }
      }
      return results;
    })()).join(" || ");
  };
  row2conditionInv = function(row) {
    var nextValue, sum;
    return ((function() {
      var j, len, results;
      results = [];
      for (sum = j = 0, len = row.length; j < len; sum = ++j) {
        nextValue = row[sum];
        if (nextValue) {
          results.push("s===" + (binTf.base.numNeighbors - sum));
        }
      }
      return results;
    })()).join(" || ");
  };
  conditionBorn = row2condition(binTf.base.table[0]);
  conditionStay = row2condition(binTf.base.table[1]);
  conditionBornInv = row2conditionInv(binTf.base.table[0]);
  conditionStayInv = row2conditionInv(binTf.base.table[1]);
  return code = ["//Automatically generated code for population-inverting binary rule " + binTf + "\n{\n    //number of states\n    'states': 2,\n\n    //Neighbors sum calculation is default. Code for reference.\n    //'plus': function(s,x){ return s+x; },\n    //'plusInitial': 0,\n    \n    //Transition function. Takes current state and sum, returns new state.\n    'next': function(x, s){\n        var phase = this.generation & 1;\n\n        //The original rule " + binTf + " inverts state of an empty field\n        //To calculate it efficiently, we instead invert each odd generation, so that population never goes to infinity.\n        \n        \n        if (phase === 0){\n            //On even generations, invert output\n            if (x===1 && (" + conditionStay + ")) return 0;\n            if (x===0 && (" + conditionBorn + ")) return 0;\n            return 1\n        } else {\n            //On odd generations, invert input state and nighbors sum\n            if (x===0 && (" + conditionStayInv + ")) return 1;\n            if (x===1 && (" + conditionBornInv + ")) return 1;\n            return 0;\n        }\n     }\n}"];
};


},{"./utils.coffee":19}],18:[function(require,module,exports){
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


},{"./matrix3.coffee":11}],19:[function(require,module,exports){
"use strict";
exports.formatString = function(s, args) {
  return s.replace(/{(\d+)}/g, function(match, number) {
    var ref;
    return (ref = args[number]) != null ? ref : match;
  });
};

exports.pad = function(num, size) {
  var s;
  s = num + "";
  while (s.length < size) {
    s = "0" + s;
  }
  return s;
};

exports.parseIntChecked = function(s) {
  var v;
  v = parseInt(s, 10);
  if (Number.isNaN(v)) {
    throw new Error("Bad number: " + s);
  }
  return v;
};

exports.parseFloatChecked = function(s) {
  var v;
  v = parseFloat(s);
  if (Number.isNaN(v)) {
    throw new Error("Bad number: " + s);
  }
  return v;
};


},{}],20:[function(require,module,exports){

/* Implementation of values of von Dyck groups.
 *  Each value is a chain of powers of 2 generators: A and B
 *
 *  Example:
 *    x = a*b*a-1*b^2*a*b-3
 *
 *  vD groups have additional relations for generators:
 *   a^n === b^m === (ab)^k,
 *  however this implementation is agnostic about these details.
 *  They are implemented by the js_rewriter module.
 *
 *  (To this module actually implements free group of 2 generators...)
 *
 *  To facilitate chain appending/truncating, theyt are implemented as a functional data structure.
 *  Root element is `unity`, it represens identity element of the group.
 */
var M, Node, NodeA, NodeB, NodeHashMap, appendChain, appendInverseChain, appendSimple, chainEquals, chainLen, identityMatrix, newNode, node2array, nodeConstructors, nodeHash, nodeMatrixRepr, reverseShortlexLess, showNode, truncateA, truncateB, unity,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

M = require("./matrix3.coffee");

exports.Node = Node = (function() {
  function Node() {}

  Node.prototype.hash = function() {
    var h;
    if ((h = this.h) !== null) {
      return h;
    } else {
      h = this.t.hash();
      return this.h = (((h << 5) - h) + (this.letterCode << 7) + this.p) | 0;
    }
  };

  Node.prototype.repr = function(generatorMatrices) {
    var m;
    if ((m = this.mtx) !== null) {
      return m;
    } else {
      return this.mtx = M.mul(this.t.repr(generatorMatrices), generatorMatrices.generatorPower(this.letter, this.p));
    }
  };

  Node.prototype.equals = function(c) {
    return chainEquals(this, c);
  };

  return Node;

})();

identityMatrix = M.eye();

exports.unity = unity = new Node;

unity.l = 0;

unity.h = 0;

unity.mtx = M.eye();

unity.repr = function(g) {
  return this.mtx;
};

exports.NodeA = NodeA = (function(superClass) {
  extend(NodeA, superClass);

  NodeA.prototype.letter = 'a';

  NodeA.prototype.letterCode = 0;

  function NodeA(p1, t) {
    this.p = p1;
    this.t = t;
    this.l = this.t === unity ? 1 : this.t.l + 1;
    this.h = null;
    this.mtx = null;
  }

  return NodeA;

})(Node);

exports.NodeB = NodeB = (function(superClass) {
  extend(NodeB, superClass);

  NodeB.prototype.letter = 'b';

  NodeB.prototype.letterCode = 1;

  function NodeB(p1, t) {
    this.p = p1;
    this.t = t;
    this.l = this.t === unity ? 1 : this.t.l + 1;
    this.h = null;
    this.mtx = null;
  }

  return NodeB;

})(Node);

exports.chainEquals = chainEquals = function(a, b) {
  while (true) {
    if (a === b) {
      return true;
    }
    if (a === unity || b === unity) {
      return false;
    }
    if ((a.letter !== b.letter) || (a.p !== b.p)) {
      return false;
    }
    a = a.t;
    b = b.t;
  }
};

showNode = exports.showNode = function(node) {
  var letter, parts, power;
  if (node === unity) {
    return 'e';
  }
  parts = [];
  while (node !== unity) {
    letter = node.letter;
    power = node.p;
    if (power < 0) {
      letter = letter.toUpperCase();
      power = -power;
    }
    if (power !== 1) {
      parts.push("^" + power);
    }
    parts.push(letter);
    node = node.t;
  }
  return parts.reverse().join('');
};

exports.parseNode = function(s) {
  var letter, letterLow, match, power, prepend, ref, updPrepender;
  if (s === '' || s === 'e') {
    return unity;
  }
  prepend = function(tail) {
    return tail;
  };
  updPrepender = function(prepender, letter, power) {
    return function(tail) {
      return newNode(letter, power, prepender(tail));
    };
  };
  while (s) {
    match = s.match(/([aAbB])(?:\^(\d+))?/);
    if (!match) {
      throw new Error("Bad syntax: " + s);
    }
    s = s.substr(match[0].length);
    letter = match[1];
    power = parseInt((ref = match[2]) != null ? ref : '1', 10);
    letterLow = letter.toLowerCase();
    if (letter !== letterLow) {
      power = -power;
    }
    prepend = updPrepender(prepend, letterLow, power);
  }
  return prepend(unity);
};

exports.truncateA = truncateA = function(chain) {
  while ((chain !== unity) && (chain.letter === "a")) {
    chain = chain.t;
  }
  return chain;
};

exports.truncateB = truncateB = function(chain) {
  while ((chain !== unity) && (chain.letter === "b")) {
    chain = chain.t;
  }
  return chain;
};

exports.nodeConstructors = nodeConstructors = {
  a: NodeA,
  b: NodeB
};

exports.newNode = newNode = function(letter, power, parent) {
  return new nodeConstructors[letter](power, parent);
};

exports.appendSimple = appendSimple = function(chain, stack) {
  var e, p, ref;
  while (stack.length > 0) {
    ref = stack.pop(), e = ref[0], p = ref[1];
    chain = newNode(e, p, chain);
  }
  return chain;
};


/* Convert chain to array of pairs: [letter, power], where letter is "a" or "b" and power is integer.
 * Top element of the chain becomes first element of the array
 */

exports.node2array = node2array = function(node) {
  var result;
  result = [];
  while (node !== unity) {
    result.push([node.letter, node.p]);
    node = node.t;
  }
  return result;
};

exports.nodeMatrixRepr = nodeMatrixRepr = function(node, generatorMatrices) {
  return node.repr(generatorMatrices);
};

exports.nodeHash = nodeHash = function(node) {
  return node.hash();
};

exports.chainLen = chainLen = function(chain) {
  return chain.l;
};


/*
 * Reverse compare 2 chains by shortlex algorithm
 */

exports.reverseShortlexLess = reverseShortlexLess = function(c1, c2) {
  if (c1 === unity) {
    return c2 !== unity;
  } else {
    if (c2 === unity) {
      return false;
    } else {
      if (c1.l !== c2.l) {
        return c1.l < c2.l;
      }
      while (c1 !== unity) {
        if (c1.letter !== c2.letter) {
          return c1.letter < c2.letter;
        }
        if (c1.p !== c2.p) {
          return c1.p < c2.p;
        }
        c1 = c1.t;
        c2 = c2.t;
      }
      return false;
    }
  }
};

exports.NodeHashMap = NodeHashMap = (function() {
  function NodeHashMap(initialSize) {
    var i;
    if (initialSize == null) {
      initialSize = 16;
    }
    if (initialSize & (initialSize - 1) !== 0) {
      throw new Error("size must be power of 2");
    }
    this.table = (function() {
      var j, ref, results;
      results = [];
      for (i = j = 0, ref = initialSize; j < ref; i = j += 1) {
        results.push([]);
      }
      return results;
    })();
    this.count = 0;
    this.maxFillRatio = 0.7;
    this.sizeMask = initialSize - 1;
  }

  NodeHashMap.prototype._index = function(chain) {
    return chain.hash() & this.sizeMask;
  };

  NodeHashMap.prototype.putAccumulate = function(chain, value, accumulateFunc, accumulateInitial) {
    var cell, j, key_value, len;
    cell = this.table[this._index(chain)];
    for (j = 0, len = cell.length; j < len; j++) {
      key_value = cell[j];
      if (chainEquals(key_value[0], chain)) {
        key_value[1] = accumulateFunc(key_value[1], value);
        return;
      }
    }
    cell.push([chain, accumulateFunc(accumulateInitial, value)]);
    this.count += 1;
    if (this.count > this.maxFillRatio * this.table.length) {
      this._growTable();
    }
    return this;
  };

  NodeHashMap.prototype.put = function(chain, value) {
    return this.putAccumulate(chain, value, function(x, y) {
      return y;
    });
  };

  NodeHashMap.prototype.get = function(chain) {
    var j, key_value, len, ref;
    ref = this.table[this._index(chain)];
    for (j = 0, len = ref.length; j < len; j++) {
      key_value = ref[j];
      if (chainEquals(key_value[0], chain)) {
        return key_value[1];
      }
    }
    return null;
  };

  NodeHashMap.prototype.remove = function(chain) {
    var index, j, key_value, len, tableCell;
    tableCell = this.table[this._index(chain)];
    for (index = j = 0, len = tableCell.length; j < len; index = ++j) {
      key_value = tableCell[index];
      if (chainEquals(key_value[0], chain)) {
        tableCell.splice(index, 1);
        this.count -= 1;
        return true;
      }
    }
    return false;
  };

  NodeHashMap.prototype._growTable = function() {
    var cell, j, k, key, len, len1, newTable, ref, ref1, value;
    newTable = new NodeHashMap(this.table.length * 2);
    ref = this.table;
    for (j = 0, len = ref.length; j < len; j++) {
      cell = ref[j];
      for (k = 0, len1 = cell.length; k < len1; k++) {
        ref1 = cell[k], key = ref1[0], value = ref1[1];
        newTable.put(key, value);
      }
    }
    this.table = newTable.table;
    this.sizeMask = newTable.sizeMask;
  };

  NodeHashMap.prototype.forItems = function(callback) {
    var cell, j, k, key, len, len1, ref, ref1, value;
    ref = this.table;
    for (j = 0, len = ref.length; j < len; j++) {
      cell = ref[j];
      for (k = 0, len1 = cell.length; k < len1; k++) {
        ref1 = cell[k], key = ref1[0], value = ref1[1];
        callback(key, value);
      }
    }
  };

  NodeHashMap.prototype.copy = function() {
    var cell, copied, key_value;
    copied = new NodeHashMap(1);
    copied.count = this.count;
    copied.maxFillRatio = this.maxFillRatio;
    copied.sizeMask = this.sizeMask;
    copied.table = (function() {
      var j, len, ref, results;
      ref = this.table;
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        cell = ref[j];
        results.push((function() {
          var k, len1, results1;
          results1 = [];
          for (k = 0, len1 = cell.length; k < len1; k++) {
            key_value = cell[k];
            results1.push(key_value.slice(0));
          }
          return results1;
        })());
      }
      return results;
    }).call(this);
    return copied;
  };

  return NodeHashMap;

})();

exports.inverseChain = function(c, appendRewrite) {
  return appendInverseChain(unity, c, appendRewrite);
};

exports.appendInverseChain = appendInverseChain = function(a, c, appendRewrite) {
  var e_p, elementsWithPowers, j, len;
  elementsWithPowers = node2array(c);
  elementsWithPowers.reverse();
  for (j = 0, len = elementsWithPowers.length; j < len; j++) {
    e_p = elementsWithPowers[j];
    e_p[1] *= -1;
  }
  return appendRewrite(a, elementsWithPowers);
};

exports.appendChain = appendChain = function(c1, c2, appendRewrite) {
  return appendRewrite(c1, node2array(c2));
};


},{"./matrix3.coffee":11}],21:[function(require,module,exports){
var CodeGenerator, JsCodeGenerator, NodeA, NodeB, RewriteRuleset, appendSimple, chain2string, chainEquals, collectPowers, elementOrder, elementPowerRange, eliminateFinalA, extendLastPowerRewriteTable, groupByPower, groupPowersVd, makeAppendRewrite, makeAppendRewriteRef, mod, newNode, node2array, nodeConstructors, otherElem, powerRewriteRules, ref, repeat, repeatRewrite, reverseShortlexLess, reverseSuffixTable, showNode, string2chain, tailInRewriteTable, takeLastA, ungroupPowersVd, unity, vdRule,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

RewriteRuleset = require("./knuth_bendix.coffee").RewriteRuleset;

ref = require("./vondyck_chain.coffee"), unity = ref.unity, NodeA = ref.NodeA, NodeB = ref.NodeB, chainEquals = ref.chainEquals, appendSimple = ref.appendSimple, nodeConstructors = ref.nodeConstructors, newNode = ref.newNode, reverseShortlexLess = ref.reverseShortlexLess, showNode = ref.showNode, node2array = ref.node2array;

collectPowers = function(elemsWithPowers) {

  /* List (elem, power::int) -> List (elem, power::int)
   */
  var elem, grouped, j, len, newPower, power, ref1;
  grouped = [];
  for (j = 0, len = elemsWithPowers.length; j < len; j++) {
    ref1 = elemsWithPowers[j], elem = ref1[0], power = ref1[1];
    if (grouped.length === 0) {
      grouped.push([elem, power]);
    } else if (grouped[grouped.length - 1][0] === elem) {
      newPower = grouped[grouped.length - 1][1] + power;
      if (newPower !== 0) {
        grouped[grouped.length - 1][1] = newPower;
      } else {
        grouped.pop();
      }
    } else {
      grouped.push([elem, power]);
    }
  }
  return grouped;
};

exports.groupByPower = groupByPower = function(s) {
  var i, j, last, lastPow, ref1, result, x;
  last = null;
  lastPow = null;
  result = [];
  for (i = j = 0, ref1 = s.length; 0 <= ref1 ? j < ref1 : j > ref1; i = 0 <= ref1 ? ++j : --j) {
    x = s[i];
    if (last === null) {
      last = x;
      lastPow = 1;
    } else {
      if (x === last) {
        lastPow += 1;
      } else {
        result.push([last, lastPow]);
        last = x;
        lastPow = 1;
      }
    }
  }
  if (last !== null) {
    result.push([last, lastPow]);
  }
  return result;
};

exports.groupPowersVd = groupPowersVd = function(s) {
  var j, len, p, ref1, ref2, results, x;
  ref1 = groupByPower(s);
  results = [];
  for (j = 0, len = ref1.length; j < len; j++) {
    ref2 = ref1[j], x = ref2[0], p = ref2[1];
    if (x.toUpperCase() === x) {
      results.push([x.toLowerCase(), -p]);
    } else {
      results.push([x, p]);
    }
  }
  return results;
};


/*
#Every string is a sequence of powers of 2 operators: A and B.
#powers are limited to be in range -n/2 ... n/2 and -m/2 ... m/2
 *
 *
#rewrite rules work on these pow cahins:
 *
 *
#Trivial rewrites:
 *   a^-1 a       -> e
 *   b^-1 b       -> e
 *   a a^-1       -> e
 *   b b^-1       -> e
 *
#Power modulo rewrites.
 *   b^2  -> b^-2
 *   b^-3 -> b
 *   #allower powers: -2, -1, 1
 *   #rewrite rule: (p + 2)%4-2
 *
 *   a^2  -> a^-2
 *   a^-3 -> a
 *   #allower powers: -2, -1, 1
 *   #rewrite rule: (p+2)%4-2
 *
#Non-trivial rewrites
 * Ending with b
 *   a b  -> b^-1 a^-1
 *   b^-1 a^-1 b^-1       -> a       *
 *   a b^-2       -> b^-1 a^-1 b     *
 *   b a^-1 b^-1  -> b^-2 a          *
 *
 * Ending with a
 *   b a  -> a^-1 b^-1
 *   a^-1 b^-1 a^-1       -> b       *
 *   a b^-1 a^-1  -> a^-2 b          *
 *   b a^-2       -> a^-1 b^-1 a     *
 *
 *
#As a tree, sorted in reverse order. Element in square braces is "eraser" for the last element in the matching pattern.
 *
#- Root B
 *  - b^-2   
 *    - a       REW: [a^-1] b^-1 a^-1 b
 *  - b^-1
 *    - a^-1
 *       - b    REW: [b^-1] b^-2 a
 *       - b^-1 REW: [b] a
 *  - b
 *    - a       REW: [a^-1] b^-1 a^-1
 *
#- Root A
 *  - a^-2 
 *    - b       REW: [b^-1] a^-1 b^-1 a
 *  - a^-1
 *    - b^-1
 *       - a    REW: [a^-1] a^-2 b
 *       - a^-1 REW: [a] b
 *  - a
 *    - b       REW: [b^-1] a^-1 b^-1
 *   
#Idea: 2 rewriters. For chains ending with A and with B.
#Chains are made in functional style, stored from end. 
 *
 *
#See sample_rewriter.js for working code.
 *
 */

otherElem = function(e) {
  return {
    'a': 'b',
    'b': 'a'
  }[e];
};

mod = function(x, y) {
  return (x % y + y) % y;
};

exports.JsCodeGenerator = JsCodeGenerator = (function() {
  function JsCodeGenerator(debug, pretty) {
    if (debug == null) {
      debug = false;
    }
    if (pretty == null) {
      pretty = false;
    }
    this.out = [];
    this.ident = 0;
    this.debug = debug;
    this.pretty = pretty;
  }

  JsCodeGenerator.prototype.get = function() {
    var code;
    if (this.ident !== 0) {
      throw new RuntimeError("Attempt to get generated code while not finished");
    }
    code = this.out.join("");
    this.reset();
    return code;
  };

  JsCodeGenerator.prototype.reset = function() {
    return this.out = [];
  };

  JsCodeGenerator.prototype.line = function(text) {
    var i, j, ref1;
    if (!this.debug && text.match(/^console\.log/)) {
      return;
    }
    if (!this.pretty && text.match(/^\/\//)) {
      return;
    }
    if (this.pretty || text.match(/\/\//)) {
      for (i = j = 0, ref1 = this.ident; 0 <= ref1 ? j < ref1 : j > ref1; i = 0 <= ref1 ? ++j : --j) {
        this.out.push("    ");
      }
    }
    this.out.push(text);
    return this.out.push(this.pretty ? "\n" : " ");
  };

  JsCodeGenerator.prototype.if_ = function(conditionText) {
    return this.line("if(" + conditionText + ")");
  };

  JsCodeGenerator.prototype.op = function(expressionText) {
    return this.line(expressionText + ";");
  };

  JsCodeGenerator.prototype.block = function(callback) {
    this.line("{");
    this.ident += 1;
    callback();
    this.ident -= 1;
    return this.line("}");
  };

  return JsCodeGenerator;

})();

exports.CodeGenerator = CodeGenerator = (function(superClass) {
  extend(CodeGenerator, superClass);

  function CodeGenerator(rewriteTable, out, debug, pretty) {
    var powerRewrites, rangeA, rangeB;
    if (debug == null) {
      debug = false;
    }
    if (pretty == null) {
      pretty = false;
    }
    CodeGenerator.__super__.constructor.call(this, debug, pretty);
    powerRewrites = powerRewriteRules(rewriteTable);
    rangeA = elementPowerRange(powerRewrites, 'a');
    rangeB = elementPowerRange(powerRewrites, 'b');
    this.minPower = {
      'a': rangeA[0],
      'b': rangeB[0]
    };
    this.elementOrder = {
      'a': elementOrder(powerRewrites, 'a'),
      'b': elementOrder(powerRewrites, 'b')
    };
    rewriteTable = rewriteTable.copy();
    extendLastPowerRewriteTable(rewriteTable, 'a', rangeA[0], rangeA[1]);
    extendLastPowerRewriteTable(rewriteTable, 'b', rangeB[0], rangeB[1]);
    this.rewriteTable = rewriteTable;
    this.suffixTree = reverseSuffixTable(rewriteTable);
  }

  CodeGenerator.prototype.generateAppendRewriteOnce = function() {
    this.line("(function(chain, stack )");
    this.block((function(_this) {
      return function() {
        _this.line("if (stack.length === 0) {throw new Error('empty stack');}");
        _this.op("var _e = stack.pop(), element = _e[0], power = _e[1]");
        _this.line("if (chain === unity)");
        _this.block(function() {
          _this.line("//empty chain");
          _this.line('console.log("Append to empth chain:"+_e);');
          _this.line("var order=(element==='a')?" + _this.elementOrder['a'] + ":" + _this.elementOrder['b'] + ";");
          _this.line("var lowestPow=(element==='a')?" + _this.minPower['a'] + ":" + _this.minPower['b'] + ";");
          return _this.line('chain = newNode( element, mod(power-lowestPow, order)+lowestPow, chain);');
        });
        _this.line('else');
        _this.block(function() {
          return _this.generateMain();
        });
        return _this.line("return chain;");
      };
    })(this));
    this.line(")");
    return this.get();
  };

  CodeGenerator.prototype.generateMain = function() {
    this.line('if (chain.letter==="a")');
    this.block((function(_this) {
      return function() {
        _this.line('console.log("Append "+JSON.stringify(_e)+" to chain ending with A:"+showNode(chain));');
        _this.generatePowerAccumulation("a");
        return _this.generateRewriterFrom("b");
      };
    })(this));
    this.line('else if (chain.letter==="b")');
    this.block((function(_this) {
      return function() {
        _this.line('console.log("Append "+JSON.stringify(_e)+" to chain ending with B:"+showNode(chain));');
        _this.generatePowerAccumulation("b");
        return _this.generateRewriterFrom("a");
      };
    })(this));
    return this.line('else throw new Error("Chain neither a nor b?");');
  };

  CodeGenerator.prototype.generatePowerAccumulation = function(letter) {
    this.line("if (element === \"" + letter + "\")");
    return this.block((function(_this) {
      return function() {
        var lowestPow, order;
        _this.line("console.log(\"    element is " + letter + "\");");
        lowestPow = _this.minPower[letter];
        order = _this.elementOrder[letter];
        _this.line("var newPower = ((chain.p + power - " + lowestPow + ")%" + order + "+" + order + ")%" + order + "+" + lowestPow + ";");
        _this.line("chain = chain.t;");
        _this.line('if (newPower !== 0)');
        _this.block(function() {
          var nodeClass;
          nodeClass = _this._nodeClass(letter);
          _this.line('console.log("    new power is "+newPower);');
          return _this.line("stack.push(['" + letter + "', newPower]);");
        });
        if (_this.debug) {
          _this.line('else');
          return _this.block(function() {
            return _this.line('console.log("      power reduced to 0, new chain="+showNode(chain));');
          });
        }
      };
    })(this));
  };

  CodeGenerator.prototype.generateRewriterFrom = function(newElement) {

    /*Generate rewriters, when `newElement` is added, and it is not the same as the last element of the chain */
    this.line("else");
    return this.block((function(_this) {
      return function() {
        var mo, nodeConstructor, o;
        _this.line("//Non-trivial rewrites, when new element is " + newElement);
        nodeConstructor = _this._nodeClass(newElement);
        o = _this.elementOrder[newElement];
        mo = _this.minPower[newElement];
        _this.line("chain = new " + nodeConstructor + "((((power - " + mo + ")%" + o + "+" + o + ")%" + o + "+" + mo + "), chain);");
        return _this.generateRewriteBySuffixTree(newElement, _this.suffixTree, 'chain');
      };
    })(this));
  };

  CodeGenerator.prototype.generateRewriteBySuffixTree = function(newElement, suffixTree, chain) {
    var compOperator, e_p, e_p_str, elem, elemPower, first, isLeaf, results, subTable, suf;
    first = true;
    results = [];
    for (e_p_str in suffixTree) {
      subTable = suffixTree[e_p_str];
      e_p = JSON.parse(e_p_str);
      this.line("// e_p = " + (JSON.stringify(e_p)));
      elem = e_p[0], elemPower = e_p[1];
      if (elem !== newElement) {
        continue;
      }
      if (!first) {
        this.line("else");
      } else {
        first = false;
      }
      isLeaf = subTable["rewrite"] != null;
      if (isLeaf) {
        compOperator = elemPower < 0 ? "<=" : ">=";
        suf = subTable["original"];
        this.line("//reached suffix: " + suf);
        this.line("if (" + chain + ".p" + compOperator + elemPower + ")");
        this.line("// before call leaf: ep = " + elemPower);
        results.push(this.block((function(_this) {
          return function() {
            return _this.generateLeafRewrite(elem, elemPower, subTable["rewrite"], chain);
          };
        })(this)));
      } else {
        this.line("if (" + chain + ".p === " + elemPower + ")");
        results.push(this.block((function(_this) {
          return function() {
            _this.line("if (" + chain + ".t)");
            return _this.block(function() {
              return _this.generateRewriteBySuffixTree(otherElem(newElement), subTable, chain + ".t");
            });
          };
        })(this)));
      }
    }
    return results;
  };

  CodeGenerator.prototype.generateLeafRewrite = function(elem, elemPower, rewrite, chain) {
    var e, p, revRewrite, sPowers;
    if (elemPower == null) {
      throw new Error("power?");
    }
    this.line("console.log( 'Leaf: rewrite this to " + rewrite + "');");
    this.line("//elem: " + elem + ", power: " + elemPower + ": rewrite this to " + rewrite);
    this.line("console.log( 'Truncate chain from ' + showNode(chain) + ' to ' + showNode(" + chain + ") + ' with additional elem: " + elem + "^" + (-elemPower) + "' );");
    this.line("chain = " + chain + ";");
    this.line("//Append rewrite");
    revRewrite = rewrite.slice(0);
    revRewrite.reverse();
    revRewrite.push([elem, -elemPower]);
    sPowers = ((function() {
      var j, len, ref1, ref2, results;
      ref1 = collectPowers(revRewrite);
      results = [];
      for (j = 0, len = ref1.length; j < len; j++) {
        ref2 = ref1[j], e = ref2[0], p = ref2[1];
        results.push("[\"" + e + "\"," + p + "]");
      }
      return results;
    })()).join(",");
    return this.line("stack.push(" + sPowers + ");");
  };

  CodeGenerator.prototype._nodeClass = function(letter) {
    return {
      "a": "NodeA",
      "b": "NodeB"
    }[letter];
  };

  return CodeGenerator;

})(JsCodeGenerator);

powerRewriteRules = function(rewriteTable) {
  var gKey, gRewrite, j, key, len, p, p1, ref1, ref2, ref3, ref4, result, rewrite, x, x_;
  result = [];
  ref1 = rewriteTable.items();
  for (j = 0, len = ref1.length; j < len; j++) {
    ref2 = ref1[j], key = ref2[0], rewrite = ref2[1];
    gKey = groupPowersVd(key);
    gRewrite = groupPowersVd(rewrite);
    if (gKey.length === 1 && gRewrite.length === 1) {
      ref3 = gKey[0], x = ref3[0], p = ref3[1];
      ref4 = gRewrite[0], x_ = ref4[0], p1 = ref4[1];
      if (x === x_) {
        result.push([x, p, p1]);
      }
    }
  }
  return result;
};

elementPowerRange = function(powerRewrites, letter) {

  /*search for rules of type a^n -> a^m */
  var maxPower, minPower, p1, p2, powers, x;
  powers = (function() {
    var j, len, ref1, results;
    results = [];
    for (j = 0, len = powerRewrites.length; j < len; j++) {
      ref1 = powerRewrites[j], x = ref1[0], p1 = ref1[1], p2 = ref1[2];
      if (x === letter) {
        results.push(p1);
      }
    }
    return results;
  })();
  if (powers.length === 0) {
    throw new Error("No power rewrites for " + letter);
  }
  minPower = Math.min.apply(Math, powers) + 1;
  maxPower = Math.max.apply(Math, powers) - 1;
  return [minPower, maxPower];
};

elementOrder = function(powerRewrites, letter) {
  var orders, p1, p2, x;
  orders = (function() {
    var j, len, ref1, results;
    results = [];
    for (j = 0, len = powerRewrites.length; j < len; j++) {
      ref1 = powerRewrites[j], x = ref1[0], p1 = ref1[1], p2 = ref1[2];
      if (x === letter) {
        results.push(Math.abs(p1 - p2));
      }
    }
    return results;
  })();
  if (orders.length === 0) {
    throw new Error("No power rewrites for " + letter);
  }
  return Math.min.apply(Math, orders);
};

reverseSuffixTable = function(ruleset, ignorePowers) {
  var e_p, e_p_str, gRewrite, gSuffix, j, l, len, ref1, ref2, revTable, rewrite, suffix, table, table1;
  if (ignorePowers == null) {
    ignorePowers = true;
  }
  revTable = {};
  ref1 = ruleset.items();
  for (j = 0, len = ref1.length; j < len; j++) {
    ref2 = ref1[j], suffix = ref2[0], rewrite = ref2[1];
    gSuffix = groupPowersVd(suffix);
    gRewrite = groupPowersVd(rewrite);
    if (ignorePowers) {
      if (gSuffix.length === 1 && gRewrite.length === 1 && gSuffix[0][0] === gRewrite[0][0]) {
        continue;
      }
      if (gSuffix.length === 2 && gRewrite.length === 0) {
        continue;
      }
    }
    table = revTable;
    for (l = gSuffix.length - 1; l >= 0; l += -1) {
      e_p = gSuffix[l];
      e_p_str = JSON.stringify(e_p);
      if (table.hasOwnProperty(e_p_str)) {
        table = table[e_p_str];
      } else {
        table1 = {};
        table[e_p_str] = table1;
        table = table1;
      }
    }
    table["rewrite"] = gRewrite;
    table["original"] = gSuffix;
  }
  return revTable;
};

exports.repeatRewrite = repeatRewrite = function(appendRewriteOnce) {
  return function(chain, stack) {
    while (stack.length > 0) {
      chain = appendRewriteOnce(chain, stack);
    }
    return chain;
  };
};

exports.canAppend = function(appendRewriteOnce) {
  return function(chain, element, power) {
    var stack;
    stack = [[element, power]];
    appendRewriteOnce(chain, stack);
    return stack.length === 0;
  };
};

exports.makeAppendRewrite = makeAppendRewrite = function(s) {
  var appendRewrite, appendRewriteOnce, g, rewriterCode;
  g = new CodeGenerator(s);
  g.debug = false;
  rewriterCode = g.generateAppendRewriteOnce();
  appendRewriteOnce = eval(rewriterCode);
  if (appendRewriteOnce == null) {
    throw new Error("Rewriter failed to compile");
  }
  appendRewrite = repeatRewrite(appendRewriteOnce);
  return appendRewrite;
};

repeat = function(pattern, count) {
  var result;
  if (count < 1) {
    return '';
  }
  result = '';
  while (count > 1) {
    if (count & 1) {
      result += pattern;
    }
    count >>= 1;
    pattern += pattern;
  }
  return result + pattern;
};

exports.vdRule = vdRule = function(n, m, k) {
  var r;
  if (k == null) {
    k = 2;
  }

  /*
   * Create initial ruleset for von Dyck group with inverse elements
   * https://en.wikipedia.org/wiki/Triangle_group#von_Dyck_groups
   */
  r = {
    'aA': "",
    'Aa': "",
    'bB': "",
    'Bb': ""
  };
  r[repeat('BA', k)] = "";
  r[repeat('ab', k)] = "";
  r[repeat('A', n)] = "";
  r[repeat('a', n)] = "";
  r[repeat('B', m)] = "";
  r[repeat('b', m)] = "";
  return new RewriteRuleset(r);
};

exports.string2chain = string2chain = function(s) {
  var grouped;
  grouped = groupPowersVd(s);
  grouped.reverse();
  return appendSimple(unity, grouped);
};

exports.chain2string = chain2string = function(chain) {
  var e, p, s;
  s = "";
  while (chain !== unity) {
    e = chain.letter;
    p = chain.p;
    if (p < 0) {
      e = e.toUpperCase();
      p = -p;
    }
    s = repeat(e, p) + s;
    chain = chain.t;
  }
  return s;
};

ungroupPowersVd = function(stack) {
  var e, i, j, l, len, p, ref1, ref2, ungroupedStack;
  ungroupedStack = [];
  for (j = 0, len = stack.length; j < len; j++) {
    ref1 = stack[j], e = ref1[0], p = ref1[1];
    if (p < 0) {
      p = -p;
      e = e.toUpperCase();
    }
    for (i = l = 0, ref2 = p; l < ref2; i = l += 1) {
      ungroupedStack.push(e);
    }
  }
  return ungroupedStack;
};

exports.makeAppendRewriteRef = makeAppendRewriteRef = function(rewriteRule) {
  return function(chain, stack) {
    var sChain, ungroupedStack;
    sChain = chain2string(chain);
    ungroupedStack = ungroupPowersVd(stack);
    ungroupedStack.reverse();
    return string2chain(rewriteRule.appendRewrite(sChain, ungroupedStack.join('')));
  };
};

takeLastA = function(chain) {
  if ((chain === unity) || (chain.letter !== 'a')) {
    return chain;
  } else {
    return chain.t;
  }
};

exports.eliminateFinalA = eliminateFinalA = function(chain, appendRewrite, orderA) {
  var bestChain, chain_i, i, j, ref1;
  chain = takeLastA(chain);
  if (chain === unity) {
    return chain;
  }
  bestChain = chain;
  for (i = j = 1, ref1 = orderA; 1 <= ref1 ? j < ref1 : j > ref1; i = 1 <= ref1 ? ++j : --j) {
    chain_i = appendRewrite(chain, [['a', i]]);
    if (reverseShortlexLess(chain_i, bestChain)) {
      bestChain = chain_i;
    }
  }
  return bestChain;
};

exports.extendLastPowerRewriteTable = extendLastPowerRewriteTable = function(rewriteRule, element, minPower, maxPower) {
  var gRewrite, gSuffix, j, l, lastPower, len, newRewrite, newSuffix, p, power, ref1, ref2, ref3, ref4, ref5, rewrite, step, suffix;
  if (minPower > 0) {
    throw new Error("min power must be non-positive");
  }
  if (maxPower < 0) {
    throw new Error("max power must be non-negative");
  }
  ref1 = rewriteRule.items();
  for (j = 0, len = ref1.length; j < len; j++) {
    ref2 = ref1[j], suffix = ref2[0], rewrite = ref2[1];
    gSuffix = groupPowersVd(suffix);
    if (gSuffix.length === 0) {
      throw new Error('empty suffix!?');
    }
    if (gSuffix[gSuffix.length - 1][0] !== element) {
      continue;
    }
    gRewrite = groupPowersVd(rewrite);
    power = gSuffix[gSuffix.length - 1][1];
    step = power > 0 ? 1 : -1;
    lastPower = power > 0 ? maxPower : minPower;
    gRewrite.push([element, 0]);
    for (p = l = ref3 = power + step, ref4 = lastPower, ref5 = step; ref5 > 0 ? l <= ref4 : l >= ref4; p = l += ref5) {
      gSuffix[gSuffix.length - 1][1] = p;
      gRewrite[gRewrite.length - 1][1] = p - power;
      newSuffix = ungroupPowersVd(gSuffix).join('');
      newRewrite = ungroupPowersVd(collectPowers(gRewrite)).join('');
      if (!tailInRewriteTable(rewriteRule, newSuffix)) {
        rewriteRule.add(newSuffix, newRewrite);
      }
    }
  }
  return rewriteRule;
};

tailInRewriteTable = function(rewriteTable, s) {
  var j, ref1, suffixTail, suffixTailLen;
  for (suffixTailLen = j = 1, ref1 = s.length; j < ref1; suffixTailLen = j += 1) {
    suffixTail = s.substring(s.length - suffixTailLen);
    if (rewriteTable.has(suffixTail)) {
      return true;
    }
  }
  return false;
};

exports.makeAppendRewriteVerified = function(rewriteRule) {
  var appendRewrite, appendRewriteRef;
  appendRewriteRef = makeAppendRewriteRef(rewriteRule);
  appendRewrite = makeAppendRewrite(rewriteRule);
  return function(chain, stack) {
    var j, k, len, ref1, ref2, refValue, v, value;
    console.log("========= before verification =======");
    refValue = appendRewriteRef(chain, stack.slice(0));
    value = appendRewrite(chain, stack.slice(0));
    if (!chainEquals(refValue, value)) {
      ref1 = rewriteRule.items();
      for (j = 0, len = ref1.length; j < len; j++) {
        ref2 = ref1[j], k = ref2[0], v = ref2[1];
        console.log("  " + k + " -> " + v);
      }
      throw new Error("rewriter verification failed. args: chain = " + (showNode(chain)) + ", stack: " + (JSON.stringify(stack)) + ", refValue: " + (showNode(refValue)) + ", value: " + (showNode(value)));
    }
    return value;
  };
};


},{"./knuth_bendix.coffee":9,"./vondyck_chain.coffee":20}]},{},[2]);
