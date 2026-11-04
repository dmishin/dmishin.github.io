#!/usr/bin/env python3
"""Tiny static site generator.

    python build.py            build the site
    python build.py serve      build, serve on http://127.0.0.1:8000, rebuild on change
    python build.py clean      delete the output folder
    --drafts                   include pages with  draft: true

Pipeline (see build()):
    pass 1  load every page: frontmatter + body -> Page objects in memory
    tags    group tagged pages per folder
    pass 2  render templates, post-process HTML (scaled images), write
    static  copy static/ to output/ (only changed files)
"""
import argparse
import functools
import http.server
import importlib.util
import posixpath
import re
import shutil
import sys
import threading
import time as _time
from datetime import date, datetime, time
from pathlib import Path

import jinja2
import markdown
import yaml
from PIL import Image, ImageOps

import chem

PAGE_EXTS = {".md", ".html"}
MORE = "<!--more-->"

DEFAULT_CONFIG = {
    "title": "My site",
    "base_path": "",          # URL prefix if the site is not at the server root, e.g. "/~dim"
    "site_url": "",           # absolute URL, for feeds etc.
    "content_dir": "content",
    "static_dir": "static",
    "templates_dir": "templates",
    "output_dir": "output",
    "default_sort": "-date",
    "image_quality": 85,
}


# --------------------------------------------------------------------------- model

class Site:
    """Global state, available as `site` in every template. Config keys read as attributes."""

    def __init__(self, root, config, hooks=None):
        self.root = root
        self.config = config
        self.hooks = hooks
        self.pages = []           # all loaded pages
        self.by_dir = {}          # "posts" -> [Page, ...]  ("" is the root folder)
        self.tags = {}            # "posts" -> {"tag": [Page, ...]}
        self.errors = 0

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self.__dict__["config"].get(name)

    def path(self, key):
        return self.root / self.config[key]

    def url(self, rel):
        """Output-relative path -> URL."""
        return self.config["base_path"].rstrip("/") + "/" + rel

    def hook(self, name, *args):
        fn = getattr(self.hooks, name, None)
        return fn(*args) if fn else None

    def error(self, where, exc):
        self.errors += 1
        print(f"ERROR {where}: {exc}", file=sys.stderr)


class Page:
    """One source page. Frontmatter keys read as attributes (page.title, page.foo)."""

    def __init__(self, src, rel, meta, text):
        self.src = src                        # Path of the source file
        self.rel = rel                        # "posts/first.md"
        self.dir = posixpath.dirname(rel)     # "posts"
        self.name = posixpath.splitext(posixpath.basename(rel))[0]
        self.meta = meta
        self.text = text                      # source body, frontmatter stripped
        self.html = ""                        # rendered body
        self.summary = None                   # rendered summary (or None)
        self.data = {}                        # free space for hooks
        out = meta.get("output") or self.name + ".html"
        self.out = posixpath.join(self.dir, out)
        self.url = None
        self.tag_links = []                   # [(tag, url)]

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self.__dict__.get("meta", {}).get(name)

    def __repr__(self):
        return f"<Page {self.rel}>"


# --------------------------------------------------------------------------- helpers

def slugify(s):
    return re.sub(r"[^\w]+", "-", str(s).lower()).strip("-") or "tag"


def walk(folder):
    """Files under folder, skipping anything whose path part starts with '_' or '.'."""
    if not folder.is_dir():
        return
    for p in sorted(folder.rglob("*")):
        rel = p.relative_to(folder)
        if p.is_file() and not any(part[0] in "_." for part in rel.parts):
            yield p, rel.as_posix()


def to_datetime(v):
    if isinstance(v, datetime):
        return v
    if isinstance(v, date):
        return datetime.combine(v, time())
    if isinstance(v, str):
        try:
            return datetime.fromisoformat(v.strip())
        except ValueError:
            return v
    return v


