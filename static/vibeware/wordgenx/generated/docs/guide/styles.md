# Styles, templates and themes

Word documents are easiest to edit when their formatting lives in styles. wordgenx makes that the natural way:
a style sheet defines paragraph, character, table and list styles with Word's own names and properties, and the
document refers to them.

## Style sheets

A style sheet is a `.wgxs` file loaded with `\use{house.wgxs}`, or the body of `\styles{…}` in the document. Sheets
apply to the whole document, in the order they appear.

```wgx
\styles{
  defaults { font: theme.minor; size: 11pt; space-after: 8pt; line-spacing: 1.08; }

  paragraph "Body Text" : Normal {          % ": Normal": based on Normal
    space-after: 6pt; justify; widow-control;
    next: "Body Text";                      % the style of the paragraph after it
  }

  modify paragraph "Heading 1" {            % change a built-in style
    font: theme.major; size: 16pt; color: theme.accent1;
    space-before: 24pt; keep-with-next;
  }

  character Term { italic; color: theme.accent2; }

  linked Quote : Normal {                   % a paragraph style and a "Quote Char" style
    indent: (left=1cm, right=1cm); italic;
    border-left: (single, 3pt, theme.accent1, space=6pt);
  }
}

= Introduction

\p[style="Body Text"]{A paragraph with a \style[Term]{defined term}.}

\p[style=Quote]{A quotation.}
```

**Rules:**

- `defaults { … }`: the document's base font, size and spacing.
- `paragraph NAME [: BASE] { … }`, `character NAME { … }`, `linked NAME [: BASE] { … }`,
  `table NAME [: BASE] { … }`, `numbering NAME { level N { … } … }`.
- `modify paragraph NAME { … }` changes a style that exists (a built-in, or the template's); `replace` starts
  over. Defining a style twice is an error.
- Names are words or `"quoted strings"`. A paragraph style without a base is based on Normal.

**Declarations** are `key: value;`. A key alone is a switch (`keep-with-next;`), and an alignment word alone sets
the alignment (`justify;`). Keys are the formatting properties listed in the
[reference](../reference.md#formatting-properties); the same names work as options of `\p`, `\font`, `\table` and
`\cell`. A few keys belong to the style itself: `next`, `numbering`, `ui-priority`, `quick-format`.

Useful values:

| Key | Example |
|-----|---------|
| `indent` | `indent: (left=1cm, first-line=0.5cm);`, `indent: 0.75cm hanging;` |
| `line-spacing` | `1.15` (a multiple), `(14pt, exact)`, `(12pt, at-least)` |
| `space-before`, `space-after` | `12pt` |
| borders | `border-bottom: (single, 1pt, theme.accent1);`, `borders: (all=(single, 0.5pt, #BFBFBF));` |
| `shading` | `#F2F2F2`, `theme.accent1.lighter(80%)` |
| `tabs` | `tabs: 8cm center, 16cm right leader=dot;` |

**Built-in styles** (Heading 1–9, Title, Strong, Hyperlink, Caption, Table Grid, …) need no definition: wordgenx
adds them as Word defines them when the document uses them. Any other undefined style is an error.

## Lists and numbering

A numbering definition is a Word multilevel list. Levels can be linked to paragraph styles, which is how Word
numbers headings and contract clauses.

```wgx
\styles{
  numbering Headings {
    level 1 { format: decimal; text: "%1";    style: "Heading 1"; }
    level 2 { format: decimal; text: "%1.%2"; style: "Heading 2"; }
  }
  numbering Legal {
    level 1 { format: decimal;      text: "%1.";  indent: (left=1cm, hanging=1cm); }
    level 2 { format: lower-letter; text: "(%2)"; indent: (left=2cm, hanging=1cm); }
  }
  numbering Checklist { level 1 { bullet: "☐"; font: "Segoe UI Symbol"; } }
}

= Scope

== Background

\list[Legal]{
1. {#cl:term} The term starts on the Effective Date.
   a. It ends after one year.
2. Notice under clause @cl:term is given in writing.
}

\list[Checklist]{
- Sign the contract
- Send the invoice
}
```

- Level keys: `format` (`decimal`, `lower-letter`, `upper-letter`, `lower-roman`, `upper-roman`, `bullet`,
  `decimal-zero`, …), `text` (`"%1.%2"`), `bullet`, `start`, `style`, `legal`, `suffix` (`tab`, `space`,
  `nothing`), `marker-align`, `restart-after`, `indent`, and any character property to format the marker.
- Levels you leave out are filled in, continuing the pattern.
- `-` lists use the numbering `Bullets` and `1.` lists `Numbers`; define either to change every list.
- `\list[Name]{…}` uses a numbering for the list inside; `continue` carries on from the previous list of that
  numbering, `restart=5` starts at 5.

## Table styles

```wgx
\styles{
  table "Data Grid" : "Table Grid" {
    borders: (all=(single, 0.5pt, #BFBFBF));
    cell-margins: (left=0.15cm, right=0.15cm);
    header-row { bold; color: #FFFFFF; shading: theme.accent1; repeat; }
    banded-rows { odd { shading: #F2F2F2; } }
    first-column { bold; }
  }
}

\table[style="Data Grid"]{
  | Region | Q1  |
  | North  | 120 |
  | South  | 98  |
}
```

Top-level keys format every cell; the blocks (`header-row`, `last-row`, `first-column`, `last-column`,
`banded-rows`, `banded-columns`, the corner cells) format parts of the table, as Word's table style options do. A
table's `look` option chooses which parts apply. See [tables](tables.md).

## Themes

Colours written `theme.accent1` and fonts written `theme.major`/`theme.minor` follow the document theme, so Word's
Design tab can change them later. A `theme` rule sets the theme:

```wgx
\styles{
  theme Harbour {
    accent1: #0B7A75; accent2: #D9822B; dark2: #1B2A41;
    major-font: "Georgia"; minor-font: "Segoe UI";
  }
}

= A heading in Georgia

Body text in Segoe UI, with \font[color=theme.accent2]{an accent}.
```

## Templates

`\document[template="corporate.dotx"]` (or `wordgenx build --template corporate.dotx`) compiles into an existing
Word template or document. The output takes the template's styles, theme, page setup, headers and footers, and any
cover-page content; your style sheets modify its styles, and built-in styles the markup needs come from the
template when it has them.

- `wordgenx build house.wgx -o house.dotx` writes a template of your own; see
  [examples/templates/corporate.wgx](../../examples/templates/corporate.wgx).
- `\style[Name]{…}` and `\p[style=Name]` use any style the template has.
- `wordgenx import report.docx --keep-styles` turns a Word document into source that compiles into the original's
  styles (see [import](import.md)).

## Direct formatting

When a style is overkill, format directly: `\font[…]{…}` for text, `\p[…]{…}` for a paragraph, and options of
`\table` and `\cell`. They take the same property names as style sheets:

```wgx
\p[align=center, space-before=12pt, border-bottom=(single, 1pt, theme.accent1)]{A centred, underlined title}

\font[font="Consolas", size=10pt, color=#C00000, caps]{a warning} and \hl[yellow]{highlighted} text.
```
