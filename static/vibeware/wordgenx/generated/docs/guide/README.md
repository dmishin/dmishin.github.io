# wordgenx in one page

wordgenx is a markup language that compiles to Word documents. You write plain text with a few marks and
commands; `wordgenx build` turns it into a `.docx` with real Word styles, numbering, fields and cross-references,
which anyone can keep editing in Word.

This page covers what most documents need. The [topic guides](#topic-guides) go further, and the
[command reference](../reference.md) lists every command and option. From the command line,
`wordgenx explain NAME` says what a command, formatting property or macro is and takes:
`wordgenx explain table`, `wordgenx explain space-before`, `wordgenx explain std:callout`, or
`wordgenx explain mymacro --in report.wgx` for the macros a document defines.

## A first document

```wgx
\meta[title="Quarterly report", author="Jane Doe"]
\section[size=A4, margins=2.5cm]

\p[style=Title]{Quarterly report}

= Summary

Revenue grew by *12%* this quarter, mostly from _new_ customers.
See @sec:details for the numbers.

= Details {#sec:details}

- Hub capacity is the main constraint.
- Volume grew faster than planned.
  - Especially in the north.
```

Save it as `report.wgx` and build it:

```bash
wordgenx build report.wgx            # writes report.docx
wordgenx check report.wgx            # only reports problems
```

## Text

A paragraph is plain text; a blank line starts the next one. Line breaks inside a paragraph are spaces.

| You write | You get |
|-----------|---------|
| `*strong*` | **strong** (Word's Strong style) |
| `_emphasis_` | *emphasis* (Emphasis style) |
| `` `code` `` | `code` (Code style) |
| `\b{…}` `\i{…}` `\u{…}` `\s{…}` | bold, italic, underlined, struck through |
| `H\sub{2}O`, `x\sup{2}` | subscript, superscript |
| `\font[size=14pt, color=theme.accent1]{…}` | any direct formatting |
| `--`, `---`, `"quotes"` | – — “quotes” |
| `~` | a non-breaking space |
| `\br`, `\tab`, `\pagebreak` | a line break, a tab, a page break |
| `% note` | a comment (at the start of a line or after a space) |

`$`, `12%` and `a_b_c` are ordinary text. To write a character that would start markup, put a backslash before
it: `\*`, `\_`, `\{`, `\%`, `\@`.

## Headings and lists

```wgx
= Chapter
== Section
=== Subsection
=* A heading without a number

- a bullet
- another
  - nested

1. first
2. second
   a. lettered
```

Headings use Word's Heading 1–9 styles, so the navigation pane and the table of contents work. Lists use Word's
own numbering, so Word users can continue them.

## Commands and options

Everything else is a command: `\name[options]{body}`.

```wgx
\p[align=justify, space-after=6pt, keep-with-next]{A paragraph with options.}

\align[center]{Centred text.}

Text \font[font="Consolas", size=10pt]{in a font}.
```

Options are `name=value`; an on/off option can stand alone (`keep-with-next`). Values are words, `"strings"`,
lengths (`12pt`, `2.5cm`), colours (`#C00000`, `theme.accent1`) or groups `(top=2cm, left=3cm)`. Unknown options and
values are errors, with a suggestion when one is close.

## Links, references and notes

```wgx
= Results {#sec:results}

See [the website](https://example.com), <https://example.org>, and @sec:results.
A claim.\footnote{With its source.}
```

`{#label}` after a heading, list item marker or display block makes a label; `id=label` does it for commands.
`@label` prints what Word's cross-reference would ("Figure 3", "2.1", the heading text) and stays a live field.
A reference to a label that does not exist is an error.

## Tables and pictures

```wgx
| Region | Q1  | Q2  |
| North  | 120 | 135 |
| South  | 98  | 101 |

\figure[id=fig:logo, width=4cm]{
  \image{img/logo.png}
  \caption{The logo}
}

As @fig:logo shows, pictures keep their captions.
```

Pipe rows make a table; `\table[...]{...}` takes options such as `header-rows=1` and `widths=(4cm, 1fr, 1fr)`.
See [tables](tables.md) and [pictures](images.md).

## Styles

Formatting belongs in styles. A style sheet (`.wgxs`, or inline in `\styles{…}`) uses Word's style names and a
CSS-like syntax:

```wgx
\styles{
  paragraph "Body Text" : Normal { space-after: 6pt; justify; }
  modify paragraph "Heading 1" { color: theme.accent1; space-before: 18pt; }
  character Term { italic; color: theme.accent2; }
}

= Introduction

\p[style="Body Text"]{A \style[Term]{defined term} in body text.}
```

To use a company template, compile into it: `\document[template="corporate.dotx"]`. See [styles](styles.md).

## Page setup, headers and footers

```wgx
\section[size=A4, margins=(top=2.5cm, bottom=2.5cm, left=3cm, right=2cm)]
\header{Quarterly report \tab \tab \field{TITLE}}
\footer{\align[center]{Page \pagenum of \numpages}}

\toc[levels=1-2, title="Contents"]

= Introduction

Text.
```

## Topic guides

- [Syntax](syntax.md): the exact rules: commands, options, values, escapes, whitespace, labels.
- [Styles, templates and themes](styles.md): style sheets, list numbering, table styles, templates.
- [Tables](tables.md): pipe tables, `\table`, merged cells, widths, header rows, floating tables.
- [Pictures, figures and text boxes](images.md): sizes, captions, floating pictures, SVG, watermarks.
- [References, captions, contents and citations](references.md): labels, `@label`, notes, TOC, index,
  bibliographies.
- [Sections, headers, footers and fields](sections.md): page setup, columns, page numbers, Word fields.
- [Math and code](math-and-code.md): equations in LaTeX notation, highlighted code blocks.
- [Macros and the standard library](macros.md): `\define`, `\let`, `\include`, `std:callout`, `std:signature`.
- [Forms and review](forms.md): content controls, comments, protection.
- [Importing Word documents](import.md): `wordgenx import`, and how a build is checked.
- [For TeX users](tex.md): LaTeX constructs and their nearest wordgenx equivalents.
