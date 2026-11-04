# Importing Word documents, and checking builds

## `wordgenx import`

`wordgenx import` turns a `.docx` into wordgenx source: a folder with the `.wgx` document, a `.wgxs` style sheet, the
pictures, and a report of what could not be expressed.

```bash
wordgenx import report.docx                  # writes report/report.wgx, report.wgxs, media/, report.import.txt
wordgenx import report.docx -o src           # into the folder src
wordgenx import report.docx --keep-styles    # compile into the original's styles instead of a style sheet
wordgenx import report.docx --commands-only  # commands only: \p[style="Heading 1"]{…} rather than = …
wordgenx import report.docx --check          # fail unless the source compiles back to the original
```

The source reads like hand-written wordgenx: headings, lists, labels and `@references`, captions, pipe tables,
`*strong*` and `_emphasis_`, with direct formatting only where the original had it. Two ways to handle styles:

- **A style sheet** (the default): the original's styles, lists and theme become a `.wgxs`, printing only what
  differs from Word's built-ins.
- **`--keep-styles`:** the original, emptied of its body, becomes `report.template.docx`, and the source compiles
  into it with `\document[template=…]`. Styles, theme and lists stay exactly as they were.

### The check

Every import compiles its own output and compares it with the original: the text, every block (paragraphs, tables,
sections), the formatting each paragraph ends up with, and the counts of notes, comments and pictures. The report
(`report.import.txt`) ends with, for example:

```text
Its text is the original's.
Blocks that match the original: 120 of 120.
Paragraphs whose text looks the same: 64 of 64.
```

and lists the first differences when there are any. `--check` makes any difference fail the command, for scripts
and CI. Known losses are listed rather than counted: repeated spaces, text effects, headers Word does not show,
embedded objects kept as their pictures. Page layout is Word's and is not compared.

## How a build is checked

A document that compiles without errors should open in Word without complaint. wordgenx checks at three levels:

1. **The source.** Every command is checked against its declaration: where it may stand (`\cell` only in `\row`,
   block commands not inside text), its options and their values, its body. Labels must be defined once and exist
   where they are used; styles and lists must be defined (or be Word built-ins); bibliography keys must exist.
   Field types Word does not know are a warning.
2. **The escape hatches.** XML written by hand, in `\raw[ooxml]{…}` or `ooxml.pPr="…"`, must be well-formed and is
   checked against the ECMA-376 schemas for the place it goes, so a misplaced element or a bad value is an error,
   not a damaged file. Elements of Word's extension namespaces (`w14:`, …) are not checked.
3. **The written document.** After writing, wordgenx reads the parts back and checks what no schema sees: every
   relationship exists, every bookmark is opened once and closed, bookmark names and drawing ids are unique, links
   go to bookmarks that exist, and notes, comments, styles and lists that are referred to exist. A problem is a
   warning, `WGX0401`, listing each one.

For a full check, `wordgenx build --validate` also validates every part of the written document against the
schemas (about half a second more) and writes nothing if one fails. The test suite does this, and runs Microsoft's
Open XML SDK validator, on every example.
