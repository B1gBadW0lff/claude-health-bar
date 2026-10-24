export type SignKind =
  | 'em_dash'
  | 'long_reply'
  | 'long_chat'
  | 'confused_twice'
  | 'rule_broken'
  | 'forgot_decision'
  | 'repeat_mistake'

export type Sign = { kind: SignKind; note: string; at: number }

export type Health = {
  prompts: number
  bigJobs: number
  confusedStreak: number
  signs: Sign[]
  shownLevel: number
}

declare module 'claude-code' {
  interface PluginState {
    'health-bar': { health: Shaped<Health> }
  }
}
