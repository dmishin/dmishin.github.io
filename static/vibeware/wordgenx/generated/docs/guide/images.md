# Pictures, figures and text boxes

## Pictures

```wgx
Our logo \image[width=2cm, alt="The Acme logo"]{img/logo.png} sits in the text.

\image[width=50%]{img/logo.png}
```

`\image{file}` takes PNG, JPEG, GIF, BMP and SVG (and EMF or WMF). The path is relative to the source file.

- **Size:** `width=8cm` or `width=50%` (of the text width); `height=` alone works too. With one of them the other
  follows the picture's proportions; with neither, the picture's own size, shrunk to the text width if it is wider.
- `alt="…"` is the description screen readers use; `name=` its name in Word's Selection pane.
- `crop=(left=10%, right=10%)` cuts off edges, `rotate=-5` turns it (degrees clockwise),
  `border=(single, 1pt, theme.accent1)` frames it.
- **SVG** is stored as Word stores it, with a PNG for Word 2013 and older: `fallback=chart.png`, or a plain grey
  picture of the same proportions.
- The same file used twice is stored once.

## Figures

A figure is a picture with a numbered caption, kept together on one page:

```wgx
\figure[id=fig:logo, width=6cm]{
  \image{img/logo.png}
  \caption{The company logo}
}

As @fig:logo shows, the logo is blue.
```

The caption is Word's own: the *Caption* style, a `SEQ Figure` field, and bookmarks so that `@fig:logo` prints
"Figure 1" and `\ref[form=full]{fig:logo}` "Figure 1: The company logo". `\listof[Figure]` lists the figures. The
figure's `id` moves to its caption; `width` applies to pictures without a size of their own; `align` overrides the
centring.

## Floating pictures

A picture floats, with text flowing around it, when it has `float`, `wrap`, `x` or `y`:

```wgx
\image[width=4cm, wrap=square, x=(right, from=margin), y=(0cm, from=paragraph)]{img/logo.png}
This paragraph flows around the picture on its right. Text wraps on the left side, and continues below
it once the picture ends. Floating pictures belong to the paragraph they are written in.
```

- `wrap=square` (the default), `tight`, `top-bottom`, `behind` or `front`; `wrap-side=both|left|right|largest`.
- `x=` is `left`, `center`, `right`, `inside`, `outside` or a length, measured `from=column` (the default),
  `margin`, `page`, `character` or a margin.
- `y=` is `top`, `center`, `bottom` or a length, measured `from=paragraph` (the default), `line`, `margin`, `page`
  or a margin.
- `distance=(all=0.3cm)` is the space between the picture and the text.

A full-page background picture: `\image[width=21cm, height=29.7cm, wrap=behind, x=(0cm, from=page),
y=(0cm, from=page)]{cover.jpg}`.

## Text boxes

A text box holds blocks (paragraphs, lists, tables) in a frame, inline or floating, with the same position options
as a picture:

```wgx
\textbox[width=6cm, border=(single, 1pt, theme.accent1), fill=theme.accent1.lighter(80%), x=right, padding=0.3cm]{
  *Key figure*

  Revenue grew 12% in the quarter.
}
The text box floats at the right of the column, and this text flows around it.
```

Its own options: `width` (default: the text width), `height` (default: as tall as its text), `fill`, `border`,
`padding`, `valign` and `rotate`. A text box cannot hold notes, or sit in a figure.

## Watermarks

```wgx
\section[size=A4]
\watermark[DRAFT]

The watermark sits behind the text of every page of the section and the sections after it.
```

`\watermark[text="CONFIDENTIAL", color=#C00000, layout=horizontal, font="Arial"]`, or a picture with
`\watermark[image=logo.png]` (washed out unless `washout=off`). `\watermark[none]` stops it in a later section. It
is written the way Word's Design > Watermark writes it, so Word's *Remove Watermark* works.

## Other documents and drawings

- `\embed-docx{part.docx}` inserts another Word document, which Word merges in when it opens the file.
- Diagrams and charts go in as pictures: draw them with any tool, export SVG (with a PNG fallback) or PNG, and use
  `\image`. Native Word charts and shapes are not supported yet.
- The callouts of `std:callout` are shaded one-cell tables, often a better choice than text boxes for boxed text
  that flows with the page (see [macros](macros.md)).
