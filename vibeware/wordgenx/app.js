// The page: editor on the left, docx-preview on the right, wordgenx in a worker.
"use strict";

const $ = (id) => document.getElementById(id);
const COMPILE_DELAY = 450; // ms after the last keystroke

// ---------------------------------------------------------------- worker RPC

const worker = new Worker("worker.js", { type: "module" });
let nextId = 1;
const pending = new Map();
worker.onmessage = ({ data }) => {
  if (data.progress) {
    $("loading-text").textContent = data.progress;
    setStatus("busy", data.progress);
    return;
  }
  const call = pending.get(data.id);
  pending.delete(data.id);
  if (data.error !== undefined) call.reject(new Error(data.error));
  else call.resolve(data.result);
};
function rpc(op, args = {}, transfer = []) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, op, ...args }, transfer);
  });
}

// ---------------------------------------------------------------- state

const state = {
  ready: false,
  manifest: null,
  examplesZip: null,   // JSZip of the examples, read on the page so text shows before Python is up
  root: "",            // the project folder (zip download)
  main: "",            // the file that is compiled
  tabs: [],            // the text files shown as tabs
  current: "",         // the file in the editor
  docs: new Map(),     // path -> CodeMirror.Doc (edits survive switching files and examples)
  dirty: new Set(),    // paths edited since they were last written to the worker
  edited: new Set(),   // paths edited at all (shown in the tab)
  diagnostics: [],
  lastDocx: null,      // Uint8Array of the last successful build
  compiling: false,
  again: false,        // another compile was asked for while one ran
  timer: 0,
  generation: 0,       // bumped when the project changes, so stale builds are ignored
};

