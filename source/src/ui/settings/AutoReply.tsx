/**
 * Settings → Auto-reply. WhatsApp messages EarnTime sends for you: replies to incoming messages,
 * announcements when a task is ticked off, and scheduled messages while WhatsApp Web is open.
 */

import { useState, type FormEvent } from 'react';
import { describeRule } from '../../core/autoreply';
import type { Command } from '../../core/commands';
import type { AutoReplyRepeat, AutoReplyRule, AutoReplyTrigger, EarnState } from '../../core/types';
import { Button, Card, Empty, Field, Notice } from '../components';
import { useNow } from '../lib/extension';
import type { Act } from './useAct';

interface Draft {
  name: string;
  trigger: AutoReplyTrigger;
  targets: string;
  message: string;
  taskTitles: string;
  from: string;
  to: string;
  cooldownMin: string;
  repeat: AutoReplyRepeat;
}

const EMPTY: Draft = {
  name: '',
  trigger: 'incoming',
  targets: '',
  message: '',
  taskTitles: '',
  from: '',
  to: '',
  cooldownMin: '30',
  repeat: 'daily',
};

const TRIGGER_LABEL: Record<AutoReplyTrigger, string> = {
  incoming: 'Someone messages me',
  task: 'I tick off a task',
  window: 'A time of day arrives',
};

const TRIGGER_HELP: Record<AutoReplyTrigger, string> = {
  incoming:
    'Fires when a new message arrives in a matching chat. Leave “Send to” empty to answer every personal chat that messages you — never a group.',
  task: 'Fires once each time a daily task is ticked off. Use {task} in the message to name the task. Naming chats is required.',
  window: 'Fires once a day for each named chat while the window below is open and WhatsApp Web is running.',
};

const REPEAT_LABEL: Record<AutoReplyRepeat, string> = {
  every: 'Every time it fires',
  daily: 'Once a day per chat',
  once: 'Once ever per chat (first message only)',
};

/** Splits a comma/newline separated box into trimmed, de-duplicated names. */
export function splitNames(value: string): string[] {
  const out: string[] = [];
  for (const part of value.split(/[,\n]/)) {
    const trimmed = part.trim();
    if (trimmed && !out.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) out.push(trimmed);
  }
  return out;
}

function draftOf(rule: AutoReplyRule): Draft {
  return {
    name: rule.name,
    trigger: rule.trigger,
    targets: rule.targets.join(', '),
    message: rule.message,
    taskTitles: rule.taskTitles.join(', '),
    from: rule.from,
    to: rule.to,
    cooldownMin: String(rule.cooldownMin),
    repeat: rule.repeat,
  };
}

function draftToCommand(draft: Draft, id: string | null): Command {
  const rule = {
    name: draft.name,
    trigger: draft.trigger,
    targets: splitNames(draft.targets),
    message: draft.message,
    taskTitles: splitNames(draft.taskTitles),
    from: draft.from,
    to: draft.to,
    cooldownMin: Number(draft.cooldownMin) || 0,
    repeat: draft.repeat,
  };
  return id ? { type: 'autoreply.update', id, rule } : { type: 'autoreply.add', rule };
}

