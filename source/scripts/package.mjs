#!/usr/bin/env node
/**
 * Packages the built extension into a release ZIP.
 *
 *   npm run package                       → /home/user/outputs/EarnTime-<version>.zip
 *   npm run package -- --out-dir /tmp/z   → somewhere else
 *   npm run package -- --root /path/to/clone  → package a different checkout
 *
 * What it guarantees:
 *   1. The working tree is clean BEFORE and AFTER the build, so a ZIP always
 *      corresponds to exactly one commit (`git rev-parse HEAD`).
 *   2. The build runs (`npm run build` in source/), so the ZIP never contains
 *      stale root artifacts.
 *   3. The version is read from the committed manifest.json.
 *   4. The ZIP contains exactly EXPECTED_ENTRIES files, with manifest.json at
 *      the archive root (Chrome loads an unpacked extension from the folder
 *      that holds manifest.json, so no wrapping directory is added).
 *      source/, tests, node_modules, .git and CODE_OF_CONDUCT.md are left out.
 *   5. Every entry is verified byte-identical to the committed blob
 *      (`git cat-file blob HEAD:<path>`), then the path and sha256 are printed.
 *
 * The archive is written deterministically (fixed deflate level, entry order
 * and timestamps taken from the HEAD commit date), so the same commit always
 * produces the same sha256.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT_DIR = '/home/user/outputs';

/**
 * The exact contents of the release ZIP: the root extension files, the three
 * licence/readme files, icons/, docs/ and screenshots/. Update this list (and
 * nothing else) if the set of files Chrome loads deliberately changes.
 */
const EXPECTED_ENTRIES = [
  'LICENSE',
  'LICENSES.txt',
  'README.md',
  'background.js',
  'block.css',
  'block.html',
  'block.js',
  'content.js',
  'docs/KNOWN_LIMITATIONS.md',
  'docs/TESTING.md',
  'docs/USER_GUIDE.md',
  'icons/icon128.png',
  'icons/icon16.png',
  'icons/icon48.png',
  'manifest.json',
  'popup.css',
  'popup.html',
  'popup.js',
  'screenshots/mode-chooser.png',
  'screenshots/popup-debt.png',
  'screenshots/popup.png',
  'screenshots/settings-protection.png',
  'settings.css',
  'settings.html',
  'settings.js',
  'setup.css',
  'setup.html',
  'setup.js',
].sort();

/** Tracked paths that must never reach the ZIP. */
const EXCLUDED_FILES = new Set(['CODE_OF_CONDUCT.md']);
const EXCLUDED_PREFIXES = ['source/', '.github/'];

