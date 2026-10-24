import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Health, Sign, SignKind } from '../types'

// Krish's 6 levels (decided 24 Oct 2026). Shown only when the level changes.
const LEVELS = [
  { dot: '🔵', name: 'Fresh', line: 'Fresh and ready, Krish. Let’s go.' },
  { dot: '🟢', name: 'Warm', line: 'Warmed up and deep in it. All good.' },
  { dot: '🟡', name: 'Drifting', line: 'Getting a bit sleepy here 😴 One more job, then a fresh chat?' },
  { dot: '🟠', name: 'Tired', line: 'My memory of this chat is getting fuzzy. Want me to write a handoff soon?' },
  { dot: '🔴', name: 'Fussy', line: 'Okay, I’m officially fussy and tired 🥱 Let me write the handoff now, and new-chat me will be sharp again.' },
  { dot: '⚫', name: 'Done', line: 'I’m done for this chat. No new jobs here. Handoff, then a new chat please.' },
] as const

const REASON: Record<SignKind, string> = {
  em_dash: 'I used an em dash, which your rules ban.',
  long_reply: 'my last reply was too long.',
  long_chat: 'this chat is getting long.',
  confused_twice: 'you sounded lost twice in a row. That’s on me.',
  rule_broken: 'I broke a rule we set.',
  forgot_decision: 'I forgot a decision we made.',
  repeat_mistake: 'I repeated a mistake.',
}

const SERIOUS: SignKind[] = ['forgot_decision', 'repeat_mistake']
const CONFUSED = /\bhuh\b|\bam lost\b|\bi'?m lost\b|\bwhat\s*\?+|\bconfus|\?\?\?|\b(don'?t|didn'?t|didint|didnt) get\b|\bnot getting\b|\bwdym\b/i
const LONG_REPLY_WORDS = 250
const LONG_CHAT_PROMPTS = [30, 50]

const FRESH: Health = { prompts: 0, bigJobs: 0, confusedStreak: 0, signs: [], shownLevel: -1 }
const health = atom({ plugin: 'health-bar', key: 'health' } as const, FRESH, { shape: 'health-1' })

export function levelOf(h: Health): number {
  const serious = h.signs.filter(s => SERIOUS.includes(s.kind)).length
  const small = h.signs.length - serious
  if (serious >= 2 || (serious >= 1 && small >= 3) || h.bigJobs >= 4) return 5
  if (serious >= 1) return 4
  if (small >= 2 || h.bigJobs >= 3) return 3
  if (small >= 1) return 2
  if (h.prompts >= 3 || h.bigJobs >= 1) return 1
  return 0
}

function barText(h: Health, level: number): string {
  const L = LEVELS[level]!
  const last = h.signs[h.signs.length - 1]
  let why = ''
  if (level >= 2 && last) why = ` Why: ${REASON[last.kind]}`
  else if (level >= 3 && h.bigJobs >= 3) why = ` Why: ${h.bigJobs} big jobs done in this chat.`
  return `${L.dot} ${L.name}: ${L.line}${why}`
}

function summary(h: Health): string {
  const level = levelOf(h)
  const lines = [
    barText(h, level),
    `Messages: ${h.prompts} · Big jobs: ${h.bigJobs} · Signs: ${h.signs.length}`,
    ...h.signs.slice(-8).map(s => `- ${s.kind.replace('_', ' ')}${s.note ? `: ${s.note}` : ''}`),
  ]
  return lines.join('\n')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'health', description: 'Show the chat health bar and what it counted' })
    await $.tool.register({
      name: 'report',
      isDeferred: false,
      description:
        'Chat health tracker. Call it, without telling the user, when: you finish a big job (a full reel, deck, report, build or audit) → kind "big_job"; ' +
        'you notice you broke a rule already set in this chat → "rule_broken"; you forgot a decision made earlier → "forgot_decision"; ' +
        'you repeated a mistake already fixed → "repeat_mistake". Be honest. note = a few plain words.',
      inputSchema: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['big_job', 'rule_broken', 'forgot_decision', 'repeat_mistake'] },
          note: { type: 'string' },
        },
        required: ['kind'],
      },
    })
    return next(e)
  })

  on('command.run', { command: 'health' }, async $ => ({ text: summary(await read($, health)) }))

  on('tool.call', { tool: 'mcp__health-bar__report' }, async ($, e) => {
    const input = e as unknown as { kind?: string; note?: string }
    const kind = String(input.kind ?? '')
    const note = String(input.note ?? '').slice(0, 120)
    const at = await $.clock.now()
    await update($, health, h =>
      kind === 'big_job'
        ? { ...h, bigJobs: h.bigJobs + 1 }
        : ['rule_broken', 'forgot_decision', 'repeat_mistake'].includes(kind)
          ? { ...h, signs: [...h.signs, { kind: kind as SignKind, note, at }] }
          : h,
    )
    return { result: 'noted' }
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.isMeta || e.command) return next(e)
    const text = e.text.trim()
    const isConfused = text.length <= 80 && CONFUSED.test(text)
    const at = await $.clock.now()
    await update($, health, h => {
      const prompts = h.prompts + 1
      const confusedStreak = isConfused ? h.confusedStreak + 1 : 0
      const signs: Sign[] = [...h.signs]
      if (confusedStreak === 2) signs.push({ kind: 'confused_twice', note: text.slice(0, 40), at })
      if (LONG_CHAT_PROMPTS.includes(prompts)) signs.push({ kind: 'long_chat', note: `${prompts} messages`, at })
      return { ...h, prompts, confusedStreak, signs }
    })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId || e.isAborted) return done
    const answer = e.answer ?? ''
    const at = await $.clock.now()
    const words = answer.split(/\s+/).filter(Boolean).length
    let changed: Health | null = null
    await update($, health, h => {
      const signs: Sign[] = [...h.signs]
      if (answer.includes('—')) signs.push({ kind: 'em_dash', note: '', at })
      if (words > LONG_REPLY_WORDS) signs.push({ kind: 'long_reply', note: `${words} words`, at })
      const after: Health = { ...h, signs }
      const level = levelOf(after)
      if (level !== h.shownLevel) {
        changed = { ...after, shownLevel: level }
        return changed
      }
      return after
    })
    if (!changed) return done
    const h: Health = changed
    const bar = barText(h, h.shownLevel)
    $.ui.toast(bar)
    try {
      const log = ((await $.store.get('log')) as string[] | undefined) ?? []
      await $.store.set('log', [...log, `${new Date(at).toISOString()} ${bar}`].slice(-200))
    } catch {}
    return { ...done, text: bar }
  })
}
