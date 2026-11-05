"""Chemical formula preprocessor (simplechem syntax).

Replaces  \\ce{...}  in page source with plain HTML before Markdown runs.
Code blocks, inline code and math ($...$, $$...$$, \\(...\\), \\[...\\]) are left
untouched, so \\ce inside math still goes to MathJax/mhchem.

Syntax (same as markdown-simplechem):
    \\ce{2KOH + H2SO4 -> K2SO4 + 2H2O}   numbers right after a name, bracket or
                                         superscript become subscripts; others
                                         (coefficients) stay as they are
    \\ce{CuSO4*5H2O}  \\ce{Na2CO3*?H2O}   '*' is a middle dot, '?' counts as a number
    \\ce{K^+  O^(2-)  Fe^{3+}  M^I2}      superscript: ^(text), ^{text} or ^char
    \\ce{X_{n}}                          explicit subscript
    ->  →     <-  ←     <->  ⇄     <>  <=>  ⇌     hnu  hν
"""
import html
import re

_PROTECTED = re.compile(r"""
    (?P<fence>(?ms:^(?P<f>```|~~~).*?^(?P=f)[ \t]*$))
  | (?P<code>(?P<bt>`+)[^\n]+?(?P=bt))
  | (?P<dmath>(?s:\$\$.+?\$\$))
  | (?P<bmath>(?s:\\\[.+?\\\]))
  | (?P<pmath>\\\([^\n]+?\\\))
  | (?P<imath>(?<![\\$])\$(?![\s$])[^\n$]+?(?<![\s\\])\$)
  | \\ce\{(?P<ce>(?:[^{}]|\{[^{}]*\})*)\}
""", re.X)

NUM, NAME, SUPER, SUB, BRACE, CHAR = range(6)

_TOKENS = [(re.compile(rx), group, kind) for rx, group, kind in [
    (r"[0-9.][0-9./]*", 0, NUM),
    (r"\?", 0, NUM),
    (r"[a-zA-Z]+", 0, NAME),
    (r"\^\((.+?)\)", 1, SUPER),
    (r"\^\{(.*?)\}", 1, SUPER),
    (r"\^(\S)", 1, SUPER),
    (r"_\{(.*?)\}", 1, SUB),
    (r"[\[\]()]", 0, BRACE),
    (r"<=>|<->|<>|->|<-", 0, CHAR),
    (r".", 0, CHAR),
]]

SPECIAL = {"->": "→", "<-": "←", "<->": "⇄", "<>": "⇌", "<=>": "⇌", "*": "·", "hnu": "hν"}


def preprocess(text):
    """Replace every \\ce{...} outside code and math with HTML."""
    def repl(m):
        if m.group("ce") is not None:
            return render(m.group("ce"))
        return m.group(0)
    return _PROTECTED.sub(repl, text)


def tokenize(text):
    pos = 0
    while pos < len(text):
        for rx, group, kind in _TOKENS:
            m = rx.match(text, pos)
            if m:
                yield m.group(group), kind
                pos = m.end()
                break


def render(formula):
    """Render one formula (contents of \\ce{...}) to an HTML span."""
    out = []
    prev = None
    for tok, kind in tokenize(formula):
        text = html.escape(SPECIAL.get(tok, tok))
        if kind == SUPER:
            out.append(f"<sup>{text}</sup>")
        elif kind == SUB or (kind == NUM and prev in (NAME, BRACE, SUPER)):
            out.append(f"<sub>{text}</sub>")
        else:
            out.append(text)
        prev = kind
    return '<span class="chem">' + "".join(out) + "</span>"


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print(preprocess(" ".join(sys.argv[1:]) or r"\ce{2H2 + O2 -> 2H2O}"))
