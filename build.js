#!/usr/bin/env node
// build.js — turns the sources into a folder ready to ship.
//
// In development the browser compiles the .jsx files itself, which costs a
// 2.4 MB Babel download and a pause on every cold start. On a phone that
// pause is the whole first impression, so what actually ships is compiled
// here instead: same files, same order, same shared script scope — just
// already JavaScript by the time the device sees them.
//
//   node build.js          → dist/
//
// Everything in dist/ is generated. Edit the sources at the root.

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const crypto = require('crypto');

const ROOT = __dirname;
const OUT  = path.join(ROOT, 'dist');

// ── Babel, the same copy the browser uses in development ──────
function loadBabel() {
  const sandbox = { console, setTimeout, clearTimeout, process };
  sandbox.window = sandbox; sandbox.self = sandbox; sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'vendor/babel.min.js'), 'utf8'),
    sandbox, { filename: 'babel.min.js' });
  if (!sandbox.Babel) throw new Error('vendor/babel.min.js did not expose Babel');
  return sandbox.Babel;
}

const rm = (p) => fs.rmSync(p, { recursive: true, force: true });
const mkdir = (p) => fs.mkdirSync(p, { recursive: true });

function copy(rel, { skip = () => false } = {}) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return;
  const dst = path.join(OUT, rel);
  if (fs.statSync(src).isDirectory()) {
    mkdir(dst);
    for (const name of fs.readdirSync(src)) copy(path.join(rel, name), { skip });
  } else {
    if (skip(rel)) return;
    mkdir(path.dirname(dst));
    fs.copyFileSync(src, dst);
  }
}

function build({ withHarness = false } = {}) {
  const Babel = loadBabel();
  const tag = /<script type="text\/babel" src="([^"]+)"><\/script>/g;
  const hash = crypto.createHash('sha1');
  const compiled = new Map();

  rm(OUT); mkdir(OUT);

  // Compiles every source a page lists, in the order the page lists them,
  // and writes the page back out pointing at the compiled files. The list
  // of sources lives in the HTML — one place to add a file, not two.
  const buildPage = (file, transformHtml = (h) => h) => {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const sources = [...html.matchAll(tag)].map(m => m[1]);
    if (!sources.length) throw new Error(`no <script type="text/babel"> in ${file}`);

    for (const src of sources) {
      if (compiled.has(src)) continue;
      const code = fs.readFileSync(path.join(ROOT, src), 'utf8');
      let out;
      try {
        out = Babel.transform(code, { presets: [['react', { runtime: 'classic' }]], sourceType: 'script', filename: src }).code;
      } catch (e) {
        throw new Error(`${src}: ${e.message}`);
      }
      const name = src.replace(/^_*/, '').replace(/\.jsx$/, '.js');
      fs.writeFileSync(path.join(OUT, name), out);
      hash.update(out);
      compiled.set(src, { name, bytes: out.length });
    }

    const page = transformHtml(html)
      .replace(/\s*<script src="\/vendor\/babel\.min\.js"><\/script>/, '')
      // `defer` on every app script: they download in parallel while the
      // HTML is still parsing, run in order afterwards, and no longer hold
      // up the first paint. They share one global scope, and defer keeps
      // their order, so nothing else has to change.
      .replace(tag, (_m, src) => `<script defer src="${compiled.get(src).name}"></script>`)
      // the vendor libraries block parsing for the same reason, and are the
      // biggest of the lot
      .replace(/<script src="(\/vendor\/[^"]+|image-slot\.js)"><\/script>/g,
               (_m, src) => `<script defer src="${src}"></script>`);
    fs.writeFileSync(path.join(OUT, file), page);
  };

  buildPage('index.html', (h) => h.replace(
    'Production React builds; Babel compiles the .jsx files in the browser.',
    'Production React builds; the sources are compiled ahead of time by build.js.'));

  // The smoke tests should exercise what actually ships, not the
  // development form, so the harness is built the same way.
  if (withHarness) buildPage('__test.html');

  // ── sw.js ───────────────────────────────────────────────────
  // The cache name carries a hash of everything that was built — the
  // compiled sources, the page and the stylesheet — so a deploy can never
  // be served half-old, and a change to the theme alone still busts it.
  for (const f of ['index.html', 'theme.css']) {
    hash.update(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  }
  const stamp = hash.digest('hex').slice(0, 10);
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8')
    .replace(/const VERSION = '[^']*';/, `const VERSION = 'maites-${stamp}';`)
    .replace(/'\/([a-z-]+)\.jsx',/g, "'/$1.js',")
    .replace(/\s*'\/vendor\/babel\.min\.js',/, '');
  fs.writeFileSync(path.join(OUT, 'sw.js'), sw);

  // ── everything else ─────────────────────────────────────────
  copy('vendor', { skip: (rel) => rel.endsWith('babel.min.js') });
  for (const f of ['theme.css', 'image-slot.js', 'manifest.json', 'icon.svg',
                   'maites-icon.png', 'maites-logo.png']) copy(f);

  const files = [...compiled.values()];
  const total = files.reduce((n, c) => n + c.bytes, 0);
  console.log(`built dist/ · ${files.length} sources · ${(total / 1024).toFixed(0)} KB of JavaScript · cache maites-${stamp}`);
  console.log('  Babel is not shipped: 2.4 MB and the compile pause are gone from every cold start.');
}

build({ withHarness: process.argv.includes('--test') });
