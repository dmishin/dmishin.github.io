// CodeMirror 5 modes for wordgenx documents (.wgx) and style sheets (.wgxs).
// They follow the Pygments lexers in wordgenx/highlight.py, and add what an editor wants on
// top: options of commands, math, fenced code blocks, list markers, tables and emphasis.

(function () {
  const LABEL = /^[A-Za-z][\w:.-]*\w/;
  const MATH_COMMANDS = new Set(["m", "math"]);
  const RAW_COMMANDS = new Set(["raw", "field", "image", "url", "include", "use", "embed"]);

  CodeMirror.defineMode("wgx", function (config) {
    function comment(stream) {
      stream.skipToEnd();
      return "comment";
    }

    // At a `%`: a comment only at the start of a line or after whitespace.
    function isComment(stream) {
      if (stream.peek() !== "%") return false;
      const before = stream.string.charAt(stream.pos - 1);
      return stream.pos === 0 || /\s/.test(before);
    }

    function optionValue(stream, state) {
      if (stream.match(/^"(\\\\|\\"|[^"\n])*"?/)) return "string";
      if (stream.match(/^#[0-9A-Fa-f]{6}\b/)) return "number";
      if (stream.match(/^theme\.[A-Za-z0-9]+(\.(lighter|darker)\(\d+%\))?/)) return "builtin";
      if (stream.match(/^-?\d+(\.\d+)?(pt|cm|mm|in|pc|em|fr|twip|emu|%)?/)) return "number";
      if (stream.match(/^(on|off|true|false|yes|no)\b/)) return "atom";
      return null;
    }

    function inOptions(stream, state) {
      if (stream.eatSpace()) return null;
      if (isComment(stream)) return comment(stream);
      const ch = stream.peek();
      if (ch === "]" && state.optDepth === 1) {
        stream.next();
        state.optDepth = 0;
        state.afterCommand = true; // a body may follow: \cmd[...]{...}
        return "bracket";
      }
      if (ch === "(" || ch === "[") { stream.next(); state.optDepth++; return "bracket"; }
      if (ch === ")" || ch === "]") { stream.next(); state.optDepth--; return "bracket"; }
      if (ch === "{") {
        // a markup or text value: text={...}; track it as a nested level
        stream.next(); state.optDepth++; return "bracket";
      }
      if (ch === "}") { stream.next(); state.optDepth--; return "bracket"; }
      if (ch === "," || ch === "=") { stream.next(); return "operator"; }
      if (stream.match(/^#[A-Za-z][\w-]*/)) return "variable-3";
      if (stream.match(/^[A-Za-z][\w.-]*(?=\s*=)/)) return "attribute";
      const value = optionValue(stream, state);
      if (value) return value;
      if (stream.match(/^\\./)) return "string-2";
      stream.next();
      return "string";
    }

    // The body of \m{...} and \math{...}: LaTeX, until the matching brace.
    function inMath(stream, state) {
      if (stream.match(/^\\[A-Za-z]+/)) return "math-command";
      if (stream.match(/^\\./)) return "math";
      const ch = stream.next();
      if (ch === "{") state.mathDepth++;
      else if (ch === "}" && --state.mathDepth === 0) {
        state.mode = null;
        return "bracket";
      }
      return "math";
    }

    function displayMath(stream, state) {
      if (stream.match("$$")) {
        state.mode = null;
        stream.match(/^\s*\{#[A-Za-z][\w:.-]*\}/);
        return "math-delim";
      }
      if (stream.match(/^\\[A-Za-z]+/)) return "math-command";
      stream.next();
      return "math";
    }

    function fenced(stream, state) {
      if (stream.sol() && stream.match(/^\s*```\s*$/)) {
        state.mode = null;
        return "fence";
      }
      stream.skipToEnd();
      return "code-block";
    }

    function text(stream, state) {
      const sol = stream.sol();
      const afterCommand = state.afterCommand;
      state.afterCommand = false;

      if (afterCommand && stream.peek() === "[") {
        stream.next();
        state.optDepth = 1;
        return "bracket";
      }
      if (afterCommand && stream.peek() === "{" && state.mathNext) {
        stream.next();
        state.mathNext = false;
        state.mode = "math";
        state.mathDepth = 1;
        return "bracket";
      }
      state.mathNext = afterCommand && state.mathNext;

      if (sol) {
        if (stream.match(/^```/)) {
          stream.skipToEnd();
          state.mode = "fenced";
          return "fence";
        }
        if (stream.match("$$")) {
          state.mode = "display-math";
          return "math-delim";
        }
        if (stream.match(/^=+\*?(?=\s)/)) {
          state.heading = true;
          return "header";
        }
        if (stream.match(/^\s*([-*+]|\d+\.|[a-z]\.|[ivx]+\.)(?=\s)/)) return "list";
        if (stream.match(/^\s*\|/)) return "table";
      }
      if (state.heading) {
        if (stream.match(/^\{#[A-Za-z][\w:.-]*\}/)) return "label";
        if (isComment(stream)) return comment(stream);
        stream.next();
        if (stream.eol()) state.heading = false;
        return "header";
      }
      if (isComment(stream)) return comment(stream);

      if (stream.match(/^\\[\\%{}\[\]*_`$#=|@~]/)) return "string-2";
      const command = stream.match(/^\\([A-Za-z][A-Za-z0-9-]*)\*?/);
      if (command) {
        state.afterCommand = true;
        state.mathNext = MATH_COMMANDS.has(command[1]);
        if (RAW_COMMANDS.has(command[1])) state.mathNext = false;
        return BLOCK.has(command[1]) ? "keyword block" : "keyword";
      }
      if (stream.match(/^\{#[A-Za-z][\w:.-]*\}/)) return "label";
      if (stream.peek() === "@") {
        const prev = stream.string.charAt(stream.pos - 1);
        if (stream.pos === 0 || /[\s(\[{]/.test(prev)) {
          stream.next();
          if (stream.match(LABEL)) return "label";
          return null;
        }
      }
      if (stream.match(/^#[A-Za-z][\w-]*/)) return "variable-3";
      if (stream.match(/^`[^`\n]*`/)) return "code";
      if (stream.match(/^<https?:\/\/[^>\s]+>/)) return "link";
      if (stream.match(/^\[[^\]\n]*\]\([^)\n]*\)/)) return "link";

      // *strong* and _emphasis_: open at the start of a word, close at the end of one.
      const ch = stream.peek();
      if (ch === "*" || ch === "_") {
        const prev = stream.string.charAt(stream.pos - 1);
        const atWordStart = stream.pos === 0 || !/[\w]/.test(prev);
        const re = ch === "*" ? /^\*(?=\S)([^*\n]*?\S)?\*(?!\w)/ : /^_(?=\S)([^_\n]*?\S)?_(?!\w)/;
        if (atWordStart && stream.match(re)) return ch === "*" ? "strong" : "em";
      }
      if (ch === "~" || stream.match(/^-{2,3}/)) {
        if (ch === "~") stream.next();
        return "typo";
      }
      if (ch === "{" || ch === "}") {
        stream.next();
        return "bracket";
      }
      stream.next();
      stream.eatWhile(/[^\\%{}\[\]`@#*_~<\-\s]/);
      return null;
    }

    const BLOCK = new Set([
      "p", "table", "row", "cell", "section", "header", "footer", "list", "figure", "caption",
      "document", "meta", "settings", "use", "include", "define", "let", "toc", "align",
      "bibliography", "styles", "columns", "textbox", "index",
    ]);

    return {
      startState() {
        return {
          mode: null, optDepth: 0, mathDepth: 0, afterCommand: false, mathNext: false,
          heading: false,
        };
      },
      copyState(s) {
        return { ...s };
      },
      token(stream, state) {
        if (stream.sol()) state.heading = false;
        if (state.mode === "fenced") return fenced(stream, state);
        if (state.mode === "display-math") return displayMath(stream, state);
        if (state.mode === "math") return inMath(stream, state);
        if (state.optDepth > 0) return inOptions(stream, state);
        return text(stream, state);
      },
      blankLine(state) {
        state.heading = false;
      },
      lineComment: "%",
    };
  });

  CodeMirror.defineMode("wgxs", function () {
    const KEYWORDS = /^(defaults|paragraph|character|linked|table|numbering|modify|replace|level)\b/;
    const CONDITIONS =
      /^(header-row|first-row|last-row|first-column|last-column|banded-rows|banded-columns|odd|even|top-left-cell|top-right-cell|bottom-left-cell|bottom-right-cell)\b/;
    return {
      token(stream) {
        if (stream.eatSpace()) return null;
        if (stream.peek() === "%" && (stream.pos === 0 || /\s/.test(stream.string.charAt(stream.pos - 1)))) {
          stream.skipToEnd();
          return "comment";
        }
        if (stream.match(KEYWORDS)) return "keyword";
        if (stream.match(CONDITIONS)) return "keyword";
        if (stream.match(/^"(\\\\|\\"|[^"\n])*"?/)) return "string";
        if (stream.match(/^#[0-9A-Fa-f]{6}\b/)) return "number";
        if (stream.match(/^theme\.[A-Za-z0-9]+(\.(lighter|darker)\(\d+%\))?/)) return "builtin";
        if (stream.match(/^[A-Za-z][\w.-]*(?=\s*:)/)) return "attribute";
        if (stream.match(/^-?\d+(\.\d+)?(pt|cm|mm|in|pc|em|fr|%)?/)) return "number";
        if (stream.match(/^[{}();:,=]/)) return "bracket";
        stream.next();
        stream.eatWhile(/[^\s{}();:,="%#]/);
        return null;
      },
      lineComment: "%",
    };
  });

  CodeMirror.defineMIME("text/x-wgx", "wgx");
  CodeMirror.defineMIME("text/x-wgxs", "wgxs");
})();
