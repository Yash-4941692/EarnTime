/**
 * Fixed hostname-only focus protection for dedicated adult sites.
 *
 * This list is part of the extension policy, not a user-editable settings list. It deliberately does
 * not inspect page text, paths, images, search terms or embedded media. Mixed-use services (social
 * networks, forums, health and education sites) are excluded. This is a curated starter list, not
 * an exhaustive catalogue of every adult destination.
 */

import { hostMatches } from './domains';

export const DEFAULT_ADULT_SITE_HOSTS = [
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'xhamster.com',
  'redtube.com',
  'youporn.com',
  'tube8.com',
  'spankbang.com',
  'beeg.com',
  'eporner.com',
  'tnaflix.com',
  'youjizz.com',
  'porn.com',
  'porntrex.com',
  'hclips.com',
  'pornhd.com',
  'porntube.com',
  'porndig.com',
  'pornmd.com',
  'sunporno.com',
  'empflix.com',
  'spankwire.com',
  'voyeurhit.com',
  'motherless.com',
  'javhd.com',
  'javmost.com',
  'missav.com',
  '7mmtv.sx',
  'brazzers.com',
  'bangbros.com',
  'naughtyamerica.com',
  'digitalplayground.com',
  'wicked.com',
  'teamskeet.com',
  'mofos.com',
  'adulttime.com',
  'realitykings.com',
  'evilangel.com',
  'puretaboo.com',
  'blacked.com',
  'vixen.com',
  'vrbangers.com',
  'virtualrealporn.com',
  'faphouse.com',
  'sex.com',
] as const;

/** All fixed adult-site domains. */
export function adultSiteDomains(): string[] {
  return [...DEFAULT_ADULT_SITE_HOSTS];
}

/** True only for hostnames in the fixed dedicated-site list; subdomains follow the listed domain. */
export function isAdultSiteHost(host: string): boolean {
  return DEFAULT_ADULT_SITE_HOSTS.some((entry) => hostMatches(host, entry));
}
