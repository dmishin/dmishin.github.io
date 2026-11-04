"""Chemical formula preprocessor.

Replaces  \\ce{...}  in page source with plain HTML (<sub>/<sup>), before
Markdown runs. Code blocks, inline code and math ($...$, $$...$$, \\(...\\),
\\[...\\]) are left untouched, so \\ce inside math still goes to MathJax/mhchem.

Syntax (space separated tokens):
    \\ce{2H2 + O2 -> 2H2O}        coefficients, subscripts, arrows
    \\ce{Ca(OH)2}  \\ce{CuSO4.5H2O} groups, hydrates ('.' or '*' -> '·')
    \\ce{Na+}  \\ce{Cl-}  \\ce{e-}   a trailing + or - is a charge
    \\ce{Fe^3+}  \\ce{SO4^{2-}}     other charges need ^  (Fe3+ would be Fe₃⁺)
    \\ce{X_{n}}                    explicit subscript
Arrows: ->  <-  <->  <=>  =
"""
import html
import re

ARROWS = {"->": "→", "<-": "←", "<->": "↔", "<=>": "⇌", "=": "="}

_PROTECTED = re.compile(r"""
    (?P<fence>(?ms:^(?P<f>```|~~~).*?^(?P=f)[ \t]*$))
  | (?P<code>(?P<bt>`+)[^\n]+?(?P=bt))
  | (?P<dmath>(?s:\$\$.+?\$\$))
  | (?P<bmath>(?s:\\\[.+?\\\]))
  | (?P<pmath>\\\([^\n]+?\\\))
  | (?P<imath>(?<![\\$])\$(?![\s$])[^\n$]+?(?<![\s\\])\$)
  | \\ce\{(?P<ce>(?:[^{}]|\{[^{}]*\})*)\}
""", re.X)


def preprocess(text):
    """Replace every \\ce{...} outside code and math with HTML."""
    def repl(m):
        if m.group("ce") is not None:
            return render(m.group("ce"))
        return m.group(0)
    return _PROTECTED.sub(repl, text)


def render(formula):
    """Render one formula (contents of \\ce{...}) to an HTML span."""
    parts = []
    for tok in formula.split():
        if tok in ARROWS:
            parts.append(f'<span class="chem-arrow">{ARROWS[tok]}</span>')
        elif tok == "+":
            parts.append("+")
        else:
            parts.append(_species(tok))
    return '<span class="chem">' + " ".join(parts) + "</span>"


def _sub(s):
    return f"<sub>{html.escape(s)}</sub>"


def _sup(s):
    return f"<sup>{html.escape(s).replace('-', '−')}</sup>"


def _species(tok):
    out = []
    i, n = 0, len(tok)
    m = re.match(r"\d+(?:/\d+)?(?=[A-Za-z(\[])", tok)   # stoichiometric coefficient
    if m:
        out.append(m.group())
        i = m.end()
    while i < n:
        c = tok[i]
        prev = tok[i - 1] if i else ""
        if c in "^_":
            m = re.match(r"[\^_](?:\{([^}]*)\}|(\d*[+-]|\d+))", tok[i:])
            if m:
                val = m.group(1) if m.group(1) is not None else m.group(2)
                out.append(_sup(val) if c == "^" else _sub(val))
                i += m.end()
                continue
        if c.isdigit() and (prev.isalpha() or prev in ")]"):
            j = i
            while j < n and tok[j].isdigit():
                j += 1
            out.append(_sub(tok[i:j]))
            i = j
            continue
        if c in "+-" and i == n - 1 and i > 0:
            out.append(_sup(c))
        elif c in ".*" and i + 1 < n and (tok[i + 1].isdigit() or tok[i + 1].isupper()):
            out.append("·")
        else:
            out.append(html.escape(c))
        i += 1
    return "".join(out)


if __name__ == "__main__":
    import sys
    print(preprocess(" ".join(sys.argv[1:]) or r"\ce{2H2 + O2 -> 2H2O}"))
