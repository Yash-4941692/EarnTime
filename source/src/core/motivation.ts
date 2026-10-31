/**
 * The short motivational lines EarnTime shows where it interrupts you.
 *
 * Pure data and one picker, so the wording lives in a single place, can be unit-tested, and is
 * shared by every page that shows it. Two sets, because they are read in different moods:
 *
 *  - `ADULT_PAUSE_LINES` — the fixed adult-site pause. It never names the site, the reason, the
 *    balance or the word "block": the page is a pause, not an accounting statement.
 *  - `STUDY_LINES` — the encouragement on the debt and "screen time used up" pages, where the
 *    wallet is already on screen and what is missing is a reason to start studying.
 */

export interface MotivationLine {
  title: string;
  text: string;
}

/** Shown on the motivational pause page for the fixed adult-site focus guard. */
export const ADULT_PAUSE_LINES: readonly MotivationLine[] = [
  {
    title: "Bro/Sis, don't lose to lust.",
    text: 'Remember why you started. One small choice now protects the future you are working for.',
  },
  {
    title: 'Did you forget why you started?',
    text: "Don't trade your goal for a passing urge. Take a breath, close this tab, and choose your next step.",
  },
  {
    title: "Time can't be bought this cheap.",
    text: 'Every distraction is paid back with interest called regret. Spend this moment on the life you want.',
  },
  {
    title: 'Your future self is counting on you.',
    text: 'Pause, reset, and put your attention where you meant it to go.',
  },
  {
    title: "You are stronger than this minute.",
    text: 'An urge is a wave: it rises, it crests, and it passes. Ride it out and get back to your work.',
  },
  {
    title: 'Close it and walk away for two minutes.',
    text: 'Stand up, drink some water, look out of the window. The pull gets weaker the moment you move.',
  },
  {
    title: 'The version of you that you are building is watching.',
    text: 'Every time you choose your goal here, the habit gets a little stronger and the urge a little weaker.',
  },
  {
    title: 'Nothing here will remember you. Your goals will.',
    text: 'Come back to the work that is actually yours: the exam, the skill, the person you are becoming.',
  },
];

/** Shown on the block pages that stop you for time reasons (debt, or an empty balance). */
export const STUDY_LINES: readonly MotivationLine[] = [
  {
    title: 'Debt is only time you have not studied yet.',
    text: 'Every focused minute pays it down. Start one and the number starts moving.',
  },
  {
    title: 'You have done harder things than this.',
    text: 'Open a study tab and give it two minutes. Two honest minutes are enough to begin.',
  },
  {
    title: 'Earn it, then enjoy it.',
    text: 'The break feels better after real work. Study first and the screen time is yours without the guilt.',
  },
  {
    title: 'Small sessions still count.',
    text: 'Twenty minutes of real study is twenty minutes you will not have to pay back later.',
  },
  {
    title: 'This is the part that builds the habit.',
    text: 'Coming back to your goal now is what makes the rest of the day easier.',
  },
];

/**
 * Picks the line for the current minute, so a page that is reloaded (or several tabs opened in the
 * same minute) reads the same, and the next minute reads a different one.
 */
export function pickMotivationLine(lines: readonly MotivationLine[], now: number): MotivationLine {
  if (lines.length === 0) return { title: 'Keep going.', text: 'One focused minute is enough to start.' };
  const minute = Math.floor(Math.max(0, now) / 60_000);
  return lines[minute % lines.length];
}
