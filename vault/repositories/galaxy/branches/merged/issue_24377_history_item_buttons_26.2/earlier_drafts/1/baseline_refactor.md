# Baseline refactor

No refactoring of the base branch was performed.

- The only candidate was `db138499905` (fixed sleeps in `test_dataset_change_dbkey` replaced with waits). It preserves behavior and doesn't overlap `1755ced7f18`: its hunks are in `test_dataset_change_dbkey`, and the fix's are in the button helpers and `navigation.yml`. But the fix doesn't build on it. Moving it below the fix would only change commit order, and it can be dropped on its own in either position, so it stays on top as a polish commit.
- The rest of `1755ced7f18` is the fix itself:
  - The `info_button` and `edit_button` selector changes are dead on the base, since nothing uses them, so a separate commit for them would have nothing to preserve or exercise.
  - The `details_expanded` selector exists only for the restored hover.
  - Dropping the unused `rerun` tooltip entry is too small to split out.
- History unchanged: HEAD is still `db138499905` on top of `1755ced7f18`.
