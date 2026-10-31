/**
 * Builds the extension into the repository root (the manifest loads files from there).
 *   node esbuild.config.js          production build
 *   node esbuild.config.js --watch  rebuild on change (development)
 *
 * Outputs: background.js, content.js, popup|settings|setup|block .js/.css and the HTML pages.
 */
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const watch = process.argv.includes('--watch');
const outdir = path.join(__dirname, '..');
const pagesDir = path.join(__dirname, 'pages');
const dataDir = path.join(__dirname, 'data');

const shared = {
  bundle: true,
  minify: !watch,
  sourcemap: false,
  target: ['chrome120'],
  logLevel: 'info',
  define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"' },
  outdir,
  legalComments: 'none',
};

const scriptEntries = {
  background: 'src/background/index.ts',
  content: 'src/content/index.ts',
};

const uiEntries = {
  popup: 'src/ui/popup/main.tsx',
  settings: 'src/ui/settings/main.tsx',
  setup: 'src/ui/setup/main.tsx',
  block: 'src/ui/block/main.tsx',
  motivation: 'src/ui/block/motivation.tsx',
};

/** Runs Tailwind and Autoprefixer over every stylesheet imported by a UI page. */
const tailwindPlugin = {
  name: 'tailwind-postcss',
  setup(build) {
    const postcss = require('postcss');
    const tailwindcss = require('tailwindcss');
    const autoprefixer = require('autoprefixer');
    const processor = postcss([
      tailwindcss({ config: path.join(__dirname, 'tailwind.config.js') }),
      autoprefixer(),
    ]);
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const source = await fs.promises.readFile(args.path, 'utf8');
      const result = await processor.process(source, { from: args.path });
      return { contents: result.css, loader: 'css' };
    });
  },
};

/**
 * Writes `rules/adult_guard.json`, the static declarativeNetRequest ruleset Chrome loads with the
 * extension.
 *
 * The service worker installs the same guard as *dynamic* rules, but only once it has run a job — so
 * right after an install, a reload or an update there is a moment when a navigation could beat it.
 * A static ruleset ships with the package and is active from the first moment, which is what makes
 * the pause reliable rather than eventual.
 *
 * The domains and TLDs come from the same `data/*.json` files the core imports, so the packaged
 * ruleset cannot drift from what the extension itself considers adult. A unit test compares the two.
 */
function writeAdultRules() {
  const domains = JSON.parse(fs.readFileSync(path.join(dataDir, 'adultDomains.json'), 'utf8'));
  const tlds = JSON.parse(fs.readFileSync(path.join(dataDir, 'adultTlds.json'), 'utf8'));
  const pause = { type: 'redirect', redirect: { extensionPath: '/motivation.html' } };
  const ruleset = {
    rules: [
      {
        id: 1,
        priority: 100,
        action: pause,
        condition: { requestDomains: domains, resourceTypes: ['main_frame'] },
      },
      {
        id: 2,
        priority: 100,
        action: pause,
        condition: {
          regexFilter: `^https?://[^/]+\\.(${tlds.join('|')})([:/?#]|$)`,
          isUrlFilterCaseSensitive: false,
          resourceTypes: ['main_frame'],
        },
      },
    ],
  };
  const target = path.join(outdir, 'rules', 'adult_guard.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(ruleset, null, 2)}\n`);
}

function copyPages() {
  for (const file of fs.readdirSync(pagesDir)) {
    if (file.endsWith('.html')) fs.copyFileSync(path.join(pagesDir, file), path.join(outdir, file));
  }
}

async function build() {
  copyPages();
  writeAdultRules();
  const contexts = [];

  // Service worker and content script: IIFE so they run as classic scripts.
  for (const [name, entry] of Object.entries(scriptEntries)) {
    contexts.push(
      await esbuild.context({
        ...shared,
        entryPoints: [path.join(__dirname, entry)],
        entryNames: name,
        format: 'iife',
        platform: 'browser',
        jsx: undefined,
      }),
    );
  }

  // UI pages: React bundles with Tailwind CSS through PostCSS.
  for (const [name, entry] of Object.entries(uiEntries)) {
    contexts.push(
      await esbuild.context({
        ...shared,
        entryPoints: [path.join(__dirname, entry)],
        entryNames: name,
        format: 'iife',
        platform: 'browser',
        jsx: 'automatic',
        loader: { '.css': 'css' },
        plugins: [tailwindPlugin],
      }),
    );
  }

  if (watch) {
    for (const ctx of contexts) await ctx.watch();
    console.log('[build] watching…');
  } else {
    for (const ctx of contexts) await ctx.rebuild();
    for (const ctx of contexts) await ctx.dispose();
    console.log('[build] done');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
