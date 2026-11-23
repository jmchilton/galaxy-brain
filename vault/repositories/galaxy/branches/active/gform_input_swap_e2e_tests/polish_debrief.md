Run via Claude Opus 5.5.

# Polish debrief

READY for final review at `c75f4c0516a`; no code changed in polishing, only the description and support files were written.

- **Worktree** was missing; recreated at `~/projects/worktrees/galaxy/branch/gform_input_swap_e2e_tests/` from `jmchilton/gform_input_swap_e2e_tests`. No `.venv` and no client deps (bootstrap not run), so no E2E or Vitest reruns this phase. Screenshots from the screenshot step were lost with the old worktree; the description has none.
- **CI**: fork CI green at head (Client linting, Client Unit Testing, Playwright, Integration Selenium, startups, Toolshed). Python linting green on the pre-refactor `7cd72c83348`.
- **Checklist** ([pr_checklist.md](pr_checklist.md)): all six items pass.
- **Check Galaxy**: isort, black, ruff clean on the three Selenium files; `tox -e mypy` clean (2630 files).
- **Strengthening round** fixes applied to the description: dropped an unbacked claim that the range test checks `hid>1 hid<4` search text; "seven specs #24801 wrote" → "assertions #24801 added to seven specs" (`VaultSecret`, `SampleSheetGrid` predate it); added a highlighted line on where each removed check went; named `test_histories_list.py` for `test_advanced_search`.

## Left over (needs a venv to verify)

- Add a search-text assertion to `test_advanced_filter_index_range`, then restore the claim.
- `VaultSecret.test.ts` drops `disabled` while keeping `type="password"`; description justifies masking by secret exposure. Restoring `disabled` is an option.
- Rebase: `dev` is 38 commits ahead of the base.

```
created .../differential-review/snapshots/20261123T000615Z-polishing-c75f4c0516a0.json
  polishing @ c75f4c0516a0 vs origin/dev (merge-base 7e7dfea55355)
  since 20261122T235626Z-revision-c75f4c0516a0:
    commits: 7 same, 0 rebased, 0 changed, 0 new, 0 dropped
    hunks:   38 carried, 0 changed, 0 new, 0 dropped
```
