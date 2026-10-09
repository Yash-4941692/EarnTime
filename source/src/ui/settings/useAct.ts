/** Shared "run a command and show the result" hook for the settings sections. */

import type { Command } from '../../core/commands';
import { runCommand } from '../lib/extension';

export type Act = (command: Command, success?: string) => Promise<boolean>;

export function createAct(setNotice: (notice: { tone: 'success' | 'error'; text: string } | null) => void): Act {
  return async (command, success) => {
    const result = await runCommand(command);
    if (result.ok) {
      setNotice(success ? { tone: 'success', text: success } : null);
      return true;
    }
    setNotice({ tone: 'error', text: result.message ?? 'That change was not saved.' });
    return false;
  };
}