def sort_pages(pages, spec):
    """spec: "date", "-date", "title" ... Pages missing the key go last."""
    desc = spec.startswith("-")
    key = spec.lstrip("+-")
    has = [p for p in pages if getattr(p, key, None) is not None]
    rest = [p for p in pages if getattr(p, key, None) is None]
    try:
        has.sort(key=lambda p: getattr(p, key), reverse=desc)
    except TypeError:
        has.sort(key=lambda p: str(getattr(p, key)), reverse=desc)
    return has + rest


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


# --------------------------------------------------------------------------- pass 1: load

FRONTMATTER = re.compile(r"\A---[ \t]*\r?\n(.*?)^---[ \t]*\r?$\n?", re.S | re.M)


def split_frontmatter(text):
    text = text.lstrip("﻿")
    m = FRONTMATTER.match(text)
    if not m:
        return {}, text
    meta = yaml.safe_load(m.group(1)) or {}
    if not isinstance(meta, dict):
        raise ValueError("frontmatter must be a YAML mapping")
    return meta, text[m.end():]


def load_page(src, rel):
    meta, text = split_frontmatter(src.read_text(encoding="utf-8"))
    page = Page(src, rel, meta, text)
    meta.setdefault("type", "page")
    if "title" not in meta:
        m = (re.search(r"^#(?!#)\s*(.+?)\s*#*\s*$", text, re.M) if src.suffix == ".md"
             else re.search(r"<h1[^>]*>(.*?)</h1>", text, re.S | re.I))
        meta["title"] = m.group(1).strip() if m else page.name
    meta["date"] = to_datetime(meta.get("date")) or datetime.fromtimestamp(src.stat().st_mtime)
    tags = meta.get("tags") or []
    if isinstance(tags, str):
        tags = tags.split(",")
    meta["tags"] = [str(t).strip() for t in tags if str(t).strip()]
    return page


def make_markdown():
    return markdown.Markdown(
        extensions=["extra", "toc", "sane_lists", "pymdownx.arithmatex"],
        extension_configs={"pymdownx.arithmatex": {"generic": True}},
    )


MD_LINK = re.compile(r'''(href=["'])(?![a-z][a-z0-9+.-]*:|//)([^"'#?]*?)\.md([#?][^"']*)?(["'])''', re.I)


def render_body(page, md):
    """Fill page.html and page.summary from page.text."""
    def convert(t):
        t = chem.preprocess(t)
        t = md.reset().convert(t) if page.src.suffix == ".md" else t
        return MD_LINK.sub(lambda m: f"{m[1]}{m[2]}.html{m[3] or ''}{m[4]}", t)

    text = page.text
    if MORE in text:
        head = text.split(MORE, 1)[0]
        page.summary = convert(head)
        text = text.replace(MORE, "", 1)
    if page.meta.get("summary"):
        page.summary = convert(str(page.meta["summary"]))
    page.html = convert(text)


# --------------------------------------------------------------------------- images

SIZED = re.compile(r'''((?:src|href)\s*=\s*["'])([^"'?]+)\?size=(\d*):(\d*)(["'])''', re.I)


def process_images(html, out_rel, site):
    """Replace  img.jpg?size=W:H  links with a scaled copy img_W_H.jpg."""
    def repl(m):
        url, w, h = m.group(2), m.group(3), m.group(4)
        try:
            return m.group(1) + scaled_image(url, int(w or 0), int(h or 0), out_rel, site) + m.group(5)
        except Exception as e:
            site.error(f"{out_rel}: image {url}", e)
            return m.group(0)
    return SIZED.sub(repl, html)


