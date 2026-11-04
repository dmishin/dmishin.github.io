"""The Python side of the demo: runs in Pyodide, in the web worker.

Files live in Pyodide's in-memory file system under /work. Binary data (the built .docx,
uploads, zips) passes through files there; everything else is returned as JSON text.
"""

from __future__ import annotations

import io
import json
import re
import shutil
import time
import traceback
import zipfile
from pathlib import Path

from wordgenx.compiler import InternalError, build
from wordgenx.syntax import Source
from wordgenx.syntax.diagnostics import render
from wordgenx.syntax.format import FormatError, format_source

WORK = Path("/work")
OUT = Path("/out")
TEXT_SUFFIXES = (".wgx", ".wgxs", ".bib", ".json", ".csl", ".txt", ".md")
_PATH_RE = re.compile(r"[\w./-]+\.(?:wgx|wgxs|bib|json|csl)\b")


def _json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False)


def setup(examples_zip: str) -> None:
    WORK.mkdir(exist_ok=True)
    OUT.mkdir(exist_ok=True)
    with zipfile.ZipFile(examples_zip) as z:
        z.extractall(WORK)
    # warm up: the first build loads lxml, Pygments and the style tables
    build(Source(str(WORK / "warmup.wgx"), "= Warm-up\n\nText.\n"))


def compile_file(main: str) -> str:
    """Build `main`; the .docx goes to /out/out.docx. JSON: ok, ms, counts, diagnostics."""
    started = time.perf_counter()
    target = OUT / "out.docx"
    target.unlink(missing_ok=True)
    try:
        source = Source.from_path(main)
        data, result = build(source)
    except InternalError as e:
        return _json({"ok": False, "internal": str(e), "diagnostics": []})
    except Exception:  # a crash in the compiler: show it rather than hang the page
        return _json({"ok": False, "internal": traceback.format_exc(), "diagnostics": []})
    diagnostics = []
    for src, d in result.diagnostics:
        item = {
            "severity": d.severity.value,
            "code": d.code.value,
            "message": d.message,
            "file": src.name,
            "text": render(d, src),
        }
        if d.located:
            start, end = src.position(d.span.start), src.position(d.span.end)
            item |= {
                "line": start.line, "col": start.column,
                "endLine": end.line, "endCol": end.column,
            }
        diagnostics.append(item)
    if data is not None:
        target.write_bytes(data)
    return _json({
        "ok": data is not None,
        "ms": round((time.perf_counter() - started) * 1000),
        "errors": result.error_count,
        "warnings": result.warning_count,
        "diagnostics": diagnostics,
    })


def related(main: str) -> str:
    """The text files `main` names (includes, style sheets, macros, bibliographies), and the
    files those name, in the order found: what the editor shows as tabs."""
    found: list[str] = []
    todo = [Path(main)]
    while todo:
        path = todo.pop(0)
        if str(path) in found or not path.is_file():
            continue
        found.append(str(path))
        if path.suffix not in (".wgx", ".wgxs", ".txt"):
            continue
        text = path.read_text(encoding="utf-8-sig", errors="replace")
        text = re.sub(r"(?m)(^|(?<=\s))%.*$", "", text)  # names in comments do not count
        for name in _PATH_RE.findall(text):
            candidate = (path.parent / name).resolve()
            if candidate.is_file() and str(candidate) not in found:
                todo.append(candidate)
    return _json(found)


def import_docx(upload: str) -> str:
    """Import an uploaded .docx into /work/import/<name>/; JSON: main, files, report."""
    from wordgenx.importer import import_docx as run_import  # the importer is large

    path = Path(upload)
    folder = WORK / "import" / path.stem
    shutil.rmtree(folder, ignore_errors=True)
    try:
        imported = run_import(path, folder)
    except Exception as e:
        return _json({"ok": False, "error": f"{type(e).__name__}: {e}"})
    return _json({
        "ok": True,
        "main": str(imported.source),
        "root": str(folder),
        "report": imported.report(),
    })


def format_text(name: str, text: str) -> str:
    """`text` in the canonical layout; JSON: text (null when it cannot be formatted), problem."""
    if name.endswith(".wgxs"):
        return _json({"text": None, "problem": "style sheets are not formatted yet"})
    try:
        result = format_source(Source(name, text))
    except FormatError as e:
        return _json({"text": None, "problem": str(e)})
    return _json({"text": result.text, "problem": result.problem})


def zip_folder(root: str) -> None:
    """Zip `root` into /out/source.zip (the download of a whole project)."""
    base = Path(root)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
        for file in sorted(base.rglob("*")):
            if file.is_file():
                z.write(file, file.relative_to(base).as_posix())
    (OUT / "source.zip").write_bytes(buffer.getvalue())
