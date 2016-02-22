// Generated by CoffeeScript 1.6.3
(function(exports) {
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
  return exports.getCanvasCursorPosition1 = function(e, canvas) {
    var dbody, delem, x, y;
    if (e.type === "touchmove" || e.type === "touchstart" || e.type === "touchend") {
      x = e.touches[0].pageX;
      y = e.touches[0].pageY;
    } else if (e.pageX != null) {
      x = e.pageX;
      y = e.pageY;
    } else {
      dbody = document.body;
      delem = document.documentElement;
      x = e.clientX + dbody.scrollLeft + delem.scrollLeft;
      y = e.clientY + dbody.scrollTop + delem.scrollTop;
    }
    x -= canvas.offsetLeft;
    y -= canvas.offsetTop;
    return [x, y];
  };
})(this["canvas_util"] = {});

/*
//@ sourceMappingURL=canvas_util.map
*/
