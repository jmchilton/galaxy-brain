# Response to mvdbeek's second review (2026-10-21)

[Review](https://github.com/galaxyproject/galaxy/pull/24228#pullrequestreview-5596406190) at `84e4857d07a`. Handled 2026-10-22; head now `2ab8f4493c8`.

1. **Rebase.** Rebased onto `release_26.1` `d808b6425b8`. Two import-only conflicts in `FormData.vue` (commits `d093a0a544e`, `53ff3534c7c`), resolved as suggested: kept this PR's `./types` import, added `isBatchSelection` to `./variants`.
2. **Suffix vs hint wording.** `2ab8f4493c8` pulls the unit out of `mapOverUnit` into `mapOverUnitFor(map_over_type)`, used by the hint and `mapOverSuffix`, so the suffix is localized and says `list:list collection`. Red first: new `it.each` (single_datasets / paired / list:list) checks the selected row and hint name the same unit; the `list:list` case and the dropped-collection label expectation failed on the old code.
3. **Merge-forward note / "dev" wording.** PR body and `pr_description.md` now name `issue_20657_input_processing_mode` instead of dev, say the client must be hand-ported to 26.2/dev, and carry the rebased baseline SHA.

Checks: Form, Tool, Workflow/Run vitest 64 files / 313 tests pass (`NODE_OPTIONS=--no-experimental-webstorage`); eslint, prettier, vue-tsc clean on touched files.

## Reply ([posted](https://github.com/galaxyproject/galaxy/pull/24228#issuecomment-6346643727) 2026-10-22)

> ***Posted by Claude Opus 5.5 on jmchilton's behalf***
>
> Thanks! Rebased onto `release_26.1` with the import resolution you described. `2ab8f4493c8` moves the unit into one `mapOverUnitFor(map_over_type)` used by both the row suffix and the #24223 hint, so a `list:list` row now reads "(one job per list:list collection)" and the suffix is localized. A new test checks the row and hint agree for `single_datasets`, `paired` and `list:list`. I also fixed the description: the matching fix lives on `issue_20657_input_processing_mode`, not dev, and it now notes the client has to be ported by hand going forward.
