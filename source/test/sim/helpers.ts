import assert from 'node:assert/strict';
import { FakeBrowser, EXT_ORIGIN } from './fakeBrowser';
import { MIN_MS as MIN } from './constants';
import type { SetupPayload } from '../../src/core/commands';

export { MIN };
export const SEC = 1000;

export function localTime(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): number {
  return new Date(y, mo - 1, d, h, mi, s).getTime();
}

export const START = localTime(2026, 10, 8, 9, 0, 0);

export const BLOCK_EXHAUSTED = `${EXT_ORIGIN}/block.html?reason=exhausted`;
export const BLOCK_EXTENSIONS = `${EXT_ORIGIN}/block.html?reason=extensions`;

export function setupPayload(overrides: Partial<SetupPayload> = {}): SetupPayload {
  return {
    earnFromMin: 60,
    earnToMin: 5,
    unlockCostMin: 10,
    initialBalanceMin: 0,
    productive: ['khanacademy.org', 'nptel.ac.in'],
    half: ['youtube.com', 'web.whatsapp.com'],
    unproductive: ['instagram.com', 'reddit.com'],
    youtubeKeywords: ['JEE', 'NDA', 'Study', 'Learn', 'Education', 'PW'],
    whatsappChats: ['Mom'],
    whatsappGroups: ['Progress Check'],
    tasks: [],
    ...overrides,
  };
}

export async function installAndSetup(b: FakeBrowser, overrides: Partial<SetupPayload> = {}): Promise<void> {
  await b.installExtension('install');
  const reply = await b.sendFromExtensionPage({ type: 'ui.command', command: { type: 'setup.complete', payload: setupPayload(overrides) } });
  assert.equal(reply.ok, true, JSON.stringify(reply));
}

export async function command(b: FakeBrowser, command: Record<string, unknown>): Promise<any> {
  return b.sendFromExtensionPage({ type: 'ui.command', command });
}

export function balanceMin(b: FakeBrowser): number {
  return b.storedState().balanceMs / MIN;
}

export function debtMin(b: FakeBrowser): number {
  return b.storedState().debtMs / MIN;
}

export function newBrowser(): FakeBrowser {
  return new FakeBrowser(START);
}

export async function openedWindowWithTab(b: FakeBrowser, url: string, opts: { focused?: boolean } = {}): Promise<{ windowId: number; tabId: number }> {
  const windowId = await b.openWindow({ focused: opts.focused !== false });
  const tabId = await b.openTab(url, { windowId, active: true });
  return { windowId, tabId };
}
