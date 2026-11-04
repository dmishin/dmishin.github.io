# Math and code

## Math

Formulas are written in LaTeX notation and compiled to Word's own equations (OMML), which Word users can edit in its
equation editor.

```wgx
Inline, \m{e^{i\pi} + 1 = 0}, and on a line of its own:

$$ \int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2} $$ {#eq:gauss}

$$\begin{aligned}
  f(x) &= (x + 1)^2 \\
       &= x^2 + 2x + 1
\end{aligned}$$ {#eq:square}

By @eq:gauss and @eq:square, the integral is finite.
```

- `\m{…}` is inline math; `$` alone is just a dollar sign. `$$ … $$` at the start of a line, or
  `\math[id=eq:x]{…}`, is a display equation.
- A labelled display equation is numbered "(1)", at the right margin, the way Word numbers equations; `@eq:x`
  prints "(1)" and `\ref[form=number]{eq:x}` "1". `\math[numbered]` numbers one without a label,
  `\math[nonumber]` leaves a labelled one unnumbered. With chapter-numbered captions
  (`\settings[captions=(chapter-numbers)]`) equations are numbered "(3.2)".

The supported LaTeX:

| Kind | Commands |
|------|----------|
| Scripts | `x^2`, `x_i`, `x_i^2`, `x'`; `{…}` groups |
| Fractions, roots | `\frac`, `\dfrac`, `\tfrac`, `\cfrac`, `\binom`, `\sqrt`, `\sqrt[n]` |
| Big operators | `\sum \prod \int \iint \oint \bigcup \bigcap …`, `\limits`, `\nolimits` |
| Functions | `\sin \cos \log \ln \exp \lim \max \min …`, `\operatorname{argmin}`, `\mathop` |
| Delimiters | `\left( … \right)`, with `[ ] \{ \} \| \langle \rangle \lfloor \rfloor \lceil \rceil .`; `\big(` and friends |
| Environments | `matrix pmatrix bmatrix Bmatrix vmatrix Vmatrix array cases aligned align split gathered` |
| Accents | `\hat \bar \tilde \vec \dot \ddot`, `\overline \underline \overbrace \underbrace`, `\overset \underset` |
| Fonts, text | `\mathrm \mathbf \mathit \boldsymbol \mathbb \mathcal \mathfrak \mathsf \mathtt`, `\text{…}` |
| Symbols, spacing | Greek letters, relations, arrows, `\infty \partial \nabla \forall \exists`, `\not`; `\, \: \; \quad \qquad` |

A command outside this list is an error at its place in the formula, with the nearest supported command.

## Code blocks

````wgx
```python {#lst:hello, caption="Saying hello", line-numbers}
def hello(name):
    print(f"Hello, {name}")
```

@lst:hello prints a greeting.
````

- The language is any Pygments name (`python`, `json`, `cpp`, `sql`, `yaml`, …) or `wgx` and `wgxs`. An unknown
  language is a warning, and the code is shown plain; so is code without a language, or with `highlight=off`.
- The block uses the *Code Block* paragraph style; each kind of token has a character style (*Code Keyword*,
  *Code String*, *Code Comment*, …) coloured from a Pygments theme, `vs` unless
  `\settings[code-theme=friendly]` says otherwise. Restyle any of them in a style sheet:
  `character "Code Keyword" { bold; color: #7F0055; }`.
- Options: `{#label}`, `caption="…"` (a *Listing* caption), `line-numbers`, `first-line=10`.
- Spaces and line breaks are kept exactly. `` `inline code` `` uses the *Code* character style.
