/**
 * Hostname-only focus protection for adult sites.
 *
 * This list is part of the extension policy, not a user-editable settings list. It deliberately does
 * not inspect page text, paths, images, search terms or embedded media: it reads the hostname and
 * nothing else, so health, education and other mixed-use services are never caught by their content.
 *
 * Four independent hostname tests, because a list alone always lags behind the sites people find:
 *
 *  1. `DEFAULT_ADULT_SITE_HOSTS` — a curated set of dedicated destinations (subdomains follow).
 *  2. `ADULT_TLDS` — sponsored top-level domains that are sold for adult content (`.xxx`, `.porn`,
 *     `.adult`, `.sex`, `.sexy`). A site served from one of these cannot be anything else, so this
 *     catches whole families of sites without naming them.
 *  3. `ADULT_HOST_PARTS` — distinctive brand fragments ("porn", "xnxx", "xhaccess", …) matched
 *     anywhere inside a hostname label. These are specific enough that ordinary sites do not
 *     contain them.
 *  4. `ADULT_HOST_TOKENS` — words that are unambiguous only as a whole label ("sex", "xxx", "milf"),
 *     so `sussex.ac.uk` or `analytics.example.com` are not hit by a substring.
 *
 * The policy is fixed: there is no user-editable domain list and no exception list, so the built-in
 * rule cannot be weakened from Settings. Every enforcement layer (redirect rules, the tab sweep, the
 * load-time page guard) asks `isAdultSiteHost`, so all of them agree.
 */

import hosts from '../../data/adultDomains.json';
import tlds from '../../data/adultTlds.json';
import { hostMatches } from './domains';

/** Curated dedicated adult destinations. Kept in `source/data/adultDomains.json`. */
export const DEFAULT_ADULT_SITE_HOSTS: readonly string[] = hosts;

/**
 * Sponsored top-level domains that exist for adult content. Anything under them is adult by
 * definition, which makes this the most reliable test of the four.
 */
export const ADULT_TLDS: readonly string[] = tlds;

/**
 * Distinctive fragments matched anywhere in a hostname label. Every entry is long or specific
 * enough that a legitimate site is very unlikely to contain it.
 */
export const ADULT_HOST_PARTS: readonly string[] = [
  'porn',
  'xnxx',
  'xvideo',
  'xhamster',
  'xhamsterlive',
  'xhaccess',
  'hentai',
  'hanime',
  'onlyfans',
  'fansly',
  'brazzers',
  'spankbang',
  'faphouse',
  'fapello',
  'chaturbate',
  'stripchat',
  'livejasmin',
  'bongacams',
  'myfreecams',
  'camsoda',
  'jerkmate',
  'camgirl',
  'desisex',
  'desiporn',
  'indianporn',
  'sexvid',
  'sextape',
  'javhd',
  'javbus',
  'javdb',
  'javmost',
  'javgg',
  'javdoe',
  'javsin',
  'javsky',
  'javsub',
  'javwhores',
  'javhihi',
  'javdock',
  'supjav',
  'vjav',
  'netflav',
  'avple',
  'sextb',
  'ashemaletube',
  'letmejerk',
  'badoink',
  'heavy-r',
  'nhentai',
];

/**
 * Words that only mean something adult as a whole label. Matching is per label token, never a
 * substring, so `sussex`, `essex`, `analytics`, `classics` and `cumulative` stay clear.
 *
 * `joi` is deliberately not here: it is also the name of a widely used JavaScript validation
 * library (`joi.dev`), and the JAV sites that use it are covered by the curated list instead.
 */
export const ADULT_HOST_TOKENS: readonly string[] = [
  'xxx',
  'porn',
  'porno',
  'sex',
  'sexy',
  'nude',
  'nudes',
  'naked',
  'nsfw',
  'hentai',
  'milf',
  'anal',
  'dick',
  'cock',
  'pussy',
  'boobs',
  'tits',
  'slut',
  'whore',
  'fap',
  'jerk',
  'bdsm',
  'erotic',
  'erotica',
  'escort',
  'escorts',
  'jav',
  'loli',
  'rule34',
  'ahegao',
  'doujin',
  'camsex',
  'hardcore',
  'blowjob',
  'handjob',
  'creampie',
  'gangbang',
  'threesome',
  'shemale',
  'tranny',
  'tube8',
  'redtube',
  'beeg',
  'ashemaletube',
  'hanime',
  'hanime1',
  'vjav',
  'supjav',
  'javhihi',
  'javdock',
  'jav321',
  'javwhores',
  '123av',
  'netflav',
  'avple',
  'sextb',
  'letmejerk',
  'xbabe',
  'badoinkvr',
  'twistys',
  'familystrokes',
  'sislovesme',
  'nubilefilms',
  'wetplace',
];

/**
 * Brand labels that start with "xxx" and cannot be anything else. Kept as a list rather than a
 * prefix test so a shop such as `xxxlutz.at` is not caught by three letters.
 */
export const XXX_BRAND_TOKENS: readonly string[] = [
  'xxxvideos',
  'xxxvideo',
  'xxxmovies',
  'xxxmovie',
  'xxxhd',
  'xxxporn',
  'xxxtube',
  'xxxsex',
  'xxxpics',
  'xxxgirls',
];

/** All fixed adult-site domains (the curated list). */
export function adultSiteDomains(): string[] {
  return [...DEFAULT_ADULT_SITE_HOSTS];
}

function normalize(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, '');
}

/** Label tokens of a hostname: `free-sex-videos.example.xxx` → free, sex, videos, example, xxx. */
function hostTokens(host: string): string[] {
  return host
    .split('.')
    .flatMap((label) => label.split(/[^a-z0-9]+/))
    .filter(Boolean);
}

/**
 * True for the built-in policy. Matches hostnames only, including subdomains of a listed domain.
 */
export function isAdultSiteHost(host: string): boolean {
  if (!host) return false;
  const clean = normalize(host);
  if (!clean) return false;

  const labels = clean.split('.');
  if (labels.length < 2) return false;

  const tld = labels[labels.length - 1];
  if (ADULT_TLDS.includes(tld)) return true;

  if (DEFAULT_ADULT_SITE_HOSTS.some((entry) => hostMatches(clean, entry))) return true;

  for (const label of labels) {
    if (ADULT_HOST_PARTS.some((part) => label.includes(part))) return true;
  }

  for (const token of hostTokens(clean)) {
    if (ADULT_HOST_TOKENS.includes(token)) return true;
    // Known brand labels (xxxvideos, xxxhd, …) and numbered mirrors (xxx1, xxx2).
    if (XXX_BRAND_TOKENS.includes(token) || /^xxx\d+$/.test(token)) return true;
  }

  return false;
}

/**
 * Hostnames the redirect rules should cover: the fixed curated list. Duplicates are dropped so the
 * packaged ruleset stays compact, and the same list feeds both the static and dynamic rules.
 */
export function guardedRequestDomains(): string[] {
  const out: string[] = [];
  for (const host of DEFAULT_ADULT_SITE_HOSTS) {
    const clean = normalize(host);
    if (clean && !out.includes(clean)) out.push(clean);
  }
  return out;
}