const base = (p) => p.slice(p.lastIndexOf("/") + 1);
const dirname = (p) => p.slice(0, p.lastIndexOf("/"));
const stem = (p) => base(p).replace(/\.[^.]+$/, "");
function relative(path) {
  const root = state.root.endsWith("/") ? state.root : state.root + "/";
  return path.startsWith(root) ? path.slice(root.length) : path.replace(/^\/work\//, "");
}
function modeFor(path) {
  if (/\.(wgx|txt)$/i.test(path)) return "wgx";
  if (/\.wgxs$/i.test(path)) return "wgxs";
  return null;
}
const isTextFile = (name) => /\.(wgx|wgxs|txt|bib|json|csl|md)$/i.test(name);

// ---------------------------------------------------------------- editor

const editor = CodeMirror($("editor"), {
  value: "",
  mode: "wgx",
  lineNumbers: true,
  lineWrapping: true,
  matchBrackets: true,
  indentUnit: 2,
  tabSize: 2,
  gutters: ["gutter-diag", "CodeMirror-linenumbers"],
  extraKeys: {
    "Ctrl-/": "toggleComment",
    "Cmd-/": "toggleComment",
    "Ctrl-S": () => download("docx"),
    "Cmd-S": () => download("docx"),
    "Shift-Alt-F": () => formatCurrent(),
    Tab: (cm) => cm.somethingSelected() ? cm.indentSelection("add") : cm.replaceSelection("  "),
  },
});

function docFor(path, text) {
  let doc = state.docs.get(path);
  if (!doc) {
    doc = CodeMirror.Doc(text, modeFor(path));
    doc.on("change", () => {
      state.dirty.add(path);
      if (!state.edited.has(path)) {
        state.edited.add(path);
        renderTabs();
      }
      scheduleCompile();
    });
    state.docs.set(path, doc);
  }
  return doc;
}

function showFile(path) {
  const doc = state.docs.get(path);
  if (!doc) return;
  state.current = path;
  if (editor.getDoc() !== doc) editor.swapDoc(doc);
  $("dl-file-name").textContent = base(path);
  renderTabs();
  applyDiagnostics();
}

// ---------------------------------------------------------------- tabs

function renderTabs() {
  const tabs = $("tabs");
  tabs.textContent = "";
  for (const path of state.tabs) {
    const tab = document.createElement("button");
    tab.className = "tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(path === state.current));
    tab.title = path.replace(/^\/work\//, "");
    const label = document.createElement("span");
    label.textContent = relative(path);
    tab.append(label);
    if (state.edited.has(path)) {
      const mark = document.createElement("span");
      mark.className = "edited";
      mark.textContent = "•";
      mark.title = "edited";
      tab.append(mark);
    }
    const worst = worstSeverity(path);
    if (worst) {
      const badge = document.createElement("span");
      badge.className = "badge " + worst;
      tab.append(badge);
    }
    if (path === state.main && state.tabs.length > 1) {
      const main = document.createElement("span");
      main.className = "main-mark";
      main.textContent = "main";
      tab.append(main);
    }
    tab.onclick = () => showFile(path);
    tabs.append(tab);
  }
}

function worstSeverity(path) {
  let worst = null;
  for (const d of state.diagnostics) {
    if (d.file !== path) continue;
    if (d.severity === "error") return "error";
    worst = "warning";
  }
  return worst;
}

// ---------------------------------------------------------------- projects

// Open `main` (a path in the worker's /work) with the tabs of the files it names.
async function openProject(main, root, { firstText } = {}) {
  state.generation++;
  state.main = main;
  state.root = root;
  state.diagnostics = [];
  if (!state.docs.has(main)) {
    const text = firstText ?? (state.ready ? await rpc("read", { path: main }) : await readFromZip(main));
    docFor(main, text);
  }
  state.tabs = [main];
  $("preview-title").textContent = base(main.replace(/\.[^.]+$/, ".docx"));
  showFile(main);
  renderProblems();
  if (state.ready) {
    await refreshTabs();
    compileNow();
  }
}

// The tabs: the main file and the text files it names (found by the worker).
async function refreshTabs() {
  // the main file may have new references: write it first
  await flushDirty();
  const files = await rpc("related", { main: state.main });
  for (const path of files) {
    if (!state.docs.has(path)) docFor(path, await rpc("read", { path }));
  }
  state.tabs = files.length ? files : [state.main];
  renderTabs();
}

async function readFromZip(path) {
  const entry = state.examplesZip && state.examplesZip.file(path.replace(/^\/work\//, ""));
  return entry ? entry.async("string") : "";
}

async function flushDirty() {
  for (const path of [...state.dirty]) {
    state.dirty.delete(path);
    await rpc("write", { path, data: state.docs.get(path).getValue() });
  }
}

function openExample(path) {
  const main = "/work/" + path;
  state.notes = [];
  openProject(main, dirname(main));
  try { localStorage.setItem("wgx-example", path); } catch {}
}

// ---------------------------------------------------------------- compiling

function scheduleCompile() {
  clearTimeout(state.timer);
  state.timer = setTimeout(compileNow, COMPILE_DELAY);
}

let tabsCheckedAt = 0;

async function compileNow() {
  clearTimeout(state.timer);
  if (!state.ready) return;
  if (state.compiling) {
    state.again = true;
    return;
  }
  state.compiling = true;
  const generation = state.generation;
  setStatus("busy", "Compiling…");
  try {
    // an edit may have added an \include or \use: look again, at most every few seconds
    if (state.dirty.has(state.main) && Date.now() - tabsCheckedAt > 2000) {
      tabsCheckedAt = Date.now();
      await refreshTabs();
    }
    await flushDirty();
    const started = performance.now();
    const { result, docx } = await rpc("compile", { main: state.main });
    if (generation !== state.generation) return;
    state.diagnostics = result.diagnostics;
    if (result.internal) {
      state.diagnostics = [{
        severity: "error", code: "internal", message: "The compiler crashed",
        file: state.main, text: result.internal,
      }];
    }
    renderProblems();
    applyDiagnostics();
    renderTabs();
    if (docx) {
      state.lastDocx = docx;
      await renderPreview(docx);
      $("stale").hidden = true;
      $("preview-doc").classList.remove("stale-doc");
      const total = Math.round(performance.now() - started);
      const w = result.warnings;
      setStatus(w ? "warn" : "ok",
        `Built in ${result.ms} ms` + (w ? ` · ${w} warning${w > 1 ? "s" : ""}` : "") ,
        `compile ${result.ms} ms, total with preview ${total} ms`);
    } else {
      const e = result.errors || 1;
      setStatus("error", `${e} error${e > 1 ? "s" : ""}`);
      if (state.lastDocx) {
        $("stale").hidden = false;
        $("preview-doc").classList.add("stale-doc");
      } else {
        $("preview-doc").textContent = "";
      }
      if (!state.problemsTouched) setProblemsOpen(true);
    }
    $("download").disabled = false;
  } catch (err) {
    setStatus("error", "Failed: " + err.message);
    console.error(err);
  } finally {
    state.compiling = false;
    if (state.again) {
      state.again = false;
      compileNow();
    }
  }
}

// ---------------------------------------------------------------- preview

async function renderPreview(bytes) {
  const host = $("preview-doc");
  const scroller = $("preview-scroll");
  const top = scroller.scrollTop;

  // render off-screen, then swap: no flicker while typing
  const fresh = document.createElement("div");
  const styles = document.createElement("div");
  await docx.renderAsync(bytes, fresh, styles, {
    className: "docx",
    inWrapper: true,
    breakPages: true,
    ignoreLastRenderedPageBreak: true,
    experimental: true,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    renderEndnotes: true,
    renderComments: false,
    useBase64URL: false,
  });
  revokeBlobUrls(host);
  host.replaceChildren(styles, ...fresh.childNodes);
  applyZoom();
  // keep the reader's place
  scroller.scrollTop = Math.min(top, scroller.scrollHeight - scroller.clientHeight);
}

function revokeBlobUrls(root) {
  for (const img of root.querySelectorAll("img[src^='blob:']")) URL.revokeObjectURL(img.src);
}

function applyZoom() {
  const host = $("preview-doc");
  const pages = [...host.querySelectorAll("section.docx")];
  const choice = $("zoom").value;
  let zoom = 1;
  if (choice === "fit") {
    if (pages.length) {
      // the widest page (landscape sections) decides
      const available = $("preview-scroll").clientWidth - 16;
      const needed = Math.max(...pages.map((p) => p.offsetWidth)) + 48; // the wrapper's padding
      zoom = Math.min(1, available / needed);
    }
  } else {
    zoom = Number(choice);
  }
  host.style.zoom = String(zoom);
}

// ---------------------------------------------------------------- diagnostics

let marks = [];

function applyDiagnostics() {
  for (const m of marks) m.clear();
  marks = [];
  editor.clearGutter("gutter-diag");
  const doc = editor.getDoc();
  for (const d of state.diagnostics) {
    if (d.file !== state.current || !d.line) continue;
    const from = { line: d.line - 1, ch: d.col - 1 };
    let to = { line: d.endLine - 1, ch: d.endCol - 1 };
    if (to.line === from.line && to.ch <= from.ch) to = { line: from.line, ch: from.ch + 1 };
    marks.push(doc.markText(from, to, {
      className: "diag-span-" + d.severity,
      attributes: { title: d.message },
    }));
    const existing = editor.lineInfo(from.line)?.gutterMarkers?.["gutter-diag"];
    if (existing && existing.classList.contains("error")) continue;
    const marker = document.createElement("span");
    marker.className = "diag-marker " + d.severity;
    marker.title = `${d.severity}: ${d.message}`;
    editor.setGutterMarker(from.line, "gutter-diag", marker);
  }
}

function renderProblems() {
  const list = $("problems-list");
  list.textContent = "";
  const diags = state.diagnostics;
  const errors = diags.filter((d) => d.severity === "error").length;
  const count = $("problems-count");
  count.textContent = String(diags.length);
  count.className = "count" + (errors ? " error" : diags.length ? " warning" : "");
  $("problems-summary").textContent = diags[0] ? diags[0].message : "";

  for (const note of state.notes || []) {
    const item = document.createElement("div");
    item.className = "problem info";
    const pre = document.createElement("pre");
    pre.textContent = note;
    item.append(pre);
    list.append(item);
  }
  if (!diags.length && !(state.notes || []).length) {
    const empty = document.createElement("div");
    empty.className = "empty-note";
    empty.textContent = "No problems.";
    list.append(empty);
  }
  for (const d of diags) {
    const item = document.createElement("button");
    item.className = "problem " + d.severity;
    const where = document.createElement("div");
    where.className = "where";
    where.textContent = relative(d.file) + (d.line ? `:${d.line}:${d.col}` : "");
    const msg = document.createElement("div");
    msg.className = "msg";
    const sev = document.createElement("span");
    sev.className = "sev";
    sev.textContent = `${d.severity}[${d.code}]`;
    msg.append(sev, ": " + d.message);
    const pre = document.createElement("pre");
    pre.textContent = d.text.replace(/\n+$/, "").replaceAll("/work/", "");
    item.append(where, msg, pre);
    item.onclick = () => goTo(d);
    list.append(item);
  }
}

function goTo(d) {
  if (!state.docs.has(d.file)) return;
  showFile(d.file);
  if (!d.line) return;
  const pos = { line: d.line - 1, ch: d.col - 1 };
  editor.setCursor(pos);
  editor.scrollIntoView(pos, 80);
  editor.addLineClass(pos.line, "background", "diag-line-flash");
  setTimeout(() => editor.removeLineClass(pos.line, "background", "diag-line-flash"), 1200);
  editor.focus();
}

function setProblemsOpen(open) {
  $("problems").dataset.open = String(open);
  $("problems-toggle").setAttribute("aria-expanded", String(open));
  editor.refresh();
}
$("problems-toggle").onclick = () => {
  state.problemsTouched = true;
  setProblemsOpen($("problems").dataset.open !== "true");
};

// ---------------------------------------------------------------- status

function setStatus(kind, text, title = "") {
  const el = $("status");
  el.dataset.state = kind;
  el.querySelector(".text").textContent = text;
  el.title = title;
}

let toastTimer = 0;
function toast(text) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.append(el);
  }
  el.textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 4000);
}

// ---------------------------------------------------------------- opening files

let uploadCount = 0;

async function openFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  if (!state.ready) {
    toast("Python is still starting; try again in a moment.");
    return;
  }
  const sources = files.filter((f) => /\.(wgx|txt)$/i.test(f.name));
  const docxs = files.filter((f) => /\.docx$/i.test(f.name));

  if (!sources.length && docxs.length) return importDocx(docxs[0]);

  // Resources only (pictures, a style sheet): add them to the current project.
  const folder = sources.length ? `/work/upload-${++uploadCount}` : dirname(state.main);
  let first = null;
  for (const file of files) {
    const path = `${folder}/${file.name}`;
    if (isTextFile(file.name)) {
      const text = await file.text();
      await rpc("write", { path, data: text });
      const doc = state.docs.get(path);
      if (doc) doc.setValue(text); else docFor(path, text);
      state.dirty.delete(path);
      state.edited.delete(path);
    } else {
      const data = new Uint8Array(await file.arrayBuffer());
      await rpc("write", { path, data }, [data.buffer]);
    }
    if (!first && sources.includes(file)) first = path;
  }
  state.notes = [];
  if (first) {
    $("example").value = "";
    await openProject(first, folder);
    toast(`Opened ${base(first)}`);
  } else {
    await refreshTabs();
    compileNow();
    toast(`Added ${files.map((f) => f.name).join(", ")} to the project`);
  }
}

