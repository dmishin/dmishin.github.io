// Generated by CoffeeScript 1.6.3
var Cells, cells, consolidateReports, consolidated, evaluateCellList, evaluateLabelledCellList, f, filterComposites, fs, makeDualGlider, mergeDualGliders, mergeNonUniqueNormalizations, mergeReport, merges, pth, revca, rule, rules, _doMergeNonUnique, _patternEvolutions, _ref;

fs = require("fs");

revca = require("../scripts-src/reversible_ca");

cells = require("../scripts-src/cells");

rules = require("../scripts-src/rules");

rule = rules.NamedRules.rotational1;

Cells = cells.Cells, evaluateCellList = cells.evaluateCellList, evaluateLabelledCellList = cells.evaluateLabelledCellList;

mergeReport = function(report_file, key2record) {
  var count, data, key, rec, record, result, _i, _len, _results;
  data = JSON.parse(fs.readFileSync(report_file));
  _results = [];
  for (_i = 0, _len = data.length; _i < _len; _i++) {
    record = data[_i];
    result = record.result, count = record.count, key = record.key;
    rec = key2record[key];
    if (rec != null) {
      _results.push(rec.count += count);
    } else {
      _results.push(key2record[key] = record);
    }
  }
  return _results;
};

consolidateReports = function(reports) {
  var key, key2record, record, report, _i, _len, _results;
  key2record = {};
  for (_i = 0, _len = reports.length; _i < _len; _i++) {
    report = reports[_i];
    mergeReport(report, key2record);
  }
  _results = [];
  for (key in key2record) {
    record = key2record[key];
    _results.push(record);
  }
  return _results;
};

filterComposites = function(records, rule) {
  var count, filtered, grps, key, rec, result, _i, _len;
  filtered = [];
  for (_i = 0, _len = consolidated.length; _i < _len; _i++) {
    rec = consolidated[_i];
    result = rec.result, count = rec.count, key = rec.key;
    grps = cells.splitPattern(rule, result.cells, result.period);
    if (grps.length === 1) {
      filtered.push(rec);
    }
  }
  return filtered;
};

makeDualGlider = function(glider, dx, dy) {
  var dx1, dy1, g1, _ref;
  g1 = Cells.transform(Cells.togglePhase(glider), [-1, 0, 0, 1]);
  dx1 = dx;
  dy1 = -dy;
  _ref = Cells.canonicalize_glider(g1, rule, dx1, dy1), g1 = _ref[0], dx1 = _ref[1], dy1 = _ref[2];
  if ((dx1 !== dx) || (dy1 !== dy)) {
    throw new Error("New glider moves in the different direction, that's wrong for rotational rule");
  }
  return Cells.normalize(g1);
};

mergeDualGliders = function(report) {
  var count, dual, dual_key, key, key2record, merged, record, result, _i, _len, _results;
  key2record = {};
  merged = 0;
  for (_i = 0, _len = report.length; _i < _len; _i++) {
    record = report[_i];
    result = record.result, count = record.count, key = record.key;
    dual = makeDualGlider(result.cells, result.dx, result.dy);
    if (key in key2record) {
      key2record[key].count += count;
      process.stderr.write("Duplicate entry: " + key + "\n");
    } else {
      dual_key = Cells.to_rle(dual);
      if (dual_key in key2record) {
        key2record[dual_key].count += count;
        merged += 1;
      } else {
        key2record[key] = record;
      }
    }
  }
  process.stderr.write("Merged records: " + merged + "\n");
  _results = [];
  for (key in key2record) {
    record = key2record[key];
    _results.push(record);
  }
  return _results;
};

mergeNonUniqueNormalizations = function(report, rule, mk_dual) {
  var filtered_report, gliders, key, key2gliders, merged, record, records, result, rle, _, _i, _len, _ref;
  merged = 0;
  filtered_report = [];
  key2gliders = {};
  for (_i = 0, _len = report.length; _i < _len; _i++) {
    record = report[_i];
    result = record.result;
    rle = record.key;
    key = "" + result.cells.length + " " + result.period + " " + result.dx + " " + result.dy;
    gliders = (_ref = key2gliders[key]) != null ? _ref : (key2gliders[key] = []);
    gliders.push(record);
  }
  for (_ in key2gliders) {
    records = key2gliders[_];
    if (records.length > 1) {
      merged += _doMergeNonUnique(records, rule, mk_dual, filtered_report);
    } else {
      filtered_report.push(records[0]);
    }
  }
  return [filtered_report, merged];
};

_patternEvolutions = function(cells, rule, period) {
  var cells_norm, evols, i, x, y, _i, _ref;
  cells = (function() {
    var _i, _len, _ref, _results;
    _results = [];
    for (_i = 0, _len = cells.length; _i < _len; _i++) {
      _ref = cells[_i], x = _ref[0], y = _ref[1];
      _results.push([x, y, 1]);
    }
    return _results;
  })();
  evols = [cells];
  if (typeof mk_dual !== "undefined" && mk_dual !== null) {
    evols.push(mk_dual(cells));
  }
  for (i = _i = 0, _ref = period - 1; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
    cells = evaluateLabelledCellList(rule, cells, i % 2);
    cells_norm = i % 2 === 1 ? cells : Cells.togglePhase(cells);
    evols.push(cells_norm);
  }
  return evols;
};

_doMergeNonUnique = function(records, rule, mk_dual, report) {
  var fig, fig_dual, key2record, merged, old_record, record, result, rle, _i, _j, _len, _len1, _ref;
  key2record = {};
  merged = 0;
  for (_i = 0, _len = records.length; _i < _len; _i++) {
    record = records[_i];
    result = record.result;
    rle = record.key;
    old_record = key2record[rle];
    if (old_record != null) {
      old_record.count += record.count;
      merged += 1;
    } else {
      report.push(record);
      _ref = _patternEvolutions(result.cells, rule, result.period);
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        fig = _ref[_j];
        rle = Cells.to_rle(Cells.normalize(fig));
        key2record[rle] = record;
        if (mk_dual != null) {
          fig_dual = mk_dual(fig, result.dx, result.dy);
          rle = Cells.to_rle(Cells.normalize(fig_dual));
          key2record[rle] = record;
        }
      }
    }
  }
  return merged;
};

pth = "/home/dim/Dropbox/Math/rev-ca/";

consolidated = consolidateReports((function() {
  var _i, _len, _ref, _results;
  _ref = ["report3.json", "report1.json", "report2.json", "report-128x128-chrome-big.json", "report-256x256-chrome-big.json"];
  _results = [];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    f = _ref[_i];
    _results.push(pth + f);
  }
  return _results;
})());

consolidated = filterComposites(consolidated, rule);

consolidated = mergeDualGliders(consolidated);

process.stderr.write("Total records after merge: " + consolidated.length + "\n");

process.stderr.write("Merging non-unique representations of a gliders\n");

_ref = mergeNonUniqueNormalizations(consolidated, rule, makeDualGlider), consolidated = _ref[0], merges = _ref[1];

process.stderr.write("   merged " + merges + " records; new size: " + consolidated.length + "\n");

fs.writeFileSync("consolidated-singlerot.json", JSON.stringify(consolidated));

process.stdout.write("Consolidation of results complete, " + consolidated.length + " patterns found\n");

/*
//@ sourceMappingURL=parsejson.map
*/
