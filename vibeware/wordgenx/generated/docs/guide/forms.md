# Forms and review

## Content controls

Content controls are the fields of a Word form: places a reader fills in, which programs can read back by their
tag.

```wgx
Name: \control[tag=name, title="Full name", placeholder="Enter your name"]

Status: \control[dropdown, tag=status, items=("Draft", "Final")]{Draft}

Start date: \control[date, tag=start, format="d MMMM yyyy", date=2026-11-02]

\control[checkbox, tag=agree] I agree to the terms.

Notes: \control[rich-text, tag=notes]{Prefers \b{morning} meetings.}
```

| Type | Holds |
|------|-------|
| `text` (the default) | plain text |
| `rich-text` | formatted text |
| `dropdown`, `combo` | one of `items=(…)`; a combo box also takes typed text |
| `date` | a date picker: `format="d MMMM yyyy"`, `date=2026-11-02` |
| `checkbox` | a check box, `checked` to tick it |
| `picture` | `\control[picture]{\image{…}}`, or an empty frame of `width` × `height` |

The body is the value. Without one, the control shows its `placeholder` (or Word's own) in grey. `tag` names it for
programs, `title` shows on it in Word, and `lock=content|control|both` stops the value being changed, the control
being deleted, or both. Controls hold text, not whole paragraphs.

To let readers edit only the controls, protect the document:

```wgx
\settings[protection=(mode=forms, enforce)]

Name: \control[tag=name]
```

Other modes: `read-only`, `comments`, `tracked-changes`. There is no password: protection guides readers rather
than stopping them.

## Comments

```wgx
\meta[author="R. Patel"]

The payment term is \comment[text="Please confirm the commercial position."]{thirty (30) days}.
\comment[author="J. Doe", date=2026-10-13, text={A comment with *markup*:

- and a list}]
```

`\comment[text=…]{commented text}` puts a comment in the margin on the text in its body; without a body it marks a
point. `author` defaults to the document's author, `initials` to the author's initials, `date` to the build time.
Comments go in the body and in table cells, not in headers, notes or text boxes.

## Tracked changes

`\settings[track-changes]` turns on Word's Track Changes, so edits made later in Word are tracked. Writing tracked
insertions and deletions in the source (`\ins`, `\del`) is not supported: `\ins` keeps its text and `\del` drops
it, each with a warning.