async function importDocx(file) {
  setStatus("busy", `Importing ${file.name}…`);
  const data = new Uint8Array(await file.arrayBuffer());
  const result = await rpc("importDocx", { name: file.name, data }, [data.buffer]);
  if (!result.ok) {
    setStatus("error", "Import failed");
    toast(`Could not import ${file.name}: ${result.error}`);
    return;
  }
  // a re-import replaces what was there
  for (const path of [...state.docs.keys()]) {
    if (path.startsWith(result.root + "/")) state.docs.delete(path);
  }
  state.notes = [`Imported ${file.name}\n\n${result.report.trim()}`];
  $("example").value = "";
  await openProject(result.main, result.root);
  if (!state.problemsTouched) setProblemsOpen(true);
  toast(`Imported ${file.name} as wordgenx source`);
}

$("open").onclick = () => $("file-input").click();
$("file-input").onchange = (e) => {
  openFiles(e.target.files).catch((err) => toast(err.message));
  e.target.value = "";
};

// drag and drop anywhere on the page
let dragDepth = 0;
window.addEventListener("dragenter", (e) => {
  if (![...e.dataTransfer.types].includes("Files")) return;
  e.preventDefault();
  dragDepth++;
  $("drop-overlay").hidden = false;
});
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("dragleave", () => {
  if (--dragDepth <= 0) { dragDepth = 0; $("drop-overlay").hidden = true; }
});
window.addEventListener("drop", (e) => {
  e.preventDefault();
  dragDepth = 0;
  $("drop-overlay").hidden = true;
  openFiles(e.dataTransfer.files).catch((err) => toast(err.message));
});

