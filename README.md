# Home page generator

A deliberately small static site generator: `build.py` (one file) + `chem.py` (formula preprocessor).

```
pip install -r requirements.txt
python build.py            # build into output/
python build.py serve      # build, serve on http://127.0.0.1:8000, rebuild on change
python build.py clean      # delete output/
python build.py --drafts   # include draft: true pages
```

## Publishing

This is the `source` branch of dmishin.github.io. Every push to it runs
`.github/workflows/pages.yml` on GitHub: it installs `requirements.txt`, runs `python build.py`
and deploys `output/` to GitHub Pages (Settings → Pages → Source: "GitHub Actions").
A build with errors fails the run, and the live site stays as it was.
To redeploy without changes: Actions → "Build and deploy site" → Run workflow.

The old `master` branch holds the previous, pre-built site and is no longer used.

## Layout

```
site.yaml      config (title, base_path, folders, default sort, image quality)
content/       pages only: .md and .html, folder structure is kept
static/        copied as-is (only changed files); merged with content into output/
templates/     Jinja: base.html, page.html, list.html, tags.html, tag.html
hooks.py       optional custom processing
output/
```

Files and folders whose name starts with `_` or `.` are ignored.
`content/a/b.md` → `output/a/b.html`. If two sources produce the same output file, it's an error.

## Frontmatter

```yaml
---
title: Burning hydrogen     # default: first "# heading" / <h1>, else file name
date: 2026-10-01            # default: file modification time
type: page                  # page | list   -> template page.html / list.html
template: other.html        # override; "none" = write the body without a template
tags: [chemistry, notes]    # or "chemistry, notes"
summary: Short *markdown*   # or put <!--more--> in the body
draft: true                 # skipped unless --drafts
output: feed.xml            # override the output file name (same folder)
sort: -date                 # lists: any frontmatter key, "-" = descending
limit: 5                    # lists: show only first N
anything: else              # available as page.anything
---
```

## Templates

Every template gets `site` (`site.title`, `site.pages`, `site.by_dir`, `site.tags`, any config key).

| template    | context |
|-------------|---------|
| `page.html` | `page`, `meta`, `content` (rendered body) |
| `list.html` | same + `pages`: the other pages in the **same folder** (no subfolders), sorted and limited |
| `tags.html` | `folder`, `tags`: list of `(tag, url, pages)`, `tags_url` |
| `tag.html`  | `folder`, `tag`, `pages`, `tags_url` |

A `page` has `title`, `date`, `tags`, `url`, `html`, `summary` (HTML or None), `tag_links` (`[(tag, url)]`),
`meta`, `data` (free space for hooks), and every frontmatter key as an attribute.
Filters: `datefmt("%d %b %Y")`, `slugify`.

All pages are loaded and rendered to HTML once (pass 1), kept in memory, then templates are rendered (pass 2),
so a list reuses the already-rendered bodies and anything hooks attached to the pages.

## Markdown extras

- **Math**: `$...$`, `$$...$$`, `\(...\)`, `\[...\]`, rendered in the browser by MathJax (with mhchem).
- **Chemistry**: `\ce{2H2 + O2 -> 2H2O}` outside math is turned into HTML by `chem.py`
  (`<sub>`/`<sup>`, no JavaScript). Charges: `Na+`, `Cl-`, `Fe^3+`, `SO4^{2-}`. Hydrates: `CuSO4.5H2O`.
  Arrows: `->  <-  <->  <=>`. Inside `$...$`, `\ce` is left to MathJax. Try: `python chem.py "\ce{Ca(OH)2}"`.
- Links to `other.md` are rewritten to `other.html`.
- Python-Markdown `extra` (tables, footnotes, fenced code, attr lists...), `toc`, `sane_lists`.

## Images

`src="photo.jpg?size=800:"`, `?size=:600` or `?size=800:600` (in Markdown, HTML or templates) →
`photo_800_.jpg` etc. is generated from `static/` next to the original in `output/`. The image fits inside the box,
keeps its aspect ratio, is never upscaled, and is rotated according to EXIF. It is regenerated only when the source is newer.

## Tags

For every folder where pages have `tags`, a `tags/` subfolder is generated in it: `tags/index.html`
(template `tags.html`) and `tags/<slug>.html` for each tag (template `tag.html`). Link a tag from a page
as `[ferrioxalates](tags/ferrioxalate.html)`.

## Hooks

`hooks.py`, all functions optional:

```python
def setup_jinja(env, site): ...            # filters, globals
def on_load(page, site): ...               # pass 1, after the body is rendered
def on_site_loaded(site): ...              # all pages loaded, tags collected
def on_render(page, ctx, site): ...        # change a page's template context (e.g. new page types)
def on_output(html, out_rel, site): ...    # final HTML of any file; return new HTML
```
