/**
 * Pure builder for declarativeNetRequest dynamic rules that redirect main-frame navigations.
 * Only top-level page loads are matched; sub-resources are never touched.
 *
 *  - The hostname-only adult-site guard is independent of the wallet and wins over every other rule.
 *    It is enforced twice: by the curated list (`requestDomains`), and by a regular expression for
 *    adult sponsored top-level domains, which cannot be expressed as a domain list.
 *  - Zero balance: unproductive domains redirect to the block page.
 *  - Debt: every http(s) navigation redirects, except productive and half-productive domains
 *    (priority 3 allow beats priority 1 redirect).
 *
 * Hostname fragments that need a token test (for example "xnxx", "hentai" or "xhaccess"): the
 * redirect rules carry the domains and the TLDs, and the load-time page guard in the content script
 * closes the remaining gap, so a matching site is never usable even when no rule matches its
 * address.
 *
 * Tabs that are already open are handled by the controller, which navigates them directly.
 */

import { ADULT_TLDS, guardedRequestDomains } from './adultSites';
import { isDebtMode, isExhausted } from './roles';
import type { EarnState } from './types';

export const BLOCK_PAGE_PATH = '/block.html';
/**
 * The adult-site pause is its own page, not `block.html` with a `reason` in the query string.
 *
 * A declarativeNetRequest redirect only carries the path, and a redirect target that has to survive
 * a query parameter can lose it — which is exactly how the pause page used to fall back to the
 * ordinary "screen time used up" block. `motivation.html` always is the motivational pause, so what
 * the rule asks for is what the user gets. The page must also be listed in
 * `web_accessible_resources`, or Chrome refuses to load it for a navigation that started on a
 * website (for example a link click) instead of the address bar. And the manifest must ask for
 * `"incognito": "split"`: in the default spanning mode Chrome will not put a page from the
 * extension's own package into the main frame of an incognito tab at all, so the redirect ends on
 * Chrome's `ERR_BLOCKED_BY_CLIENT` page instead of the pause — the pause worked in a normal window
 * and nowhere else. `test/unit/manifest.test.ts` holds both requirements.
 */
export const MOTIVATION_PAGE_PATH = '/motivation.html';

/**
 * Any http(s) address whose hostname ends in an adult sponsored TLD. Expressed as a regular
 * expression because `requestDomains` needs whole domains, not suffixes.
 *
 * The host part is `[^/?#]+` on purpose: a plain `[^/]+` also swallows a query or fragment that
 * follows the host (`https://example.com#x=.sex`), which would pause an ordinary page because of
 * text in its address rather than its hostname. Hostnames cannot contain `/`, `?` or `#`.
 */
export const ADULT_TLD_REGEX = `^https?://[^/?#]+\\.(${ADULT_TLDS.join('|')})([:/?#]|$)`;

export interface DnrRule {
  id: number;
  priority: number;
  action:
    | { type: 'allow' }
    | { type: 'redirect'; redirect: { extensionPath: string } };
  condition: {
    requestDomains?: string[];
    excludedRequestDomains?: string[];
    regexFilter?: string;
    isUrlFilterCaseSensitive?: boolean;
    resourceTypes: string[];
  };
}

export function buildBlockingRules(state: EarnState): DnrRule[] {
  const rules: DnrRule[] = [];
  const redirect = { type: 'redirect' as const, redirect: { extensionPath: BLOCK_PAGE_PATH } };
  const pause = { type: 'redirect' as const, redirect: { extensionPath: MOTIVATION_PAGE_PATH } };

  // The guard itself: the fixed curated domains.
  rules.push({
    id: 4,
    priority: 6,
    action: pause,
    condition: {
      requestDomains: guardedRequestDomains(),
      resourceTypes: ['main_frame'],
    },
  });
  // …and the adult sponsored TLDs, which are adult by definition.
  rules.push({
    id: 5,
    priority: 6,
    action: pause,
    condition: {
      regexFilter: ADULT_TLD_REGEX,
      isUrlFilterCaseSensitive: false,
      resourceTypes: ['main_frame'],
    },
  });

  if (isDebtMode(state)) {
    const allowed = [...state.rules.productive, ...state.rules.half];
    if (allowed.length > 0) {
      rules.push({
        id: 2,
        priority: 3,
        action: { type: 'allow' },
        condition: { requestDomains: allowed, resourceTypes: ['main_frame'] },
      });
    }
    rules.push({
      id: 3,
      priority: 1,
      action: redirect,
      condition: { regexFilter: '^https?://', resourceTypes: ['main_frame'] },
    });
    return rules;
  }

  if (isExhausted(state) && state.rules.unproductive.length > 0) {
    rules.push({
      id: 1,
      priority: 2,
      action: redirect,
      condition: { requestDomains: [...state.rules.unproductive], resourceTypes: ['main_frame'] },
    });
  }
  return rules;
}

/**
 * The same guard as a standalone declarativeNetRequest ruleset file.
 *
 * The dynamic rules above are installed by the service worker, so they only exist once the worker
 * has run at least one job — right after an install, a reload or an update, a navigation can beat
 * it. A static ruleset is read from the package when the extension loads, so the pause applies from
 * the first moment EarnTime is enabled. `source/esbuild.config.js` writes this file, at build time,
 * from the same curated list, so the two can never drift apart.
 */
export function buildAdultGuardRuleSet(): DnrRule[] {
  return [
    {
      id: 1,
      priority: 100,
      action: { type: 'redirect', redirect: { extensionPath: MOTIVATION_PAGE_PATH } },
      condition: { requestDomains: guardedRequestDomains(), resourceTypes: ['main_frame'] },
    },
    {
      id: 2,
      priority: 100,
      action: { type: 'redirect', redirect: { extensionPath: MOTIVATION_PAGE_PATH } },
      condition: {
        regexFilter: ADULT_TLD_REGEX,
        isUrlFilterCaseSensitive: false,
        resourceTypes: ['main_frame'],
      },
    },
  ];
}
