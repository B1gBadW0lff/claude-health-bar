import { expect, test } from 'claude-code/testing'

test('levels move with the signs', async ($, on) => {
  on('command.register', () => ({ value: { command: 'health' } }))
  on('tool.register', () => ({ value: { tool: 'mcp__health-bar__report' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.toast', () => ({ value: undefined }))
  on('clock.now', () => ({ value: 1761300000000 }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const turn = async (prompt: string, answer: string) => {
    await $.prompt.submit({ text: prompt })
    return $.turn.complete({ answer, durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as never)
  }
  const a = await turn('hi', 'bug bug')
  expect((a as { text?: string }).text).toMatch(/Fresh/)
  const b = await turn('ok', 'fine')
  expect((b as { text?: string }).text).toBe('fine')
  const c = await turn('huh?', 'sorry')
  const d = await turn('what?', 'sorry again')
  expect((d as { text?: string }).text).toMatch(/Drifting/)
  const e = await turn('go', 'done — there')
  expect((e as { text?: string }).text).toMatch(/Tired/)
  void c
})
