# Polish debrief

Polished 2026-10-17. Head went from `79dccaf6f84` to `39e4b4e9f6f` (force-pushed to `jmchilton`). The only code change is one unit test folded into the server commit (now `004f6cb8a82`).

## Steps

1. **CI.** Fork CI on `79dccaf6f84` was still queued, with no failures to diagnose. The push restarted it on `39e4b4e9f6f`.
2. **Checklists.** GENERAL plus WORKFLOW_RELATED, since the change touches the workflow run form and collection map-over. A subagent passed every item. It had one nit: the baseline commit message says "as on dev". I left it, because dev splits the page the same way.
3. **Description.** Written to [pr_description.md](pr_description.md). It leads with the before/after Extract dataset screenshots (`02`, `07`). It covers the paging loss in prose and points to the issue for the full table, and puts the known gaps in a collapsed section.
4. **Strengthening subagent.** Three tasks, all applied:
   - **No unit test covered the server fix.** Added `test_accumulate_finishes_a_multi_match_row`: a two-entry row at the limit, with and without trailing rows, and an offset that lands mid-row. It's red on `release_26.1` pagination at the first assertion (the issue's `has_more: false` case) and green on the branch. I folded it into `599d0978a83` with an autosquash, so the history shape stays the same.
   - **An untested claim** ("picks made in the form survive client-side rebuilds"). Dropped the sentence rather than add a test.
   - **Wording.** The "server already runs it" sentence now cites the existing `list` → dataset map-over API tests along with the new `list:list` one. The risk advice calls the server change a two-line loop change, not a deletion.

   I added bold-italic sentences above the fold for three likely misreadings:
   - it's only a paging edge case;
   - the label is a feature, not the fix;
   - it fixes seeded/rerun values or drag-and-drop.
5. **Checklist re-check.** A targeted subagent re-checked the items the new test touches (implementation-agnostic, placed in the fix commit, no archeology). All pass, and it confirmed the red result on base.
6. **Titles and tags.** [pr_titles.md](pr_titles.md) has four titles, each prefixed `[26.1]`. [pr_tags.md](pr_tags.md) has `kind/bug`, `area/UI-UX`, `area/tool-framework` and `area/dataset-collections`.

## Verification

- `test_parameter_pagination.py`: 3/3 on the branch. The new case fails against base `pagination.py`.
- Pre-commit hooks (black, ruff, flake8, prettier) passed on the rebased commits.
- The client and API tests weren't re-run, because only that unit test file changed. The final tree differs from `79dccaf6f84` only in that file.

## Left over (scope questions for John)

- Should `/build` echo `map_over_type`, so seeded and rerun values keep a map-over pick? This overlaps #24219.
- Should client search stop matching the "(one job per …)" suffix?
- Should 26.1 get dev's badge (`label-area` slot) instead of plain-text labels?
- Drag-and-drop map-over matching stays with #24220.
