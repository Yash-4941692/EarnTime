// Bundles unit tests with esbuild and runs them with Node's built-in test runner.
import { build } from 'esbuild';
import { readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const outdir = '.test-out/unit';
rmSync(outdir, { recursive: true, force: true });

const entries = readdirSync('test/unit')
  .filter((f) => f.endsWith('.test.ts'))
  .map((f) => `test/unit/${f}`);

await build({
  entryPoints: entries,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outdir,
  outExtension: { '.js': '.mjs' },
  logLevel: 'warning',
});

const files = readdirSync(outdir).filter((f) => f.endsWith('.mjs')).map((f) => join(outdir, f));
const result = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...files], {
  stdio: 'inherit',
  env: { ...process.env, TZ: 'Asia/Kolkata' },
});
process.exit(result.status ?? 1);
