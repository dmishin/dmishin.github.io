# wordgenx for TeX users

If you know LaTeX, most of wordgenx will look familiar: backslash commands, `%` comments, `~`, `--` and `---`,
labels and references, math in LaTeX notation. This page maps common LaTeX constructs to their nearest wordgenx
equivalents. They are analogies, not translations: wordgenx writes Word documents, and some LaTeX ideas have no
counterpart in Word, or a different one.

## Different assumptions

- **Word lays out the pages.** wordgenx writes a document; Word decides where lines and pages break when it opens it.
  So there is no `\clearpage` trickery, no float placement, no overfull boxes. Page numbers in references are filled
  in by Word, which updates fields when the document opens.
- **Styles, not macros, carry the formatting.** Where LaTeX redefines `\section`, wordgenx modifies the *Heading 1*
  style in a style sheet. The output stays editable: a Word user changes the style, and every heading follows.
- **Macros are templates, not a language.** `\define` substitutes parameters; there is no expansion order, no
  catcodes, no `\if`, no counters arithmetic. Generate the source from a program when you need logic.
- **Whitespace after a command is kept.** `\product is` keeps its space; there is no need for `\product{}` except
  before letters.
- **`$` is a dollar sign.** Inline math is `\m{…}`; display math is `$$ … $$`.
- **One body per command.** `\frac`-style several arguments exist only in math; elsewhere extra arguments are named
  options: `\link[to="https://…"]{text}` rather than `\href{url}{text}`.
- **Unknown commands and options are errors**, with suggestions, rather than silently ignored.

## Document structure

| LaTeX | wordgenx | Notes |
|-------|----------|-------|
| `\documentclass{article}` | nothing, or `\document[template="report.dotx"]` | the "class" is a Word template or a style sheet |
| `\usepackage{…}` | `\use{house.wgxs}`, `\use{std:callout}` | style sheets, macro files, standard modules |
| `\begin{document}` … `\end{document}` | nothing | the content starts after the preamble |
| `\title`, `\author`, `\date` | `\meta[title=…, author=…]` | document properties (File > Info) |
| `\maketitle` | `\p[style=Title]{…}`, `\p[style=Subtitle]{…}` | Word's Title and Subtitle styles |
| `\chapter`, `\section`, `\subsection` | `=`, `==`, `===` | Heading 1, 2, 3 … up to 9 |
| `\section*{…}` | `=* …` | a heading without a number |
| `\paragraph{…}` | `====` or a style of your own | |
| `\input{f}`, `\include{f}` | `\include{f.wgx}` | |
| `\appendix` | a numbering or style change in a style sheet | |
| `\tableofcontents` | `\toc[levels=1-3, title="Contents"]` | a Word TOC field, filled in |
| `\listoffigures`, `\listoftables` | `\listof[Figure]`, `\listof[Table]` | |
| `\newpage`, `\clearpage` | `\pagebreak` | |
| `\cleardoublepage` | `\section[break=odd-page]` | |

## Text