def scaled_image(url, w, h, out_rel, site):
    if not (w or h):
        raise ValueError("size needs width or height")
    if re.match(r"[a-z][a-z0-9+.-]*:|//", url, re.I):
        raise ValueError("only local images can be scaled")
    base = site.config["base_path"].rstrip("/")
    if url.startswith("/"):
        rel = url[len(base) + 1:] if base and url.startswith(base + "/") else url[1:]
    else:
        rel = posixpath.normpath(posixpath.join(posixpath.dirname(out_rel), url))
    if rel.startswith(".."):
        raise ValueError("points outside the site")
    src = site.path("static_dir") / rel
    if not src.is_file():
        raise FileNotFoundError(f"{src} not found")

    stem, ext = posixpath.splitext(rel)
    new_rel = f"{stem}_{w or ''}_{h or ''}{ext}"
    dst = site.path("output_dir") / new_rel
    if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
        resize(src, dst, w, h, site.config["image_quality"])
        print(f"  image {new_rel}")
    return url.rsplit("/", 1)[0] + "/" + posixpath.basename(new_rel) if "/" in url else posixpath.basename(new_rel)


def resize(src, dst, w, h, quality):
    """Fit inside w x h (0 = unconstrained), keep aspect ratio, never upscale."""
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        W, H = im.size
        scale = min(w / W if w else 1.0, h / H if h else 1.0, 1.0)
        im = im.resize((max(1, round(W * scale)), max(1, round(H * scale))), Image.LANCZOS)
        if dst.suffix.lower() in (".jpg", ".jpeg") and im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, quality=quality)


# --------------------------------------------------------------------------- pass 2: render

def make_env(site):
    env = jinja2.Environment(
        loader=jinja2.FileSystemLoader(site.path("templates_dir")),
        trim_blocks=True, lstrip_blocks=True,
    )
    env.filters["slugify"] = slugify
    env.filters["datefmt"] = lambda d, fmt="%Y-%m-%d": d.strftime(fmt) if hasattr(d, "strftime") else d
    return env


class Outputs:
    """Tracks written files to catch two sources producing the same output."""

    def __init__(self):
        self.owner = {}

    def claim(self, rel, who, site):
        if rel in self.owner:
            site.error(who, f"output {rel} already produced by {self.owner[rel]}")
            return False
        self.owner[rel] = who
        return True


def render_to(env, site, template, out_rel, ctx, outputs, who):
    if not outputs.claim(out_rel, who, site):
        return
    try:
        if template in (None, "none"):
            html = ctx["content"]
        else:
            html = env.get_template(template).render(site=site, **ctx)
        html = process_images(html, out_rel, site)
        html = site.hook("on_output", html, out_rel, site) or html
        write(site.path("output_dir") / out_rel, html)
    except Exception as e:
        site.error(who, e)


def list_pages(page, site):
    pages = [p for p in site.by_dir.get(page.dir, []) if p is not page]
    pages = sort_pages(pages, str(page.meta.get("sort", site.config["default_sort"])))
    if page.meta.get("limit"):
        pages = pages[:int(page.meta["limit"])]
    return pages


def render_pages(env, site, outputs):
    for page in site.pages:
        ctx = {"page": page, "meta": page.meta, "content": page.html}
        if page.type == "list":
            ctx["pages"] = list_pages(page, site)
        site.hook("on_render", page, ctx, site)
        template = page.meta.get("template", f"{page.type}.html")
        render_to(env, site, template, page.out, ctx, outputs, page.rel)


def collect_tags(site):
    for folder, pages in site.by_dir.items():
        tags = {}
        for p in pages:
            for t in p.tags:
                tags.setdefault(t, []).append(p)
        if not tags:
            continue
        site.tags[folder] = {t: sort_pages(ps, site.config["default_sort"])
                             for t, ps in sorted(tags.items(), key=lambda kv: kv[0].lower())}
        for p in pages:
            p.tag_links = [(t, site.url(posixpath.join(folder, f"tag_{slugify(t)}.html"))) for t in p.tags]


