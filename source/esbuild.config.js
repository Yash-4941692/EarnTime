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

function copyPages() {
  for (const file of fs.readdirSync(pagesDir)) {
    if (file.endsWith('.html')) fs.copyFileSync(path.join(pagesDir, file), path.join(outdir, file));
  }
}

async function build() {
  copyPages();
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
