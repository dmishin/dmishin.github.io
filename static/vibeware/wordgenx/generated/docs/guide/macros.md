# Macros and the standard library

wordgenx has simple macros: named snippets with parameters, expanded where they are used. They save repetition
and give house conventions a name. They are deliberately not a programming language: there are no conditionals,
loops or arithmetic, so any source can be compiled safely. For generated documents, write the source from a program
(a template engine such as Jinja works well) or build the document with the Python API.

## Constants

```wgx
\let{product}{wordgenx Compiler}
\let{client}{\b{Acme Ltd}}

The \product was built for \client. The \product{}'s output is a Word file.
```

`\let{name}{text}` defines a command without parameters. Whitespace after it is kept, so `\product is` keeps its
space; `\product{}` ends the name where text follows directly.

## Macros

```wgx
\define{term}[see]{\style[Strong]{#body}\ix[see=#see]{#body}}

\define{box}[title="Note", color=#E8F0FA]{
  \table[style=none, widths=(1fr)]{
    \row[cant-split]{\cell[shade=#color]{
      \p[keep-with-next]{\b{#title}}

      #body
    }}
  }
}

A \term{queue} forms when arrivals outpace service.

\box[title="Remember"]{Queues grow without bound when the load exceeds 1.}
```

- `\define{name}[parameters]{definition}`. Parameters are named; `title="Note"` gives a default.
- Inside the definition, `#title` is a parameter's value and `#body` the body the macro is called with.
  Parameters work in text and as option values (`shade=#color`).
- A parameter without a default is optional: left out, it is empty, and an option whose value it is
  disappears, so `\ix[see=#see]` above has no `see` option when `\term` is called without one.
- A macro whose definition is one paragraph works inside text; anything else stands alone as blocks.
- Macros can call macros. They cannot redefine built-in commands.
- An error inside a macro's definition points into the definition, with a note for each call it came through.

## Files

```text
\include{chapters/02-design.wgx}    the content of another file, here
\use{macros/house.wgx}             the definitions of a macro file (its content is ignored)
\use{std:callout}                  a module of the standard library
```

A file is loaded once, however often it is used. Paths are relative to the file that names them.

## The standard library

The library holds conveniences Word has no concept of, built only from Word's own parts so that the result stays
editable. The modules are ordinary `.wgx` files in `src/wordgenx/std/`: read them, or copy one and change it.

### `std:callout`

Highlighted boxes: a borderless one-cell table with a shaded background and a bold title.

```wgx
\use{std:callout}

\note{Plain information.}
\tip[title="Shortcut"]{Press F9 to update all fields.}
\warning{Refunds older than 180 days are rejected.}
\caution{Mind the gap.}
\callout[title="Custom", shade=#EDE7F6]{Any colour.}
```

| Macro | Options |
|-------|---------|
| `\callout` | `title` ("Note"), `shade` (#E8F0FA) |
| `\note`, `\tip`, `\warning`, `\caution` | `title` (the macro's name) |

### `std:signature`

Signature blocks for approvals and contracts: underlined tabs in a borderless table, the way they are built by hand
in Word.

```wgx
\use{std:signature}

\signature-block[party="the Customer", name="Jane Doe", role="Director"]

\approval[role="Approved by"]
```

| Macro | Options |
|-------|---------|
| `\signature-block` | `party`, `name`, `role` |
| `\approval` | `role` ("Approved by") |

## How far macros go

| You can | You cannot |
|---------|------------|
| name a snippet and reuse it | branch on a value (`if`) |
| pass text, markup and option values | loop, count or compute |
| give parameters defaults, leave them out | change the syntax or catcodes |
| call macros from macros, forward `#body` | redefine built-in commands |
| keep a house library in a file | use a macro inside a text option (`title={\product}` is an error) |

When you need more, generate the source. Because every short form has a command form and options are named, a
generated `.wgx` file is easy to write and to read back.