def render_tags(env, site, outputs):
    for folder, tags in site.tags.items():
        links = [(t, site.url(posixpath.join(folder, f"tag_{slugify(t)}.html")), ps) for t, ps in tags.items()]
        index_url = site.url(posixpath.join(folder, "tags.html"))
        render_to(env, site, "tags.html", posixpath.join(folder, "tags.html"),
                  {"folder": folder, "tags": links, "tags_url": index_url}, outputs, f"tags of /{folder}")
        for tag, url, pages in links:
            render_to(env, site, "tag.html", posixpath.join(folder, f"tag_{slugify(tag)}.html"),
                      {"folder": folder, "tag": tag, "pages": pages, "tags_url": index_url},
                      outputs, f"tag {tag!r} of /{folder}")


def copy_static(site, outputs):
    out = site.path("output_dir")
    for src, rel in walk(site.path("static_dir")):
        if not outputs.claim(rel, f"static/{rel}", site):
            continue
        dst = out / rel
        if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)


# --------------------------------------------------------------------------- build

def load_config(root):
    cfg = dict(DEFAULT_CONFIG)
    f = root / "site.yaml"
    if f.exists():
        cfg.update(yaml.safe_load(f.read_text(encoding="utf-8")) or {})
    return cfg


def load_hooks(root):
    f = root / "hooks.py"
    if not f.exists():
        return None
    spec = importlib.util.spec_from_file_location("site_hooks", f)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def build(root, drafts=False):
    t0 = _time.time()
    site = Site(root, load_config(root), load_hooks(root))
    env = make_env(site)
    site.hook("setup_jinja", env, site)
    md = make_markdown()

    # pass 1: load all pages into memory
    for src, rel in walk(site.path("content_dir")):
        if src.suffix.lower() not in PAGE_EXTS:
            print(f"  skip {rel}: not a page (put it in {site.config['static_dir']}/)")
            continue
        try:
            page = load_page(src, rel)
            if page.draft and not drafts:
                continue
            page.url = site.url(page.out)
            render_body(page, md)
            site.hook("on_load", page, site)
        except Exception as e:
            site.error(rel, e)
            continue
        site.pages.append(page)
        site.by_dir.setdefault(page.dir, []).append(page)

    collect_tags(site)
    site.hook("on_site_loaded", site)

    # pass 2: render and write
    outputs = Outputs()
    render_pages(env, site, outputs)
    render_tags(env, site, outputs)
    copy_static(site, outputs)

    print(f"built {len(site.pages)} pages in {_time.time() - t0:.2f}s"
          + (f", {site.errors} errors" if site.errors else ""))
    return site


def snapshot(root, cfg):
    files = [root / "site.yaml", root / "hooks.py"]
    for key in ("content_dir", "static_dir", "templates_dir"):
        files += (root / cfg[key]).rglob("*")
    return {str(p): p.stat().st_mtime for p in files if p.is_file()}


def serve(root, port, drafts):
    build(root, drafts)
    cfg = load_config(root)
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root / cfg["output_dir"]))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    print(f"serving on http://127.0.0.1:{port}/  (Ctrl+C to stop)")
    last = snapshot(root, cfg)
    try:
        while True:
            _time.sleep(1)
            now = snapshot(root, cfg)
            if now != last:
                last = now
                try:
                    build(root, drafts)
                except Exception as e:
                    print(f"ERROR: {e}", file=sys.stderr)
    except KeyboardInterrupt:
        httpd.shutdown()


def main():
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", nargs="?", default="build", choices=["build", "serve", "clean"])
    ap.add_argument("--root", default=".", help="site folder (default: current)")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--drafts", action="store_true", help="include draft pages")
    args = ap.parse_args()
    root = Path(args.root).resolve()

    if args.command == "clean":
        shutil.rmtree(root / load_config(root)["output_dir"], ignore_errors=True)
    elif args.command == "serve":
        serve(root, args.port, args.drafts)
    else:
        sys.exit(1 if build(root, args.drafts).errors else 0)


if __name__ == "__main__":
    main()
