// Runs Pyodide and wordgenx off the main thread, so typing never waits for a build.
// Protocol: the page posts {id, op, ...args}; the worker answers {id, result} or {id, error}.
// It also posts {progress: "..."} while starting up.

// A module worker (new Worker(..., {type: "module"})).
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs";

const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";

let py = null;      // the Pyodide instance
let bridge = null;  // the bridge module (bridge.py)

const progress = (text) => postMessage({ progress: text });

async function start() {
  progress("Loading Python runtime…");
  py = await loadPyodide({ indexURL: PYODIDE });
  progress("Loading lxml, Pillow, Pygments…");
  await py.loadPackage(["micropip", "lxml", "pillow", "pygments"]);
  const manifest = await (await fetch("generated/manifest.json")).json();
  progress("Installing wordgenx…");
  const wheels = manifest.wheels.map((w) => new URL("generated/" + w, self.location.href).href);
  // the native dependencies came from Pyodide above; the wheels are pure Python
  await py.runPythonAsync(
    `import micropip\nawait micropip.install(${JSON.stringify(wheels)}, deps=False)`
  );
  progress("Unpacking examples…");
  const [bridgeCode, examples] = await Promise.all([
    fetch("bridge.py").then((r) => r.text()),
    fetch("generated/examples.zip").then((r) => r.arrayBuffer()),
  ]);
  py.FS.writeFile("/tmp/examples.zip", new Uint8Array(examples));
  py.FS.writeFile("/tmp/bridge.py", bridgeCode);
  py.runPython("import sys; sys.path.insert(0, '/tmp')");
  bridge = py.pyimport("bridge");
  progress("Warming up the compiler…");
  bridge.setup("/tmp/examples.zip");
  return { manifest, python: py.runPython("import sys; sys.version.split()[0]") };
}

function mkdirs(path) {
  const parts = path.split("/").slice(1, -1);
  let dir = "";
  for (const part of parts) {
    dir += "/" + part;
    if (!py.FS.analyzePath(dir).exists) py.FS.mkdir(dir);
  }
}

function readIfExists(path) {
  return py.FS.analyzePath(path).exists ? py.FS.readFile(path) : null;
}

const ops = {
  start,

  // Text or bytes into the file system.
  write({ path, data }) {
    mkdirs(path);
    py.FS.writeFile(path, data);
  },

  read({ path }) {
    return py.FS.readFile(path, { encoding: "utf8" });
  },

  // Build `main`: diagnostics, and the .docx bytes when there are no errors.
  compile({ main }) {
    const result = JSON.parse(bridge.compile_file(main));
    const docx = result.ok ? readIfExists("/out/out.docx") : null;
    return { result, docx, transfer: docx ? [docx.buffer] : [] };
  },

  related({ main }) {
    return JSON.parse(bridge.related(main));
  },

  // An uploaded .docx turned into wordgenx source.
  importDocx({ name, data }) {
    const path = "/work/uploads/" + name;
    mkdirs(path);
    py.FS.writeFile(path, data);
    return JSON.parse(bridge.import_docx(path));
  },

  format({ name, text }) {
    return JSON.parse(bridge.format_text(name, text));
  },

  zip({ root }) {
    bridge.zip_folder(root);
    const data = py.FS.readFile("/out/source.zip");
    return { data, transfer: [data.buffer] };
  },
};

// One request at a time: the compiler is not reentrant and Python is single-threaded anyway.
let queue = Promise.resolve();
self.onmessage = (event) => {
  const { id, op, ...args } = event.data;
  queue = queue.then(async () => {
    try {
      let result = await ops[op](args);
      let transfer = [];
      if (result && result.transfer) {
        transfer = result.transfer;
        delete result.transfer;
      }
      postMessage({ id, result }, transfer);
    } catch (err) {
      postMessage({ id, error: String(err && err.message ? err.message : err) });
    }
  });
};
