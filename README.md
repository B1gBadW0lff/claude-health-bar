# health-bar

A small Claude mod that tells you when a chat is getting too long and Claude is getting less sharp.

It shows a thin coloured bar above the prompt box (terminal), and a one-line bar under the reply whenever the level changes (every app, including the main Claude app). It only changes when the level changes:

🔵 Fresh · 🟢 Warm · 🟡 Drifting · 🟠 Tired · 🔴 Fussy · ⚫ Done

It counts with plain code, no AI tokens: em dashes, very long replies, long chats, and you saying "huh", "what?" or "am lost" twice in a row. Claude also reports its own slips (a broken rule, a forgotten decision, a repeated mistake) and big jobs it finished. Type `/health` to see the bar and what it counted.

## Install

At the prompt of a terminal session:

```
/plugin install health-bar --marketplace B1gBadW0lff/claude-health-bar
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```
claude plugin install health-bar --marketplace B1gBadW0lff/claude-health-bar
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `B1gBadW0lff/claude-health-bar`, then Add plugin.
