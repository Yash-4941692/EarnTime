/**
 * Shared "run a command and show the result" hook for the settings sections.
 *
 * A change that lifts a restriction costs screen time, and it is never charged on the click that
 * asked for it: the service worker quotes the price, this asks the user to accept it, and only an
 * accepted quote is sent back as the same command with `confirm: true`. Free changes are untouched,
 * so filling in a list is still one click per entry.
 */

import type { Command } from '../../core/commands';
import { runCommand } from '../lib/extension';

export type Act = (command: Command, success?: string) => Promise<boolean>;

/** Asks the user to accept a cost. True means go ahead and charge it. */
export type Confirm = (message: string) => boolean | Promise<boolean>;

const windowConfirm: Confirm = (message) => window.confirm(message);

export function createAct(
  setNotice: (notice: { tone: 'success' | 'error'; text: string } | null) => void,
  confirm: Confirm = windowConfirm,
): Act {
  return async (command, success) => {
    let result = await runCommand(command);

    // Quoted rather than charged: nothing has been spent yet, so ask before re-issuing it.
    if (!result.ok && result.quote) {
      const accepted = await confirm(`${result.message} Continue?`);
      if (!accepted) {
        setNotice(null);
        return false;
      }
      result = await runCommand({ ...command, confirm: true } as Command);
    }

    if (result.ok) {
      setNotice(success ? { tone: 'success', text: success } : null);
      return true;
    }
    setNotice({ tone: 'error', text: result.message ?? 'That change was not saved.' });
    return false;
  };
}
