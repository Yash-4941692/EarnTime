/** Bill today's previously uncharged screen time when a site becomes unproductive.
 * Uses the screen-time record already built by live tracking and history reconciliation;
 * never replays history over time already observed. Per-host charges prevent double billing.
 */
import { classifyHost, hostMatches } from './domains';
import { dayKey } from './time';
import type { EarnState } from './types';
import { addLedger, incurDebt, spendFromBalance, statsFor } from './wallet';

export function chargeReclassifiedSite(
  state: EarnState,
  entry: string,
  now: number,
): number {
  if (!state.setupDone) return 0;
  const key = dayKey(now);
  const stats = statsFor(state, key);
  let total = 0;
  for (const [host, screenMs] of Object.entries(stats.hosts)) {
    if (!hostMatches(host, entry) || classifyHost(host, state.rules).kind !== 'unproductive') continue;
    const ms = Math.max(0, screenMs - (stats.chargedHosts[host] ?? 0));
    if (ms <= 0) continue;
    const spent = spendFromBalance(state, ms);
    incurDebt(state, ms - spent, now, `Earlier today on ${host}, newly unproductive`);
    stats.chargedHosts[host] = (stats.chargedHosts[host] ?? 0) + ms;
    stats.usedMs += ms;
    stats.unprodMs += ms;
    addLedger(state, 'spend', now, ms, 'Earlier today: site added to unproductive list', host);
    total += ms;
  }
  return total;
}
