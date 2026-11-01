# Normal review 1 (after implementation)

Reviewed `5e18f770488` on `f244884bee1`. No blockers and nothing security-sensitive. I acted on the Space/Firefox finding in `1886353dd23`: `ButtonPlain` now activates on Space keyup, like a native button, and CellAction closes on the same keyup. I couldn't test that in a real browser, because the Playwright browsers on this host are missing GTK/ATK libraries. The keyup change is defensive either way.

Not acted on:

- **Move and Delete with index-keyed cells.** `CellEditor.vue` uses `:key="cellIndex"`, so after Move, focus lands on the swapped-in cell's actions button, or on `<body>` if that cell is collapsed. After a confirmed Delete it can also land on `<body>`. This was already the case before the branch and is still better than before. It needs stable cell keys or explicit focus handling in CellEditor, which is out of scope for a release fix.
- **`.popper-close` delegation in `usePopper.ts`.** It's left in place. Popper's own header Close button still carries the class, and its `@click="close"` restores focus first. A dev-only cleanup could drop the delegation.

<details>
<summary>Full review</summary>

1. Medium, untested: Space on an option may reopen the menu in Firefox. `close()` moves focus to the trigger during Space keydown, and Firefox has historically clicked the focused button on Space keyup. Enter is safe because the keydown `.prevent` suppresses keypress. Suggested: verify, or close on keyup / defer the focus move.
2. Low, already true before this branch: Move and Delete can leave focus on the wrong cell or on `<body>` (`CellEditor.vue:7` index keys, `CellWrapper.vue:27` `v-if="toggle"`). Clone is fine. Suggested: follow-up.
3. Info: leaving `doCloseElement` is fine. It still serves the header Close button, which restores focus first.

Checked and fine: mouse vs keyboard focus return, event order in both menus, the ButtonPlain Enter `.prevent` (safe for VisualizationPanel), `defineExpose({ close })`, test quality (real cancelable events, `defaultPrevented` and `activeElement` asserts, baseline commit pins only prior behaviour), and the `release_26.2` base (26.0 and 26.1 lack the focus-restoring `close()`). 65 vitest tests passed.

</details>