| LaTeX | wordgenx | Notes |
|-------|----------|-------|
| blank line, `\par` | blank line | |
| `\\`, `\newline` | `\br` | |
| `\emph{x}` | `_x_` or `\emph{x}` | the Emphasis character style |
| `\textbf{x}` | `*x*` (Strong style) or `\b{x}` | |
| `\textit{x}`, `\underline{x}` | `\i{x}`, `\u{x}` | |
| `\texttt{x}`, `\verb\|x\|` | `` `x` `` | the Code character style |
| `\textsc{x}` | `\font[small-caps]{x}` | |
| `\textsuperscript{x}`, `\textsubscript{x}` | `\sup{x}`, `\sub{x}` | |
| `{\large x}`, `\fontsize` | `\font[size=14pt]{x}` | better: a character style |
| `\textcolor{red}{x}` | `\font[color=#C00000]{x}` | `theme.accent1` follows the theme |
| `\colorbox{yellow}{x}` | `\hl[yellow]{x}`, `\font[shading=#FFF2CC]{x}` | |
| `\foreignlanguage{german}{x}` | `\lang[de-DE]{x}` | spelling and hyphenation |
| `babel` main language | `\document[lang=en-GB]` | |
| ` ``x'' ` | `"x"` | curly quotes come by themselves |
| `--`, `---`, `~`, `%` | the same | |
| `\%`, `\{`, `\_`, `\#` | the same | `\$` too, though `$` alone is already text |
| `\ldots` | `…` (type it; the source is UTF-8) | |
| `\noindent` | `\p[first-line-indent=0]{…}` | |
| `\vspace{12pt}` | `\p[space-before=12pt]{…}` | or `space-after` in a style |
| `\hfill`, `\hspace` | `\tab`, with `\tabs[(16cm, right)]{…}` | |
| `\begin{center}` | `\align[center]{…}` | |
| `\begin{flushright}` | `\align[right]{…}` | |
| `\begin{quote}` | `\p[style=Quote]{…}` | Word's Quote style |
| `\begin{verbatim}` | a ` ``` ` code fence | |
| `\footnote{x}` | `\footnote{x}` | `\endnote{x}` for endnotes |
| `\marginpar{x}` | a floating `\textbox[x=(right, from=margin)]` or a `\comment` | no exact counterpart |
| `\url{u}` | `\url{u}` or `<u>` | |
| `\href{u}{text}` | `[text](u)` or `\link[to="u"]{text}` | |

## Lists

| LaTeX | wordgenx |
|-------|----------|
| `itemize` with `\item` | lines starting `- ` |
| `enumerate` with `\item` | lines starting `1. ` (nested: `a. `) |
| nested environments | indented items |
| `enumitem` settings | a `numbering` definition in a style sheet, used with `\list[Name]{…}` |
| `\setcounter{enumi}{4}` | `\list[Numbers, restart=5]{…}` |
| resuming a list | `\list[Name, continue]{…}` |
| `description` | no list form: `\p[indent-left=1cm, hanging-indent=1cm]{*Term* \tab text}` or a style |

## Labels and references

| LaTeX | wordgenx | Notes |
|-------|----------|-------|
| `\label{sec:x}` | `= Title {#sec:x}`, or `id=sec:x` on a command | a Word bookmark |
| `\ref{x}` | `\ref[form=number]{x}` | just the number |
| `\autoref{x}`, `\cref{x}` | `@x` | "Figure 3", "2.1", "(4)": the kind comes with it |
| `\nameref{x}` | `\ref[form=text]{x}` | the heading or caption text |
| `\pageref{x}` | `\pageref{x}` | filled in by Word |
| `\eqref{x}` | `@x` | "(3)" |
| `\hyperref[x]{text}` | `[text](#x)` | |
| `\newcounter`, `\refstepcounter` | `\seq[Name, id=x]` | a Word SEQ field |
| `\index{x}`, `\index{a!b}` | `\ix{x}`, `\ix{a!b}` | `see=`, `see-also=` options |
| `\printindex` | `\index[columns=2]` | |

## Citations (biblatex, natbib)

| LaTeX | wordgenx |
|-------|----------|
| `\addbibresource{refs.bib}` with a style | `\bibliography[file="refs.bib", style=apa]` (CSL styles) |
| `\parencite{k}`, `\citep{k}` | `\cite{k}` |
| `\textcite{k}`, `\citet{k}` | `\textcite{k}` |
| `\cite[p.~12]{k}` | `\cite[page=12]{k}` |
| `\cite[see][12]{k}` | `\cite[prefix="see", page=12]{k}` |
| `\printbibliography` | `\printbibliography[title="References"]` |

## Floats, figures and pictures

| LaTeX | wordgenx | Notes |
|-------|----------|-------|
| `figure` with `\centering`, `\includegraphics`, `\caption`, `\label` | `\figure[id=fig:x]{ \image{…} \caption{…} }` | |
| `\includegraphics[width=.5\textwidth]{f}` | `\image[width=50%]{f.png}` | PNG, JPEG, SVG, … |
| `[h]`, `[t]`, `[!htbp]` | nothing | figures stay where they are written |
| `wrapfigure` | `\image[width=5cm, wrap=square, x=right]{f}` | a floating picture |
| `subfigure`, `subcaption` | a borderless layout `\table[style=none]` | |
| `\captionof{figure}{…}` | `\caption[Figure]{…}` | |
| TikZ, PGFPlots | a picture made elsewhere (SVG with a PNG fallback) | no drawing language |

## Tables

| LaTeX | wordgenx | Notes |
|-------|----------|-------|
| `tabular{lcr}` | `\table[columns=(left, center, right)]{…}` | |
| `a & b \\` | `\| a \| b \|` | one line per row |
| `p{3cm}`, `tabularx` `X` | `widths=(3cm, 1fr)` | |
| `S` column (siunitx) | `columns=(decimal)` | aligned on the decimal point |
| `\hline`, `booktabs` rules | a table style, or `borders=…` | |
| `\multicolumn{3}{c}{x}` | `\cell[colspan=3, align=center]{x}` then two empty cells | |
| `\multirow{2}{*}{x}` | `\cell[rowspan=2]{x}` | |
| `longtable` with `\endhead` | `header-rows=1` | every Word table can break across pages |
| `\rowcolor`, `\cellcolor` | a table style, or `\cell[shade=…]` | |
| `table` environment with `\caption` | `\caption{…}` right before the table | |

## Math

| LaTeX | wordgenx |
|-------|----------|
| `$x^2$`, `\(x^2\)` | `\m{x^2}` |
| `\[ … \]`, `equation*` | `$$ … $$` |
| `equation` with `\label{eq:x}` | `$$ … $$ {#eq:x}` |
| `align` | `$$\begin{aligned} … \end{aligned}$$ {#eq:x}` (one number for the block) |
| `\DeclareMathOperator` | `\operatorname{argmin}` |
| `amsmath` environments | `matrix`, `pmatrix`, `bmatrix`, `cases`, `aligned`, `gathered`, `split`, `array` |

The math is converted to Word's own equations, so it stays editable in Word. The supported commands are listed in
[math and code](math-and-code.md); anything else is an error with the nearest supported command.

## Page layout

| LaTeX | wordgenx |
|-------|----------|
| `geometry` (`a4paper, margin=2.5cm`) | `\section[size=A4, margins=2.5cm]` |
| `twoside` | `\section[mirror]`, `\settings[even-odd-headers]` |
| `\pagestyle{fancy}`, `\fancyhead`, `\fancyfoot` | `\header{…}`, `\footer{…}` (`\header[first]`, `\header[even]`) |
| `\thepage`, `\pageref{LastPage}` | `\pagenum`, `\numpages` |
| `\pagenumbering{roman}` | `\section[page-numbers=lower-roman]` |
| `\setcounter{page}{1}` | `\section[page-numbers=(start=1)]` |
| `\twocolumn`, `multicols` | `\section[columns=2, break=continuous]` |
| `landscape` (pdflscape) | `\section[orientation=landscape]` |
| `\thispagestyle{empty}` | `\section[title-page]` with an empty `\header[first]{}` |
| `draftwatermark` | `\watermark[DRAFT]` |

## Code listings

| LaTeX | wordgenx |
|-------|----------|
| `lstlisting`, `minted{python}` | ` ```python ` … ` ``` ` |
| `caption=…, label=lst:x` | ` ```python {#lst:x, caption="…"} ` |
| `numbers=left`, `firstnumber=10` | `line-numbers`, `first-line=10` |
| `\lstinline`, `\mintinline` | `` `code` `` |

## Macros

| LaTeX | wordgenx |
|-------|----------|
| `\newcommand{\product}{Widget}` | `\let{product}{Widget}` |
| `\newcommand{\term}[1]{\emph{#1}}` | `\define{term}{_#body_}` |
| `\newcommand{\note}[2][Note]{…#1…#2…}` | `\define{note}[title="Note"]{…#title…#body…}` |
| `\newenvironment{box}{…}{…}` | a macro whose `#body` is blocks |
| `\renewcommand` of a built-in | not possible: change the style instead |
| `\ifthenelse`, `\foreach`, `\the\value` | not possible: generate the source |
| `amsthm` `\newtheorem` | a macro around a styled paragraph and a `\seq` counter |

A theorem environment, for example:

```wgx
\styles{ paragraph Theorem : Normal { italic; space-before: 6pt; } }

\define{theorem}[id]{\p[style=Theorem]{*Theorem \seq[Theorem, id=#id].* #body}}

\theorem[id=thm:main]{Every bounded monotone sequence converges.}

By Theorem @thm:main, the sequence has a limit.
```

## A short article, both ways

```latex
\documentclass{article}
\usepackage[a4paper, margin=2.5cm]{geometry}
\title{Queues}
\author{Jane Doe}
\begin{document}
\maketitle
\section{Introduction}\label{sec:intro}
Queues form when arrivals outpace service; see Section~\ref{sec:model}.
\section{Model}\label{sec:model}
The mean wait is
\begin{equation}\label{eq:wait}
  W = \frac{\rho}{\mu(1-\rho)} .
\end{equation}
By \eqref{eq:wait}, waits grow without bound as $\rho \to 1$.\footnote{For an M/M/1 queue.}
\end{document}
```

```wgx
\meta[title="Queues", author="Jane Doe"]
\section[size=A4, margins=2.5cm]

\p[style=Title]{Queues}
\p[style=Subtitle]{Jane Doe}

= Introduction {#sec:intro}

Queues form when arrivals outpace service; see section @sec:model.

= Model {#sec:model}

The mean wait is

$$ W = \frac{\rho}{\mu(1-\rho)} $$ {#eq:wait}

By @eq:wait, waits grow without bound as \m{\rho \to 1}.\footnote{For an M/M/1 queue.}
```

The headings here are not numbered (Word's built-in headings are not), so `@sec:model` prints the heading text,
"Model". To number them, link the headings to a numbering in a style sheet (see [styles](styles.md)); `@sec:model`
then prints "2".
