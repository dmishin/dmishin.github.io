// The help page: renders one of the wordgenx docs (copied by build.py) from Markdown.
// help.html?doc=guide/tables.md#anchor
"use strict";

const $ = (id) => document.getElementById(id);
const DOCS = "generated/docs/";

// GitHub's heading anchors, which the docs link to: "Table styles" -> "table-styles".
function slug(text) {
  return text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
}

// `href` of a link in the doc at `from`, resolved to a path under docs/.
function resolve(href, from) {
  const parts = from.split("/").slice(0, -1);
  for (const part of href.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== ".") parts.push(part);
  }
  return parts.join("/");
}

function renderNav(docs, current) {
  const nav = $("nav");
  const group = (label, items) => {
    if (label) {
      const h = document.createElement("div");
      h.className = "nav-label";
      h.textContent = label;
      nav.append(h);
    }
    for (const doc of items) {
      const a = document.createElement("a");
      a.href = "?doc=" + encodeURIComponent(doc.path);
      a.textContent = doc.kind === "quickstart" ? "Quickstart" : doc.title;
      if (doc.path === current) a.setAttribute("aria-current", "page");
      nav.append(a);
    }
  };
  group("", docs.filter((d) => d.kind !== "guide"));
  group("Topic guides", docs.filter((d) => d.kind === "guide"));
}

function fixLinks(root, current, known) {
  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    if (/^[a-z]+:/i.test(href)) {
      a.target = "_blank";
      a.rel = "noopener";
    } else if (href.startsWith("#")) {
      // same page: fine as it is
    } else {
      const [path, hash] = href.split("#");
      const target = resolve(path, current);
      if (path.endsWith(".md") && known.has(target)) {
        a.href = "?doc=" + encodeURIComponent(target) + (hash ? "#" + hash : "");
      } else {
        // a file of the repository the playground does not have (an example, a tool)
        const span = document.createElement("span");
        span.className = "dead-link";
        span.title = href;
        span.append(...a.childNodes);
        a.replaceWith(span);
      }
    }
  }
}

function highlight(root) {
  for (const code of root.querySelectorAll("pre > code")) {
    const lang = (code.className.match(/language-(\S+)/) || [])[1];
    const mode = { wgx: "wgx", wordgenx: "wgx", wgxs: "wgxs" }[lang];
    if (!mode) continue;
    const text = code.textContent.replace(/\n$/, "");
    code.textContent = "";
    CodeMirror.runMode(text, mode, code);
    code.parentElement.classList.add("CodeMirror"); // the editor's token colours
  }
}

async function main() {
  const manifest = await (await fetch("generated/manifest.json")).json();
  const docs = manifest.docs || [];
  const known = new Set(docs.map((d) => d.path));
  const asked = new URLSearchParams(location.search).get("doc");
  const current = known.has(asked) ? asked : docs[0].path;
  renderNav(docs, current);

  const response = await fetch(DOCS + current);
  if (!response.ok) throw new Error(`${current}: ${response.status}`);
  const article = $("doc");
  // the docs come from the WEX repository (built by build.py), not from users
  article.innerHTML = marked.parse(await response.text());
  for (const h of article.querySelectorAll("h1, h2, h3, h4")) {
    if (!h.id) h.id = slug(h.textContent);
  }
  fixLinks(article, current, known);
  highlight(article);
  const title = docs.find((d) => d.path === current).title;
  document.title = `${title} · wordgenx`;

  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) target.scrollIntoView();
  }
}

main().catch((err) => {
  $("doc").textContent = "Could not load the documentation: " + err.message;
});
