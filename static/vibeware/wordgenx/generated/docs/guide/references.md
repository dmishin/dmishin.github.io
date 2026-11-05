# References, captions, contents and citations

## Labels and cross-references

```wgx
= Results {#sec:results}

== Throughput {#sec:throughput}

Throughput is discussed in @sec:throughput, on page \pageref{sec:throughput}.
The heading text is "\ref[form=text]{sec:throughput}".
```

A label (`{#name}` or `id=name`) becomes a Word bookmark, and `@name` a `REF` field to it, so the reference stays
right when the document changes and Word updates its fields. wordgenx fills in each result in advance, so the
document reads correctly before any update.

What `@label` prints depends on what it points at, as Word's Insert Cross-reference does:

| Label on | `@label` prints |
|----------|-----------------|
| a caption (figure, table, listing, …) | "Figure 3" |
| a display equation | "(3.2)" |
| a numbered heading, clause or list item | its number, "4.2" |
| an unnumbered heading or a `\p[id=…]` paragraph | its text |
| a `\seq` counter | its number |
| a footnote or endnote | the note number |

Other forms: `\ref[form=number]{…}` (just "3"), `form=text` (the heading or caption text), `form=full` ("Figure 3:
Overall architecture"), `form=page` (the page), `form=above-below`, and `form=relative` (a clause number relative to
where the reference is). `\pageref{…}` is the page number. `[your own words](#sec:results)` is a link to the label that prints
nothing of it.

Labels may be used before they are defined and across `\include`d files. A label defined twice, or a reference to
one that does not exist, is an error.

## Captions

```wgx
\caption[id=tbl:income]{Condensed income statement}
| Item    | 2025 |
| Revenue | 412  |

\figure[id=fig:logo, width=4cm]{
  \image{img/logo.png}
  \caption{The logo}
}

See @tbl:income and @fig:logo.
```

- The kind (Figure, Table, Equation, Listing, or your own: `\caption[Chart]{…}`) comes from the table, picture or
  code next to the caption, or is given first.
- Captions are Word's: the *Caption* style with a `SEQ` field, so Word's *Insert Table of Figures* and
  cross-reference dialogs see them.
- Chapter numbers ("Figure 3.2"): `\settings[captions=(chapter-numbers, chapter-style="Heading 1", separator=".")]`.

## Tables of contents, figures and indexes

```wgx
\toc[levels=1-3, title="Contents"]
\listof[Figure, title="Figures"]

= Queueing {#sec:queue}

Waiting lines\ix{queueing} form when arrivals outpace service\ix{service!rate}.
See also \ix[see="queueing"]{waiting lines}.

\index[columns=2, headings, title="Index"]
```

- `\toc` and `\listof` are Word's TOC fields with the entries already filled in; Word adds the page numbers when it
  updates fields (it asks when the document opens).
- `\ix{term}` marks a place for the index (`!` separates sub-entries) and prints nothing. `\index` writes the index,
  sorted, with letter `headings` and `columns` if asked.

## Footnotes and endnotes

```wgx
\settings[footnotes=(format=lower-roman, restart=each-section)]

A claim.\footnote[id=fn:source]{From the 2025 survey, which had *412* replies.}
Another.\endnote{An endnote.}
As note @fn:source says, the sample was small.
```

A note's body may hold several paragraphs, lists and tables. Notes cannot be in headers, footers or text boxes.
Numbering is set for the document with `\settings[footnotes=(…), endnotes=(…)]`: `format`, `restart`
(`continuous`, `each-section`, `each-page`), `position` and `start`.

## Counters

`\seq[Req]` is a counter of your own, a Word `SEQ` field; give it an `id` to refer to it:

```wgx
Requirement \seq[Req, id=req:login]: users log in. Requirement \seq[Req]: users log out.
Requirement @req:login comes first.
```

`restart=heading-1` restarts it at each Heading 1; `format=upper-letter` changes the numbers.

## Citations and bibliographies

```wgx
\bibliography[file="citations/refs.bib", style=apa]

Queues were studied by \textcite{daganzo2005} and others \cite[page=214]{daganzo2005}.

\printbibliography[title="References"]
```

- Data: BibTeX (`.bib`) or CSL-JSON (`.json`) files; styles: `harvard` (the default), `apa`, `ieee`, `chicago`,
  or a `.csl` file.
- `\cite[page=12, prefix="see", suffix="table 2"]{key}`, several keys at once (`\cite{a, b}`), and `\textcite` for
  "Author (year)" in the text.
- Citations link to their bibliography entry. Unknown keys are errors with a suggestion.
