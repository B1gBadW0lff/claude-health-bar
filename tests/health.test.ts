import { expect, test } from 'claude-code/testing'

test('the bar rides in the reply only when the level changes', async ($, on) => {
  on('command.register', () => ({ value: { command: 'health' } }))
  on('tool.register', () => ({ value: { tool: 'mcp__health-bar__report' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text, context: e.context }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('clock.now', () => ({ value: 1761300000000 }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const turn = async (prompt: string, answer: string) => {
    const sent = (await $.prompt.submit({ text: prompt })) as { context?: readonly string[] }
    const done = (await $.turn.complete({ answer, durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as never)) as { text?: string }
    return { note: (sent.context ?? []).join('\n'), text: done.text }
  }
  const a = await turn('hi', 'bug bug')
  expect(a.note).toContain('🔵 Fresh')
  expect(a.text).toBe('bug bug')
  const b = await turn('ok', 'fine')
  expect(b.note).toBe('')
  const c = await turn('next', 'sure')
  expect(c.note).toContain('🟢 Warm')
  await turn('huh?', 'sorry')
  const d = await turn('what?', 'sorry again')
  expect(d.note).toContain('🟡 Drifting')
  await turn('go', 'done — there')
  const f = await turn('ok', 'yes')
  expect(f.note).toContain('🟠 Tired')
  expect(f.note).toContain('em dash')
  const g = await turn('ok', 'yes')
  expect(g.note).toBe('')
})
