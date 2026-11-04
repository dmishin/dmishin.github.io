# Syntax

The exact rules of a `.wgx` file. Files are UTF-8; style sheets (`.wgxs`) have their own syntax, described in
[styles](styles.md).

## Paragraphs and text

- A **paragraph** is text up to a blank line. Line breaks inside it become spaces, and runs of spaces collapse to one.
- **Comments** run from `%` to the end of the line, when the `%` is at the start of a line or after whitespace.
  `12%` and `a%20b` are text; `\%` is always a percent sign. There are no block comments.
- **Typography:** `--` is an en dash, `---` an em dash, and straight quotes become curly ones.
  `\document[smart-quotes=off]` keeps them as typed. `~` is a non-breaking space.
- `$` is ordinary text (`$48.2M`). Only `$$` at the start of a line begins display math.

## Escapes

A backslash before one of these characters makes it literal: `` \\ \% \{ \} \[ \] \* \_ \` \$ \# \= \| \@ \~ ``.
Most need no escape in ordinary prose, because each mark is recognised only where it could mean something:

- `*` and `_` start emphasis only at the start of a word and end it only at the end of one, so `5 * 3`,
  `snake_case_name` and `file_name.txt` are plain text. An unclosed `*` is a warning and stays as text.
- `@` starts a reference only after a space or opening bracket, and only before a label: `jane@example.com` is text.
- `=`, `-`, `1.`, `|` and ` ``` ` mean something only at the start of a line.
- A bare `{` in text is an error: write `\{`.

## Commands

```text
\name                 a command without options or body: \pagebreak, \pagenum
\name{body}           with a body
\name[options]{body}  with options and a body
\name[options]        with options only
```

- `[` and `{` must touch the name (or the `]`): `\b {x}` is the command `\b`, a space, and a stray `{`.
- **Whitespace after a command is kept**, unlike TeX: `The \product is great` keeps both spaces. `\name{}` ends a
  command name explicitly (`\product{}s`). The break commands `\br`, `\tab`, `\pagebreak` and `\columnbreak` eat the
  spaces around them.
- A command has **at most one body**. Anything else is an option.
- **Block commands** (`\p`, `\table`, `\section`, ...) stand alone, separated from text by a line break or a blank
  line. **Inline commands** (`\b`, `\link`, `\footnote`, ...) go inside text. The [reference](../reference.md) says
  which is which.

What a body holds depends on the command:

| Body kind | Read as | For example |
|-----------|---------|-------------|
| markup | text, marks and commands | `\p`, `\cell`, `\footnote`, `\b` |
| string | literal text; only `\}` and `\\` are escapes | `\image{img/a.png}`, `\url`, `\include` |
| raw | literal text; braces must balance | `\field{IF {MERGEFIELD x} = 1 "y"}`, `\raw` |
| math | LaTeX math | `\m{x^2}`, `\math{…}` |

## Options

```text
\cmd[name=value, other=value, flag]
```

- **Names** are words with letters, digits, `-`, `_` and `.`: `space-before`, `custom.client`. A name that is not
  a word is quoted after a dot: `custom."N° ISO"="A12"`.
- **Switches** (on/off options) can stand alone: `[keep-with-next]` is `[keep-with-next=on]`. They also take
  `on`, `off`, `true`, `false`, `yes`, `no`.
- **Positional values:** some commands take one value without a name. `\list[Legal]` is `\list[numbering=Legal]`,
  `\u[double]` is `\u[underline=double]`, `\header[first]` is `\header[kind=first]`.
- Unknown, misspelt or repeated options are errors, with a suggestion when one is close.

Values:

| Kind | Examples |
|------|----------|
| Text | `Normal`, `"Body Text"` (ends on its line), `{plain text that may span lines}` |
| Number | `3`, `1.15` |
| Length | `12pt`, `2.5cm`, `25mm`, `1in`, `6pc`, and `twip`/`emu` for exact values |
| Percentage, fraction | `50%` (of the text width), `1fr` (a share of a table's free width) |
| Colour | `#1F4E79`, `navy`, `auto`, `theme.accent1`, `theme.text1.lighter(40%)`, `theme.accent2.darker(25%)` |
| Group | `(top=2cm, left=3cm)`, `(single, 1pt, #C00000)`, `(1.5cm, at-least)` |
| Markup | `text={A comment with *markup*}` (only where an option takes markup) |

A group with a main field accepts that field alone: `margins=2.5cm` is `margins=(all=2.5cm)`, `columns=2` is
`columns=(count=2)`. Lists of values are groups too: `widths=(4cm, 1fr, 1fr)`.

## Short forms

Each short form has a command form, which is what `wordgenx import --commands-only` prints.

| Short form | Command form |
|------------|--------------|
| `= Heading` … `========= Heading` | `\p[style="Heading 1"]{Heading}` … Heading 9 |
| `=* Heading` | a heading with numbering turned off |
| `- item`, `1. item`, `a. item` (nested) | `\list[Bullets]{…}`, `\list[Numbers]{…}` |
| `\| a \| b \|` rows | `\table{\row{\cell{a} \cell{b}}}` |
| `*strong*`, `_emphasis_`, `` `code` `` | `\strong{…}`, `\emph{…}`, `\code{…}` |
| `[text](https://…)`, `<https://…>` | `\link[to="https://…"]{text}`, `\url{https://…}` |
| `@label` | `\ref{label}` |
| `$$ … $$` | `\math{…}` |
| ` ```python ` … ` ``` ` | a code block (see [math and code](math-and-code.md)) |

**Lists.** `-` items are bullets, `1.` items are numbered; `a.` and `i.` markers are recognised inside a list item.
The marker only says *bulleted* or *numbered*: the number format comes from the list's numbering definition. An
item continues on lines indented to its text; a blank line followed by indented text is another paragraph of the
same item. A nested list of the same kind is the next level of the same Word list.

## Labels

A label names something you refer to: `{#sec:intro}` after a heading, after a list marker (`1. {#cl:term} Term`)
or after display math, or `id=…` on commands (`\p`, `\caption`, `\figure`, `\seq`, `\footnote`, code blocks).
Labels are letters, digits, `-` and `_`, with `:` between parts: `fig:arch`, `cl:term`. A label becomes a Word
bookmark; defining one twice, or referring to one that does not exist, is an error. Punctuation after `@label` is not
part of it: `see @fig:arch.` works.

## Files

- `\include{chapter.wgx}` splices another file's content in at that point.
- `\use{file}` loads a style sheet (`.wgxs`), a macro file (`.wgx`, definitions only) or a standard module
  (`std:callout`).
- Paths are relative to the file that names them.
- Everything before the first content is the **preamble**: `\document`, `\meta`, `\settings`, `\use`,
  `\bibliography`, and a `\section` that sets up the first page.

## Diagnostics

Every problem has a code, the place in the source and, where possible, a suggestion:

```text
error[WGX0302]: unknown option `space-befor` for `\p`
 --> report.wgx:14:4
   |
14 | \p[space-befor=12pt]{Text}
   |    ^^^^^^^^^^^^^^^^ did you mean `space-before`?
   |
   = help: \p[style=..., id=..., drop-cap, <paragraph properties>]{...}
```

Errors stop the build; warnings do not. `wordgenx check` reports both without writing anything, and `wordgenx fmt`
rewrites files in the canonical layout. `wordgenx explain NAME` says what a command, property or macro takes, and
with `--in FILE.wgx` it finds the macros a document defines or loads, with the `%` comment above each definition.
