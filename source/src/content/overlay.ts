/**
 * Shadow-DOM overlay used by every content feature. Shadow DOM keeps the site's CSS from
 * restyling EarnTime's UI, and EarnTime's CSS cannot leak into the page.
 */

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.et-backdrop { position: fixed; inset: 0; z-index: 2147483646; background: rgba(2, 6, 23, 0.82); display: flex; align-items: center; justify-content: center; padding: 24px; color: #e2e8f0; }
.et-cover { position: fixed; inset: 0; z-index: 2147483645; background: #020617; color: #e2e8f0; display: flex; align-items: center; justify-content: center; padding: 24px; }
.et-card { width: min(440px, 100%); background: #0f172a; border: 1px solid #1e293b; border-radius: 18px; padding: 24px; box-shadow: 0 24px 60px rgba(0,0,0,.45); }
.et-eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #64748b; font-weight: 700; margin: 0 0 8px; }
.et-title { font-size: 20px; font-weight: 700; margin: 0 0 8px; color: #f8fafc; }
.et-text { font-size: 14px; line-height: 1.5; color: #94a3b8; margin: 0 0 16px; }
.et-options { display: grid; gap: 10px; }
.et-option { text-align: left; border-radius: 14px; border: 1px solid #334155; background: #111827; color: #e2e8f0; padding: 14px 16px; cursor: pointer; font: inherit; }
.et-option:hover:not(:disabled) { border-color: #10b981; }
.et-option strong { display: block; font-size: 15px; margin-bottom: 4px; color: #f8fafc; }
.et-option span { font-size: 12.5px; color: #94a3b8; line-height: 1.4; }
.et-option:disabled { opacity: .45; cursor: not-allowed; }
.et-option.productive strong::before { content: "● "; color: #10b981; }
.et-option.unproductive strong::before { content: "● "; color: #f59e0b; }
.et-row { display: flex; gap: 8px; align-items: center; margin-top: 14px; }
.et-link { background: none; border: 0; color: #38bdf8; cursor: pointer; font: inherit; font-size: 13px; padding: 6px 0; }
.et-button { background: #10b981; color: #022c22; border: 0; border-radius: 10px; padding: 10px 14px; font: inherit; font-weight: 700; cursor: pointer; }
.et-button.secondary { background: #1e293b; color: #e2e8f0; }
.et-error { color: #fda4af; font-size: 13px; margin-top: 12px; min-height: 18px; }
.et-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.et-chip { border-radius: 999px; border: 1px solid #334155; background: #111827; color: #cbd5e1; padding: 6px 12px; font: inherit; font-size: 13px; cursor: pointer; }
.et-input { width: 100%; border-radius: 12px; border: 1px solid #334155; background: #020617; color: #f8fafc; padding: 12px 14px; font: inherit; font-size: 15px; }
.et-banner { position: fixed; right: 16px; bottom: 16px; z-index: 2147483644; background: #0f172a; border: 1px solid #1e293b; color: #e2e8f0; border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 600; box-shadow: 0 10px 30px rgba(0,0,0,.35); display: flex; gap: 8px; align-items: center; }
.et-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block; }
.et-dot.warn { background: #f59e0b; }
.et-dot.bad { background: #f43f5e; }
`;

export type Tone = 'ok' | 'warn' | 'bad';

export interface Overlay {
  root: HTMLElement;
  /** Replaces the current overlay content. */
  set(node: HTMLElement | null): void;
  /** Shows or hides the corner status pill. */
  banner(text: string | null, tone?: Tone): void;
  remove(): void;
}

/** Creates an element with attributes, properties and children. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string; attrs?: Record<string, string> } = {},
  ...children: Array<Node | string | null | undefined | false>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { class: className, attrs, ...rest } = props;
  if (className) node.className = className;
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  Object.assign(node, rest);
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function createOverlay(): Overlay {
  const host = el('div', { attrs: { id: 'earntime-root' } });
  host.style.cssText = 'all: initial;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.append(el('style', { textContent: CSS }));
  const slot = el('div');
  const bannerSlot = el('div');
  shadow.append(slot, bannerSlot);
  (document.documentElement || document.body).append(host);

  return {
    root: host,
    set(node) {
      slot.replaceChildren();
      if (node) slot.append(node);
    },
    banner(text, tone = 'ok') {
      bannerSlot.replaceChildren();
      if (!text) return;
      bannerSlot.append(el('div', { class: 'et-banner' }, el('span', { class: `et-dot ${tone === 'ok' ? '' : tone}` }), text));
    },
    remove() {
      host.remove();
    },
  };
}

/** Shows the mode chooser for a half-productive site. */
export function chooserCard(opts: {
  host: string;
  canUnproductive: boolean;
  reason: 'debt' | 'exhausted' | null;
  onChoose: (mode: 'productive' | 'unproductive') => Promise<string | null>;
  onLeave: () => void;
}): HTMLElement {
  const error = el('p', { class: 'et-error', attrs: { role: 'status' } });
  const productive = el('button', {
    class: 'et-option productive',
    type: 'button',
    attrs: { 'data-et-mode': 'productive' },
  }, el('strong', {}, 'Productive Mode'), el('span', {}, 'Your time earns screen time at your ratio. On YouTube, only study content is shown.'));
  const unavailableText =
    opts.reason === 'debt'
      ? 'Locked while you are in debt mode. Study to repay first.'
      : 'Unavailable: your screen-time balance is empty. Study to earn more.';
  const unproductive = el('button', {
    class: 'et-option unproductive',
    type: 'button',
    attrs: { 'data-et-mode': 'unproductive' },
    disabled: !opts.canUnproductive,
  }, el('strong', {}, 'Unproductive Mode'), el('span', {}, opts.canUnproductive ? 'Full site. Time is charged to your balance.' : unavailableText));

  const run = async (mode: 'productive' | 'unproductive') => {
    productive.disabled = true;
    unproductive.disabled = true;
    const message = await opts.onChoose(mode);
    if (message) {
      error.textContent = message;
      productive.disabled = false;
      unproductive.disabled = !opts.canUnproductive;
    }
  };
  productive.addEventListener('click', () => void run('productive'));
  unproductive.addEventListener('click', () => {
    if (opts.canUnproductive) void run('unproductive');
  });

  return el(
    'div',
    { class: 'et-backdrop', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': `How to use ${opts.host}` } },
    el(
      'div',
      { class: 'et-card' },
      el('p', { class: 'et-eyebrow' }, 'EarnTime · half-productive site'),
      el('h2', { class: 'et-title' }, `How are you using ${opts.host}?`),
      el('p', { class: 'et-text' }, 'Pick one before you continue. The choice applies to this tab until you leave the site.'),
      el('div', { class: 'et-options' }, productive, unproductive),
      error,
      el(
        'div',
        { class: 'et-row' },
        el('button', { class: 'et-link', type: 'button', onclick: () => opts.onLeave() }, 'Go back'),
      ),
    ),
  );
}

/** Full-page cover, used for blank YouTube pages and fail-closed states. */
export function coverCard(opts: {
  eyebrow: string;
  title: string;
  text: string;
  actions: Array<{ label: string; onClick: () => void; secondary?: boolean }>;
  extra?: HTMLElement;
}): HTMLElement {
  return el(
    'div',
    { class: 'et-cover', attrs: { role: 'dialog', 'aria-label': opts.title } },
    el(
      'div',
      { class: 'et-card' },
      el('p', { class: 'et-eyebrow' }, opts.eyebrow),
      el('h2', { class: 'et-title' }, opts.title),
      el('p', { class: 'et-text' }, opts.text),
      opts.extra ?? null,
      el(
        'div',
        { class: 'et-row' },
        ...opts.actions.map((a) =>
          el('button', { class: `et-button${a.secondary ? ' secondary' : ''}`, type: 'button', onclick: () => a.onClick() }, a.label),
        ),
      ),
    ),
  );
}