function RuleForm({
  draft,
  setDraft,
  editing,
  onSubmit,
  onCancel,
}: {
  draft: Draft;
  setDraft: (draft: Draft) => void;
  editing: string | null;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_220px]">
        <Field label="Name (optional)" htmlFor="ar-name">
          <input id="ar-name" className="field" maxLength={60} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Jarvis intro" />
        </Field>
        <Field label="Send when" htmlFor="ar-trigger">
          <select id="ar-trigger" className="field" value={draft.trigger} onChange={(e) => setDraft({ ...draft, trigger: e.target.value as AutoReplyTrigger })}>
            {(Object.keys(TRIGGER_LABEL) as AutoReplyTrigger[]).map((trigger) => (
              <option key={trigger} value={trigger}>{TRIGGER_LABEL[trigger]}</option>
            ))}
          </select>
        </Field>
      </div>
      <p className="text-[12px] leading-snug text-slate-500">{TRIGGER_HELP[draft.trigger]}</p>

      <Field
        label="Send to (exact chat or group names, comma separated)"
        htmlFor="ar-targets"
        hint={
          draft.trigger === 'incoming'
            ? 'Leave empty to answer every other personal chat. Empty never reaches a group.'
            : 'Required: name the chats, so this cannot message your whole contact list.'
        }
      >
        <input id="ar-targets" className="field" value={draft.targets} onChange={(e) => setDraft({ ...draft, targets: e.target.value })} placeholder="e.g. Progress Check" />
      </Field>

      {draft.trigger === 'task' ? (
        <Field label="Only for these tasks (comma separated)" htmlFor="ar-tasks" hint="Empty = every task you tick off.">
          <input id="ar-tasks" className="field" value={draft.taskTitles} onChange={(e) => setDraft({ ...draft, taskTitles: e.target.value })} placeholder="e.g. Chemistry Lecture, DPP" />
        </Field>
      ) : null}

      <Field
        label="Message"
        htmlFor="ar-message"
        hint={draft.trigger === 'task' ? '{task} becomes the task name and {time} the clock time. Plain text only.' : '{time} becomes the clock time. Plain text only.'}
      >
        <textarea
          id="ar-message"
          className="field min-h-[92px] resize-y"
          maxLength={700}
          value={draft.message}
          onChange={(e) => setDraft({ ...draft, message: e.target.value })}
          placeholder={
            draft.trigger === 'task'
              ? "e.g. Yash Boss completed his today's {task}"
              : "e.g. I'm in a study block right now — I'll reply after 6 pm."
          }
        />
      </Field>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Only between" htmlFor="ar-from" hint="Empty = all day.">
          <input id="ar-from" className="field" type="time" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        </Field>
        <Field label="and" htmlFor="ar-to" hint="May cross midnight.">
          <input id="ar-to" className="field" type="time" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        </Field>
        <Field label="Wait between sends (min)" htmlFor="ar-cooldown" hint="Per chat. 0 = no wait.">
          <input id="ar-cooldown" className="field" type="number" min={0} max={1440} value={draft.cooldownMin} onChange={(e) => setDraft({ ...draft, cooldownMin: e.target.value })} />
        </Field>
        <Field label="Repeat" htmlFor="ar-repeat">
          <select id="ar-repeat" className="field" value={draft.repeat} onChange={(e) => setDraft({ ...draft, repeat: e.target.value as AutoReplyRepeat })}>
            {(Object.keys(REPEAT_LABEL) as AutoReplyRepeat[]).map((repeat) => (
              <option key={repeat} value={repeat}>{REPEAT_LABEL[repeat]}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex gap-2">
        <Button type="submit" variant="primary">{editing ? 'Save rule' : 'Add rule'}</Button>
        {editing ? <Button type="button" onClick={onCancel}>Cancel</Button> : null}
      </div>
    </form>
  );
}

function GroupsCard({ state, act }: { state: EarnState; act: Act }) {
  const [chat, setChat] = useState('');
  return (
    <Card className="space-y-3">
      <h2 className="text-[15px] font-semibold text-slate-50">Which chats are groups</h2>
      <p className="text-[13px] leading-snug text-slate-400">
        A reply rule with no names answers personal chats only. List your group names here so EarnTime knows which
        chats to keep away from — it also skips any chat it cannot identify, rather than risk messaging a group.
      </p>
      <ul className="flex flex-wrap gap-2" aria-label="WhatsApp group chats">
        {state.settings.whatsappGroups.length === 0 ? <Empty>No groups listed. Fallback replies go to personal chats only.</Empty> : null}
        {state.settings.whatsappGroups.map((name) => (
          <span key={name} className="chip">
            {name}
            <button
              type="button"
              className="ml-1 rounded-full px-1 text-slate-400 hover:text-rose-300"
              aria-label={`Remove group ${name}`}
              onClick={() => void act({ type: 'wagroup.remove', chat: name }, `Removed "${name}".`)}
            >
              ×
            </button>
          </span>
        ))}
      </ul>
      <form
        className="grid grid-cols-[1fr_auto] gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (chat.trim()) void act({ type: 'wagroup.add', chat }, `Added "${chat.trim()}".`).then((ok) => ok && setChat(''));
        }}
      >
        <Field label="Add a group name" htmlFor="wa-group">
          <input id="wa-group" className="field" value={chat} onChange={(e) => setChat(e.target.value)} placeholder="Exact name, e.g. Progress Check" />
        </Field>
        <div className="flex items-end">
          <Button type="submit" variant="primary">Add</Button>
        </div>
      </form>
    </Card>
  );
}

