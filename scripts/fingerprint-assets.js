#!/usr/bin/env node
/*
 * Build step (run by Vercel via `npm run build`, see vercel.json).
 *
 * vercel.json caches everything under /assets/ for a year with
 * `immutable` — the browser never even re-checks the network. That's
 * only safe if the URL itself changes whenever the file's content
 * does. This script makes that true: every file under assets/ gets
 * renamed to embed a short content hash (logo.webp -> logo.a1b2c3d4e5.webp),
 * and every reference to it in index.html is rewritten to match. Swap
 * a file's bytes and its URL changes automatically — no more manually
 * bumping a `?v=` query string and hoping every reference got updated.
 *
 * Source files (index.html, assets/**) are untouched in git; this only
 * rewrites the ephemeral build output Vercel actually deploys.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');
const HTML_FILES = ['index.html'];
const HASH_LENGTH = 10;

// Raw archival uploads (kept for future re-derivation, e.g. re-cropping
// a logo) are never referenced by the page — skip them so they don't
// get pointlessly duplicated in the deployed output.
const SKIP_PATTERN = /-source\./;
// Already-hashed filename, e.g. "logo.a1b2c3d4e5.webp" — guards against
// double-hashing if this script is ever run twice against the same
// working copy instead of a fresh checkout.
const ALREADY_HASHED_PATTERN = /\.[0-9a-f]{10}\.[a-zA-Z0-9]+$/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue; // .DS_Store etc.
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex').slice(0, HASH_LENGTH);
}

function hashedName(filePath, hash) {
  const ext = path.extname(filePath);
  const base = filePath.slice(0, -ext.length);
  return `${base}.${hash}${ext}`;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main() {
  const allFiles = walk(ASSETS_DIR);
  const candidates = allFiles.filter(
    f => !SKIP_PATTERN.test(f) && !ALREADY_HASHED_PATTERN.test(f)
  );

  // Map from the path as it appears in HTML (e.g. "assets/img/x.webp")
  // to its new hashed equivalent.
  const renameMap = new Map();

  for (const filePath of candidates) {
    const hash = hashFile(filePath);
    const newPath = hashedName(filePath, hash);
    fs.renameSync(filePath, newPath);

    const relOld = path.relative(ROOT, filePath).split(path.sep).join('/');
    const relNew = path.relative(ROOT, newPath).split(path.sep).join('/');
    renameMap.set(relOld, relNew);
  }

  let totalReplacements = 0;
  for (const htmlFile of HTML_FILES) {
    const htmlPath = path.join(ROOT, htmlFile);
    let html = fs.readFileSync(htmlPath, 'utf8');

    for (const [oldRel, newRel] of renameMap) {
      // Matches the bare path, optionally followed by a leftover
      // "?v=N" cache-busting query string (which the hash now makes
      // redundant, so it's dropped rather than carried forward).
      const pattern = new RegExp(escapeRegExp(oldRel) + '(\\?v=\\d+)?', 'g');
      const before = html;
      html = html.replace(pattern, newRel);
      if (html !== before) totalReplacements++;
    }

    fs.writeFileSync(htmlPath, html);
  }

  console.log(`Fingerprinted ${renameMap.size} asset file(s), rewrote ${totalReplacements} reference(s) across ${HTML_FILES.length} HTML file(s).`);
  for (const [oldRel, newRel] of renameMap) {
    console.log(`  ${oldRel} -> ${newRel}`);
  }
}

main();
