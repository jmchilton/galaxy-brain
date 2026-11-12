Run via Claude Opus 5.5 at low effort.

Thermo review of `frame_index_range` (`ca67b45` vs `origin/main` `d00e1f7`). Acted on: the resolution chain in `unresolved_frame_references` moved into `_FrameRefCheck.problem` (early returns, checks built once per workflow) in `3530ea0`. No behavior, message, fixture or expectation change.

Not acted on:
- `_format2.py` at ~915 lines is close to the 1k limit; the branch shrinks it slightly, so no split now.
- Field-specific config (`label_kind`, `index_noun`) could live on `FrameField` as a module-level mapping; two entries don't justify it.

<details>
<summary>Full review</summary>

## Structural

- **Spaghetti in the loop (fixed).** `if ... pass / elif ... / elif ...: if ...` with a `problem = None` sentinel encoded "labels win, then digit-index, else unknown label, ints range-checked, bools/others skipped" implicitly. Now `_FrameRefCheck.problem(ref) -> str | None` states that order with early returns; the loop just formats messages.
- **Per-frame check construction (fixed).** Labels and counts are workflow-level; only `refs` varied per frame. `refs` dropped from the NamedTuple; entries read via `getattr(comment, check.field)`, since `FrameField` names the attribute.

## Checked, fine

- `_index_in_range` guard: length after stripping zeros vs digits of `count` is a correct cheap pre-filter; `"0"` → `""` length 0, still range-checked.
- File size: under 1k before and after.
- Tests: `pytest tests/` 984 passed; ruff, flake8, black, mypy, pyrefly clean.

## TS port

Nothing new to mirror; same resolution order as `ca67b45`.

</details>
