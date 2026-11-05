# Tables

wordgenx writes real Word tables: Word users can edit them, restyle them with table styles, and repeat their header
rows. Simple tables are pipe rows; anything more takes the `\table` command, which accepts pipe rows too.

## Pipe tables

```wgx
| Region | Q1  | Q2  |
| North  | 120 | 135 |
| South  | 98  | 101 |
```

Each line starting with `|` is a row. The table uses Word's *Table Grid* style, equal column widths filling the text
width, and a fixed layout. Cells hold text and inline markup. `\|` is a literal pipe; `|` inside `` `code` ``,
`\m{…}` or a command body does not split a cell.

## The `\table` command

```wgx
\table[header-rows=1, widths=(4cm, 1fr, 1fr), columns=(left, decimal, decimal), align=center]{
  | Item    | Q1   | Q2    |
  | Revenue | 10.5 | 12.25 |
  | Cost    | 7    | 8     |
}
```

Options you will use most:

| Option | Meaning |
|--------|---------|
| `style="Data Grid"`, `style=none` | a table style, or no style (no borders) |
| `header-rows=1` | the first rows repeat on every page |
| `widths=(4cm, 25%, 1fr, auto)` | lengths, percentages of the text width, and shares of what is left |
| `columns=(left, right, decimal)` | the paragraph alignment of each column; `decimal` lines numbers up on the point |
| `align=center` | the table between the margins |
| `look=(header-row, banded-rows)`, `look=none` | which parts of the table style apply |
| `borders=(all=(single, 0.5pt, #BFBFBF))`, `cell-margins=0.15cm` | borders and padding, over the style's |

All options, and every table and cell property, are in the [reference](../reference.md#cmd-table).

## Merged cells and cell options

A cell written as a single `\cell[…]{…}` takes options. In a pipe row, `colspan=N` covers the next N−1 cells, which
are left empty:

```wgx
\table[header-rows=1]{
  | Item    | Q1                        | Q2  |
  | Revenue | 10                        | 12  |
  | Cost    | \cell[shade=#FFF2CC]{7}   | 8   |
  | \cell[colspan=3, align=center]{*Total: 7*} |||
}
```

Cell options: `colspan`, `rowspan`, `shade` (background), `valign=top|center|bottom`, `align`, and borders
(`border-top=(single, 1pt, #C00000)`, `borders=none`).

## Rows and cells with blocks

For cells with several paragraphs, lists or nested tables, write rows with `\row` and `\cell`. Pipe rows and
`\row` mix freely.

```wgx
\table[widths=(1fr, 2fr)]{
  \row[header]{ \cell{Name} \cell{Description} }
  \row{
    \cell[rowspan=2, valign=center]{Merged}
    \cell{
      First paragraph.

      - a list inside a cell
      - with two items
    }
  }
  \row{ \cell{Second row, right column} }
}
```

A cell covered by a `rowspan` above it is simply left out of the rows below. Row options: `header` (repeat on each
page), `cant-split` (keep the row on one page), `height=1cm` or `height=(1cm, exact)`.

## Styling tables

Define a table style once and use it everywhere: see [table styles](styles.md#table-styles).

```wgx
\styles{
  table Ledger : "Table Grid" {
    borders: (outer=(single, 1pt, theme.accent1), inner=(single, 0.5pt, #D9D9D9));
    header-row { bold; shading: theme.accent1.lighter(80%); repeat; }
    banded-rows { odd { shading: #F7F7F7; } }
  }
}

\table[style=Ledger, columns=(left, decimal)]{
  | Account | Balance  |
  | Cash    | 1,250.00 |
  | Stock   | 980.50   |
}
```

## Captions

A caption is a paragraph before (or after) the table. Its kind, *Table*, comes from the table next to it:

```wgx
\caption[id=tbl:revenue]{Revenue by region}
| Region | Q1  |
| North  | 120 |

@tbl:revenue shows the regions.
```

See [references and captions](references.md).

## Floating tables and layout tables

A table can float with text around it, like a picture: `\table[x=(right, from=margin), y=1cm,
distance=(left=0.5cm)]{…}`. Word anchors floating tables to the text, margin or page, with text on both sides.

Borderless tables are the usual way to lay things out side by side in Word, and wordgenx uses them too
(`std:callout`, `std:signature`):

```wgx
\table[style=none, widths=(1fr, 1fr)]{
  \row{
    \cell{\image[width=4cm]{img/logo.png}}
    \cell[valign=center]{*Acme Ltd* \br 1 High Street \br London}
  }
}
```

## Good to know

- Short rows are padded with empty cells.
- Two tables in a row get an empty paragraph between them, as Word requires.
- Header rows and merged cells in `decimal` columns are right-aligned.
- Tables cannot hold sections; a table inside a cell is fine.
