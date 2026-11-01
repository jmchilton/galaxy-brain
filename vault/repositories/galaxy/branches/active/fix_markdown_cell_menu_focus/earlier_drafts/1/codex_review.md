Run via gpt-6.1-sol.

# Codex review

Codex reviewed `upstream/release_26.2...1886353dd23` and reported one finding. It's confirmed, but I haven't acted on it in this branch: it is the same pre-existing Move/collapsed-cell focus loss that [normal review 1](../../subagents/normal_review_1.md) raised. It's left for the scope evaluation to decide.

Codex's shell sandbox (bwrap) couldn't start inside this host's sandbox, and running it unsandboxed wasn't permitted. The diff and the surrounding files at `1886353dd23` were inlined into the prompt instead. Codex saw `CellAdd.test.js` only as diff excerpts and didn't run tests.

Not acted on:

- **P2: moving an expanded cell past a collapsed cell still drops focus to `<body>`.** CONFIRMED at `CellEditor.vue:7` (`:key="cellIndex"`), `CellEditor.vue` `onMove` (swaps whole cells, including `toggle`), and `CellWrapper.vue` `v-if="toggle"` around `CellAction`. `close()` focuses the old wrapper's actions button, then the re-render removes it. This predates the branch, where focus was lost on every selection. A fix belongs in CellEditor, either with stable cell keys or by focusing the moved cell's actions button after the move.

<details>
<summary>Raw findings</summary>

```json
{
  "severity": "P2",
  "category": "correctness",
  "file": "client/src/components/Markdown/Editor/CellAction.vue",
  "line": 26,
  "title": "Moving an expanded cell past a collapsed cell still drops focus to body",
  "failure_scenario": "Expand the first of two cells and leave the second collapsed. Open the first cell's actions menu with the keyboard and choose Move Down. Focus briefly returns to the first wrapper's actions button, then that button is removed when the swapped cells render, leaving focus on body instead of the moved cell's actions button.",
  "confidence": "certain"
}
```

</details>
