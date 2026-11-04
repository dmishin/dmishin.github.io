# Sections, headers, footers and fields

## Page setup

`\section[…]` is a Word section: page size, orientation, margins, columns, headers and footers. In the preamble it
sets up the first section; after content it ends the current section and starts a new one with the same setup,
changed by its options.

```wgx
\section[size=A4, margins=(top=2.5cm, bottom=2.5cm, inside=3cm, outside=2cm), mirror, title-page]
\header[first]{}
\header{Annual report \tab \tab \field{STYLEREF "Heading 1"}}
\footer{\align[center]{Page \pagenum of \numpages}}

= Introduction

Portrait pages, mirrored margins for binding, no header on the title page.

\section[orientation=landscape, break=next-page]

= Wide appendix

A landscape section.

\section[orientation=portrait, columns=(count=2, gap=1cm, separator), break=continuous]

Two columns from here on, on the same page.
```

| Option | Example |
|--------|---------|
| `size` | `A4`, `Letter`, `(17cm, 24cm)` |
| `orientation` | `portrait`, `landscape` |
| `margins` | `2.5cm`, `(top=2cm, bottom=2cm, left=3cm, right=2cm)`, `inside=`/`outside=` |
| `break` | `next-page` (default), `continuous`, `even-page`, `odd-page`, `next-column` |
| `columns` | `2`, `(count=2, gap=1cm, separator)`, `(widths=(10cm, 4.5cm), gap=1cm)` |
| `page-numbers` | `lower-roman`, `(format=decimal, start=1)` |
| `valign` | `top`, `center`, `bottom`, `justify` |
| `line-numbers` | `on`, `(count-by=5, restart=each-page)` |
| `borders` | `(single, 1.5pt, theme.accent1)`, `(all=…, from=text, pages=first)`, `none` |
| `title-page`, `mirror`, `link-headers=false`, `gutter`, `header-distance` | |

## Headers and footers

`\header{…}` and `\footer{…}` belong to the section they are written in, and continue into the next sections
until one sets its own (or says `link-headers=false`). `\header[first]` is for the first page of the section,
`\header[even]` for even pages (it turns on different odd and even pages for the document).

Header and footer paragraphs use Word's Header and Footer styles, with a centre and a right tab stop, so
`Left \tab Centre \tab Right` lines up. They may hold tables, pictures and fields, but not notes or sections.

## Page numbers and fields

| Command | Field | Shows |
|---------|-------|-------|
| `\pagenum` | PAGE | the page number |
| `\numpages` | NUMPAGES | the number of pages |
| `\sectionpages` | SECTIONPAGES | the pages of the section |
| `\date[format="d MMMM yyyy"]` | (text) | the build date; `kind=today`, `saved` or `created` for a field |
| `\pageref{label}` | PAGEREF | the page of a label |
| `\field{…}` | any | any Word field |

`\field` takes the field code as Word shows it (Alt+F9), with nested fields in braces, and optionally the
`result` to show until Word updates it:

```wgx
\meta[title="Annual report", custom.client="Acme"]

\field{TITLE}, for \field{DOCPROPERTY "client"}, has \field{= { NUMPAGES } - 1} pages after this one.
Chapter: \field[result="Introduction"]{STYLEREF "Heading 1"}.
```

Results wordgenx knows (document properties, page counts it can give) are filled in; others are left for Word,
which updates fields when the document opens. A field type Word does not know (`\field{PAGEREFF x}`) is a warning
with the nearest name.

## Document properties and settings

```wgx
\meta[title="Annual report", author="Jane Doe", keywords=(finance, 2025), custom.project-code="WX-001"]
\settings[even-odd-headers, update-fields-on-open, default-tab-stop=1cm, hyphenation=auto]

Text.
```

`\meta` fills in File > Info (and the TITLE, AUTHOR, … fields); `custom.NAME` adds custom properties
(DOCPROPERTY). `\settings` covers the document-wide options: footnote numbering, protection, track changes,
caption numbering, the code theme. See the [reference](../reference.md#cmd-settings).