// ---------------------------------------------------------------- format

async function formatCurrent() {
  if (!state.ready) return;
  const doc = state.docs.get(state.current);
  const result = await rpc("format", { name: state.current, text: doc.getValue() });
  if (result.text === null) {
    toast(`Not formatted: ${result.problem}`);
    return;
  }
  if (result.text === doc.getValue()) {
    toast("Already in the canonical layout");
    return;
  }
  const cursor = doc.getCursor();
  const scroll = editor.getScrollInfo();
  doc.setValue(result.text);
  doc.setCursor(cursor);
  editor.scrollTo(scroll.left, scroll.top);
  toast("Formatted");
}
$("format").onclick = () => formatCurrent();

// ---------------------------------------------------------------- download

function save(data, name, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function download(kind) {
  closeMenu();
  if (kind === "docx") {
    if (!state.lastDocx) return toast("Nothing built yet");
    save(state.lastDocx, stem(state.main) + ".docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  } else if (kind === "file") {
    save(state.docs.get(state.current).getValue(), base(state.current), "text/plain;charset=utf-8");
  } else if (kind === "zip") {
    await flushDirty();
    const { data } = await rpc("zip", { root: state.root });
    save(data, (base(state.root) || "project") + ".zip", "application/zip");
  }
}

// Menus: a button with aria-haspopup, then its .menu, inside a .menu-wrap.
function closeMenu(except = null) {
  for (const button of document.querySelectorAll("[aria-haspopup=menu]")) {
    if (button === except) continue;
    button.nextElementSibling.hidden = true;
    button.setAttribute("aria-expanded", "false");
  }
}
function toggleMenu(button, onOpen) {
  button.onclick = (e) => {
    e.stopPropagation();
    closeMenu(button);
    const menu = button.nextElementSibling;
    menu.hidden = !menu.hidden;
    button.setAttribute("aria-expanded", String(!menu.hidden));
    if (!menu.hidden && onOpen) onOpen(menu);
  };
}
toggleMenu($("download"), (menu) => {
  menu.querySelector('[data-download="docx"]').disabled = !state.lastDocx;
});
toggleMenu($("help"));
for (const item of document.querySelectorAll("[data-download]")) {
  item.onclick = () => download(item.dataset.download).catch((err) => toast(err.message));
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu-wrap") || e.target.closest(".menu a")) closeMenu();
});

// The help menu: the wordgenx documentation, shown by help.html in a new tab.
function buildHelpMenu(docs) {
  const menu = $("help-menu");
  const link = (doc, hint) => {
    const a = document.createElement("a");
    a.href = "help.html?doc=" + encodeURIComponent(doc.path);
    a.target = "wgx-help";
    a.setAttribute("role", "menuitem");
    const title = document.createElement(hint ? "b" : "span");
    title.textContent = doc.title;
    a.append(title);
    if (hint) {
      const small = document.createElement("span");
      small.className = "hint";
      small.textContent = hint;
      a.append(small);
    }
    return a;
  };
  const hints = { quickstart: "Quickstart: the language in one page", reference: "Every command and option" };
  for (const doc of docs.filter((d) => d.kind !== "guide")) menu.append(link(doc, hints[doc.kind]));
  menu.append(document.createElement("hr"));
  const label = document.createElement("div");
  label.className = "menu-label";
  label.textContent = "Topic guides";
  menu.append(label);
  for (const doc of docs.filter((d) => d.kind === "guide")) menu.append(link(doc));
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

// ---------------------------------------------------------------- layout

$("zoom").onchange = () => {
  applyZoom();
  try { localStorage.setItem("wgx-zoom", $("zoom").value); } catch {}
};
new ResizeObserver(() => { if ($("zoom").value === "fit") applyZoom(); }).observe($("preview-scroll"));

(function splitter() {
  const panes = $("panes");
  const bar = $("splitter");
  const set = (pct) => {
    pct = Math.max(20, Math.min(80, pct));
    panes.style.setProperty("--left", pct + "%");
    editor.refresh();
    try { localStorage.setItem("wgx-split", String(pct)); } catch {}
  };
  try {
    const saved = Number(localStorage.getItem("wgx-split"));
    if (saved) panes.style.setProperty("--left", saved + "%");
  } catch {}
  bar.addEventListener("pointerdown", (e) => {
    bar.setPointerCapture(e.pointerId);
    bar.classList.add("dragging");
    const move = (ev) => {
      const rect = panes.getBoundingClientRect();
      set(((ev.clientX - rect.left) / rect.width) * 100);
    };
    const up = () => {
      bar.classList.remove("dragging");
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", up);
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
  });
  bar.addEventListener("keydown", (e) => {
    const now = parseFloat(getComputedStyle(panes).getPropertyValue("--left")) || 50;
    if (e.key === "ArrowLeft") set(now - 2);
    if (e.key === "ArrowRight") set(now + 2);
  });
})();

// ---------------------------------------------------------------- start

$("example").onchange = (e) => { if (e.target.value) openExample(e.target.value); };

async function boot() {
  try {
    const saved = localStorage.getItem("wgx-zoom");
    if (saved) $("zoom").value = saved;
  } catch {}

  const [manifest, zipData] = await Promise.all([
    fetch("generated/manifest.json").then((r) => {
      if (!r.ok) throw new Error("generated/manifest.json is missing: run `python build.py` first");
      return r.json();
    }),
    fetch("generated/examples.zip").then((r) => r.arrayBuffer()),
  ]);
  state.manifest = manifest;
  buildHelpMenu(manifest.docs || []);
  state.examplesZip = await JSZip.loadAsync(zipData);

  const select = $("example");
  const custom = new Option("Your file", "");
  custom.disabled = true;
  select.append(custom);
  for (const ex of manifest.examples) select.append(new Option(ex.title, ex.path));
  let first = manifest.examples[0].path;
  try {
    const saved = localStorage.getItem("wgx-example");
    if (saved && manifest.examples.some((e) => e.path === saved)) first = saved;
  } catch {}
  select.value = first;
  openExample(first); // text shows now; the build follows once Python is up

  const info = await rpc("start");
  state.ready = true;
  $("loading").hidden = true;
  console.info(`wordgenx ${manifest.wex} on Python ${info.python}`);
  $("status").title = `wordgenx ${manifest.wex}, Python ${info.python} (Pyodide)`;
  await refreshTabs();
  compileNow();
}

boot().catch((err) => {
  console.error(err);
  $("loading").classList.add("failed");
  $("loading-text").textContent = "Could not start:\n" + err.message;
  setStatus("error", "Not started");
});
