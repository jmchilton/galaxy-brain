Run via gpt-6.1-sol.

# Codex review (re-harden)

Codex reviewed `upstream/release_26.2...f77c09c11f7` and returned one P2 finding. I confirmed it and fixed it in `e83597521bd`. Codex's own shell sandbox (bwrap) can't start on this host, so the diff and the full files at that head were pasted into the prompt. Codex didn't run any tests.

Nothing was left unaddressed.

One residual edge case. If you hold Space, tab to another option and release, CellAction's `nav` still closes the menu on that keyup and returns focus to the trigger, even though `ButtonPlain` no longer selects anything. That's a harmless dismissal, so I left it.

## Finding

**P2: a Space release activates a button that never received the press.** CONFIRMED.

`ButtonPlain.vue` emitted `click` on any Space keyup. Holding Space on Clone, tabbing to Delete and releasing triggered Delete. Before this branch, activation happened on keydown, so this couldn't happen.

**Fix:** `ButtonPlain` now records a Space keydown on itself, activates only on the matching keyup, and forgets the press on blur, the way a native button does. It has a red-to-green test.

<details>
<summary>Raw finding</summary>

```json
{
  "severity": "P2",
  "category": "correctness",
  "file": "client/src/components/Common/ButtonPlain.vue",
  "line": 9,
  "title": "Space release activates a button that never received the press",
  "failure_scenario": "Focus Clone in the cell actions menu, hold Space, press Tab to focus Delete, then release Space. Delete receives keyup and opens its confirmation dialog even though Space was pressed on Clone. Previously, activation occurred on the original keydown.",
  "confidence": "certain"
}
```

</details>
