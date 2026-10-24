import { expect, test } from 'claude-code/testing'

test('levels move with the signs', async ($, on) => {
  on('command.register', () => ({ value: { command: 'health' } }))
  on('tool.register', () => ({ value: { tool: 'mcp__health-bar__report' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('clock.now', () => ({ value: 1761300000000 }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const turn = async (prompt: string, answer: string) => {
    await $.prompt.submit({ text: prompt })
    return $.turn.complete({ answer, durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as never)
  }
  const level = async () => {
    const ui = await $.ui.mount({ plugin: 'health-bar', component: 'AbovePrompt', surface: 'desktop', props: {} } as never)
    const text = (await ui.find({ type: 'Text' }))?.text ?? ''
    await ui.unmount()
    return ['Fresh', 'Warm', 'Drifting', 'Tired', 'Fussy', 'Done'].findIndex(n => text.includes(n))
  }
  const a = await turn('hi', 'bug bug')
  expect((a as { text?: string }).text).toBe('bug bug')
  expect(await level()).toBe(0)
  await turn('ok', 'fine')
  await turn('huh?', 'sorry')
  await turn('what?', 'sorry again')
  expect(await level()).toBe(2)
  const e = await turn('go', 'done — there')
  expect((e as { text?: string }).text).toBe('done — there')
  expect(await level()).toBe(3)
})
