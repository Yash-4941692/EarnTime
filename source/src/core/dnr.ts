/**
 * Pure builder for declarativeNetRequest dynamic rules that block main-frame navigations.
 * Only top-level page loads are matched; sub-resources are never touched.
 *
 *  - Zero balance: unproductive domains redirect to the block page.
 *  - Debt: every http(s) navigation redirects, except productive and half-productive domains
 *    (priority 3 allow beats priority 1 block-all).
 *
 * Tabs that are already open are handled by the controller, which navigates them directly.
 */

import { isDebtMode, isExhausted } from './roles';
import type { EarnState } from './types';

export const BLOCK_PAGE_PATH = '/block.html';

export interface DnrRule {
  id: number;
  priority: number;
  action:
    | { type: 'allow' }
    | { type: 'redirect'; redirect: { extensionPath: string } };
  condition: {
    requestDomains?: string[];
    regexFilter?: string;
    resourceTypes: string[];
  };
}

export function buildBlockingRules(state: EarnState): DnrRule[] {
  const rules: DnrRule[] = [];
  const redirect = { type: 'redirect' as const, redirect: { extensionPath: BLOCK_PAGE_PATH } };

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