export function AutoReplySection({ state, act }: { state: EarnState; act: Act }) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(state.autoReplies.length === 0);
  const now = useNow(30_000);
  const log = [...state.autoReplyLog].reverse().slice(0, 12);
  const anyEnabled = state.autoReplies.some((rule) => rule.enabled);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await act(draftToCommand(draft, editing), editing ? 'Auto-reply saved.' : 'Auto-reply added.');
    if (ok) {
      setDraft(EMPTY);
      setEditing(null);
      setShowForm(state.autoReplies.length === 0);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <h2 className="text-[15px] font-semibold text-slate-50">WhatsApp auto-reply</h2>
        <ul className="list-disc space-y-1 pl-5 text-[13px] leading-snug text-slate-400">
          <li>EarnTime sends from your WhatsApp Web tab. <strong className="text-slate-200">Nothing is sent unless WhatsApp Web is open and logged in</strong> — a background tab is enough, it does not need focus.</li>
          <li>A rule that names chats sends to exactly those chats. A rule with no names answers <strong className="text-slate-200">personal chats only</strong> — never a group, and never a chat on your Productive Mode list.</li>
          <li>Only plain text is sent. Media, stickers, reactions and voice notes are out of scope.</li>
          <li>WhatsApp Web has no extension API, so EarnTime drives its interface. A send that fails is logged below with the reason; after three failures in a row the tab stops trying until you reload WhatsApp.</li>
        </ul>
        {state.setupDone && !anyEnabled ? <Notice tone="warn">Every auto-reply is switched off. Nothing will be sent.</Notice> : null}
      </Card>

      <Card className="space-y-3">
        {showForm ? (
          <RuleForm
            draft={draft}
            setDraft={setDraft}
            editing={editing}
            onSubmit={submit}
            onCancel={() => {
              setEditing(null);
              setDraft(EMPTY);
              setShowForm(state.autoReplies.length === 0);
            }}
          />
        ) : (
          <Button variant="primary" onClick={() => setShowForm(true)}>Add an auto-reply</Button>
        )}
      </Card>

      <Card className="space-y-2">
        <h2 className="text-[15px] font-semibold text-slate-50">Your rules</h2>
        {state.autoReplies.length === 0 ? <Empty>No auto-replies yet.</Empty> : null}
        <ul className="divide-y divide-slate-800/80">
          {state.autoReplies.map((rule) => (
            <li key={rule.id} className="py-3">
              <div className="flex flex-wrap items-start gap-3">
                <label className="sr-only" htmlFor={`ar-on-${rule.id}`}>Enable {rule.name}</label>
                <input
                  id={`ar-on-${rule.id}`}
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-emerald-400"
                  checked={rule.enabled}
                  onChange={() => void act({ type: 'autoreply.toggle', id: rule.id })}
                />
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-[13.5px] ${rule.enabled ? 'text-slate-100' : 'text-slate-500'}`}>{rule.name}</div>
                  <div className="text-[11.5px] text-slate-500">{describeRule(rule)}</div>
                  <div className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-950/60 px-2 py-1.5 text-[12.5px] text-slate-300">{rule.message}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-[12.5px]"
                    title="Queues one message now. It goes out the next time WhatsApp Web is open."
                    onClick={() => void act({ type: 'autoreply.test', id: rule.id }, 'Test message queued. It goes out while WhatsApp Web is open.')}
                  >
                    Test
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-[12.5px]"
                    onClick={() => {
                      setEditing(rule.id);
                      setDraft(draftOf(rule));
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" className="px-2 py-1 text-[12.5px]" onClick={() => void act({ type: 'autoreply.delete', id: rule.id }, 'Auto-reply deleted.')}>
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <GroupsCard state={state} act={act} />

      <Card className="space-y-2">
        <h2 className="text-[15px] font-semibold text-slate-50">Recent activity</h2>
        {log.length === 0 ? (
          <Empty>Nothing sent yet. Activity appears here once WhatsApp Web delivers a message.</Empty>
        ) : (
          <ul className="divide-y divide-slate-800/80">
            {log.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-2 py-2 text-[12.5px]">
                <span className={entry.ok ? 'text-emerald-300' : 'text-rose-300'}>{entry.ok ? 'Sent' : 'Failed'}</span>
                <span className="text-slate-100">{entry.chat}</span>
                <span className="min-w-0 flex-1 truncate text-slate-400">{entry.detail}</span>
                <span className="text-slate-500">{new Date(entry.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11.5px] text-slate-500">Checked {new Date(now).toLocaleTimeString()}.</p>
      </Card>
    </div>
  );
}