function fail(message) {
  console.error(`\n[package] ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) fail(`unknown argument "${arg}" (expected --root or --out-dir)`);
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) fail(`--${key} needs a value`);
    out[key] = value;
    i += 1;
  }
  for (const key of Object.keys(out)) {
    if (key !== 'root' && key !== 'out-dir') fail(`unknown argument --${key} (expected --root or --out-dir)`);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const repoRoot = path.resolve(args.root ?? path.join(scriptDir, '..', '..'));
const sourceDir = path.join(repoRoot, 'source');
const outDir = path.resolve(args['out-dir'] ?? DEFAULT_OUT_DIR);

function git(gitArgs, options = {}) {
  try {
    return execFileSync('git', gitArgs, {
      cwd: repoRoot,
      // execFileSync hands back a Buffer unless the encoding is explicit;
      // callers that want raw bytes pass { encoding: 'buffer' }.
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
  } catch (err) {
    const detail = (err.stderr ?? err.message ?? '').toString().trim();
    fail(`git ${gitArgs.join(' ')} failed in ${repoRoot}\n${detail}`);
    throw err; // unreachable
  }
}

// ---------------------------------------------------------------- repo checks

if (!fs.existsSync(path.join(repoRoot, '.git')) && !fs.existsSync(path.join(repoRoot, 'manifest.json'))) {
  fail(`${repoRoot} does not look like an EarnTime checkout (no .git and no manifest.json)`);
}
if (!fs.existsSync(sourceDir)) fail(`${sourceDir} is missing — pass --root <checkout>`);

const head = git(['rev-parse', 'HEAD']).trim();
const headShort = git(['rev-parse', '--short', 'HEAD']).trim();
const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();

function assertCleanTree(stage) {
  const dirty = git(['status', '--porcelain']).trim();
  if (dirty) {
    fail(
      `working tree is not clean ${stage}.\n` +
        'A release ZIP must match one commit exactly. Commit, restore or clean these paths first:\n' +
        dirty
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n'),
    );
  }
}

function trackedEntries() {
  const tracked = git(['ls-files', '-z']).split('\0').filter(Boolean);
  const packable = [];
  const skipped = [];
  for (const file of tracked) {
    const isExcluded =
      EXCLUDED_FILES.has(file) ||
      EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix)) ||
      file.startsWith('.') ||
      /\.(zip|tar|tgz|gz)$/i.test(file) ||
      file.split('/').includes('node_modules') ||
      file.split('/').includes('.test-out');
    (isExcluded ? skipped : packable).push(file);
  }
  return { packable: packable.sort(), skipped: skipped.sort() };
}

// --------------------------------------------------------------- zip writing

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** UTC DOS date/time, so the archive does not depend on the machine timezone. */
function dosDateTime(date) {
  const year = date.getUTCFullYear();
  if (year < 1980) return { time: 0, date: 33 }; // 1980-01-01, the ZIP epoch
  return {
    time: (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | (date.getUTCSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate(),
  };
}

/** Minimal deterministic ZIP writer (deflate for text, store where it is larger). */
function buildZip(entries, stamp) {
  const { time, date } = dosDateTime(stamp);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const stored = deflated.length >= data.length;
    const payload = stored ? data : deflated;
    const method = stored ? 0 : 8;
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed to extract
    local.writeUInt16LE(0, 6); // no flags: sizes and CRC are in the header
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // no extra field
    localParts.push(local, nameBuf, payload);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x031e, 4); // made by UNIX, ZIP 3.0
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra length
    central.writeUInt16LE(0, 32); // comment length
    central.writeUInt16LE(0, 34); // disk number
    central.writeUInt16LE(0, 36); // internal attributes
    central.writeUInt32LE(0o644 << 16, 38); // external attributes: regular file, rw-r--r--
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + payload.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDir, end]);
}

/** Reads the archive back so it can be verified instead of trusted. */
function readZip(buf) {
  let endOffset = -1;
  for (let i = buf.length - 22; i >= 0; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      endOffset = i;
      break;
    }
  }
  if (endOffset < 0) fail('the written ZIP has no end-of-central-directory record');
  const count = buf.readUInt16LE(endOffset + 10);
  let cursor = buf.readUInt32LE(endOffset + 16);
  const entries = new Map();

  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(cursor) !== 0x02014b50) fail(`bad central directory entry at ${cursor}`);
    const method = buf.readUInt16LE(cursor + 10);
    const crc = buf.readUInt32LE(cursor + 16);
    const compressedSize = buf.readUInt32LE(cursor + 20);
    const size = buf.readUInt32LE(cursor + 24);
    const nameLen = buf.readUInt16LE(cursor + 28);
    const extraLen = buf.readUInt16LE(cursor + 30);
    const commentLen = buf.readUInt16LE(cursor + 32);
    const localOffset = buf.readUInt32LE(cursor + 42);
    const name = buf.subarray(cursor + 46, cursor + 46 + nameLen).toString('utf8');

    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLen + localExtraLen;
    const raw = buf.subarray(start, start + compressedSize);
    const data = method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw);
    if (data.length !== size) fail(`${name}: inflated size ${data.length} does not match the header (${size})`);
    if (crc32(data) !== crc) fail(`${name}: CRC mismatch while reading the archive back`);
    entries.set(name, data);
    cursor += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

// ------------------------------------------------------------------ packaging

console.log(`[package] checkout  ${repoRoot}`);
console.log(`[package] commit    ${headShort} on ${branch}`);

assertCleanTree('before the build');

console.log('[package] building (npm run build in source/)…');
const build = spawnSync('npm', ['run', 'build'], {
  cwd: sourceDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (build.status !== 0) fail(`the build exited with status ${build.status}`);

assertCleanTree('after the build (the build must reproduce the committed files byte for byte)');

const manifestPath = path.join(repoRoot, 'manifest.json');
if (!fs.existsSync(manifestPath)) fail('manifest.json is missing at the checkout root');
let version;
try {
  version = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).version;
} catch (err) {
  fail(`manifest.json could not be parsed: ${err.message}`);
}
if (typeof version !== 'string' || !/^\d+\.\d+\.\d+/.test(version)) {
  fail(`manifest.json version "${version}" is not a usable X.Y.Z version`);
}

const { packable, skipped } = trackedEntries();
const missing = EXPECTED_ENTRIES.filter((file) => !packable.includes(file));
const unexpected = packable.filter((file) => !EXPECTED_ENTRIES.includes(file));
if (missing.length || unexpected.length) {
  fail(
    `the tracked file set does not match EXPECTED_ENTRIES in source/scripts/package.mjs.\n` +
      (missing.length ? `  missing from the checkout: ${missing.join(', ')}\n` : '') +
      (unexpected.length ? `  not expected in the ZIP:   ${unexpected.join(', ')}\n` : '') +
      'If this change is deliberate, update EXPECTED_ENTRIES.',
  );
}
if (packable.length !== EXPECTED_ENTRIES.length) {
  fail(`expected ${EXPECTED_ENTRIES.length} entries, found ${packable.length}`);
}

// Commit date gives every entry the same timestamp without depending on the clock.
const stamp = new Date(Number(git(['show', '-s', '--format=%ct', head]).trim()) * 1000);
const entries = packable.map((name) => ({ name, data: fs.readFileSync(path.join(repoRoot, name)) }));
if (!entries.some((entry) => entry.name === 'manifest.json')) fail('manifest.json must sit at the ZIP root');

const zip = buildZip(entries, stamp);
fs.mkdirSync(outDir, { recursive: true });
const zipPath = path.join(outDir, `EarnTime-${version}.zip`);
fs.writeFileSync(zipPath, zip);

// Verify the archive that was just written against the committed blobs.
const readBack = readZip(fs.readFileSync(zipPath));
if (readBack.size !== EXPECTED_ENTRIES.length) {
  fail(`the archive holds ${readBack.size} entries, expected ${EXPECTED_ENTRIES.length}`);
}
let verifiedBytes = 0;
for (const name of EXPECTED_ENTRIES) {
  const fromZip = readBack.get(name);
  if (!fromZip) fail(`${name} is missing from the written archive`);
  const committed = git(['cat-file', 'blob', `${head}:${name}`], { encoding: 'buffer' });
  if (!Buffer.isBuffer(committed) || !fromZip.equals(committed)) {
    fail(`${name} in the archive is not byte-identical to ${headShort}:${name}`);
  }
  const onDisk = fs.readFileSync(path.join(repoRoot, name));
  if (!fromZip.equals(onDisk)) fail(`${name} in the archive differs from the file on disk`);
  verifiedBytes += fromZip.length;
}
for (const name of readBack.keys()) {
  if (!EXPECTED_ENTRIES.includes(name)) fail(`unexpected entry in the archive: ${name}`);
}

const sha256 = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex');
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

console.log('');
console.log(`[package] EarnTime ${version} — ${EXPECTED_ENTRIES.length} entries, ${kb(verifiedBytes)} unpacked`);
console.log(`[package] excluded: ${skipped.length} tracked paths (source/, tests, CODE_OF_CONDUCT.md, dotfiles)`);
console.log(`[package] verified: every entry is byte-identical to the file committed in ${headShort}`);
console.log('[package] the working tree was clean before and after the build');
console.log('');
console.log(zipPath);
console.log(sha256);
