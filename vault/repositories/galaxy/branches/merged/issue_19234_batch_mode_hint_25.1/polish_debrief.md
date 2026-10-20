# Polish debrief — issue_19234_batch_mode_hint_25.1

**Ready for final review.** Head `22a10b10465` (was `954306b0bd5`), pushed to `jmchilton`. Wrote [pr_description.md](pr_description.md), [pr_titles.md](pr_titles.md), [pr_tags.md](pr_tags.md).

## Steps

1. **CI:** fork run on `954306b0bd5` all queued/pending, nothing failed. Not yet evidence of green.
2. **Checklists:** GENERAL + WORKFLOW_RELATED (collection map-over). Subagent: all items pass; human-read item left unchecked.
3. **Strengthening subagent** found:
   - Before/after table row 2 was wrong: on 25.1 a `list:list` on a multiple `data` input shows *no* hint (the `data_multiple` collection variant is `BATCH.DISABLED`, which hid the whole info div). Fixed; both rows are now "(no hint)" on base.
   - Baseline commit had fixed two unclosed `[title='Multiple datasets'` selectors in existing tests. This was the only merge-forward conflict into `release_26.0` (26.0 fixed them differently in `FormData.test.ts`). Reverted in `22a10b10465`; jest 30/30, `git merge-tree` into `release_26.0` now clean.
   - "FormData code identical on 26.0" was overstated (one import path differs, test file renamed `.ts`). Now "hint logic unchanged on 26.0".
   - "Why 25.1" moved above the fold into a highlighted sentence.
4. Checked one more edge: `sample_sheet` can't be a `map_over_type` (only an outer type; `map_over_type` is the inner subcollection), so no "sample sheet derived" unit.

## Not done / left over

- No "before" screenshot of base 25.1; the table says "(no hint)" instead. Would need a base client build + Selenium run.
- Did not verify whether `workflow_data` options on the workflow run form ever carry `map_over_type` (would decide whether the hint appears there).
- Pre-commit's trailing-whitespace strip in `navigation.yml` (`history_panel`) kept; file is touched anyway, merges cleanly.
- Checklist subagent not re-run after `22a10b10465`: the revert only removed a drive-by and doesn't change any answer.
- Merge-forward: new tests land in 26.0's `FormData.test.ts`; strict TS on `wrapper.emitted().input[0][0]` may need `!` there (unverified).
