I moved the Add Selected E2E helper commit up so it sits right after the `start()` helper commit, ahead of the five product fixes. Nothing else was split, folded or edited.

- Base is still `d2d1dcd883c`.
- The final tree is identical to the old head: `git diff 7d69fd884f0 1fccf61f2d5` is empty.
- New head is `1fccf61f2d5` (was `7d69fd884f0`). I force-pushed it to `jmchilton` with an explicit lease on `7d69fd884f0`.

## New order

| # | SHA | Commit |
|---|---|---|
| 1 | `4ebd3c2e61e` | Baseline tests: API library setup and multi-dataset staging |
| 2 | `bae974ba978` | Baseline tests: regular user and list into a picked history |
| 3 | `56e48bb47c5` | Baseline tests: subfolder navigation and select-all |
| 4 | `6e27939f492` | Baseline tests: vGTooltip focus behavior |
| 5 | `4a7ae0dad6a` | E2E helper: wait for Start to be enabled |
| 6 | `12469fe689b` | **E2E helper: wait for Add Selected to be enabled** (was #10) |
| 7 | `f0bf7c10f28` | Fix: folder contents 500 without a description |
| 8 | `b79a7f72a06` | Fix: folder contents 500 during a library upload |
| 9 | `26d04fbf165` | Fix: truncate long target history names |
| 10 | `ef9e82334fc` | Fix: hover tooltips on pointer/programmatic focus |
| 11 | `1fccf61f2d5` | Fix: don't duplicate library datasets in a collection |

- Commits 1-5 keep their SHAs, so the Baseline checks below apply to them as they now stand.
- `git range-diff` shows every other commit unchanged apart from its SHA.

## Why

- **The Add Selected wait is a test-harness hardening, like the `start()` wait.** It isn't a product fix, and none of the fixes depend on it. The E2E steps that fixes 9-11 add all run through `stage_data_library_datasets`, so the race fix should land before them. Grouping the two helper commits also makes the boundary between test infrastructure and the fixes clean for splitting PRs.

## Considered, not changed

- **`LibraryPopulator.remove_library_dataset_restrictions` / `fetch_to_folder`** (in Baseline #1). These are test-populator refactors. A separate commit would either sit ahead of the Baselines, which breaks the keep-first rule, or be mislabelled. Their callers are in the same commit, so they stay.
- **`MockTrans.get_current_user_roles`** (in fix #8). This is three lines of mock support that exist only for that fix's unit test. Splitting it out would create a commit with no caller.
- **Moving the helper commits above the Baselines.** I rejected this because it breaks the ordering rule. The Baselines pass without them anyway (see below).

## Checks requested by the coordinator

**The Baseline commits pass on their own, on unfixed product code.**
- I checked out `6e27939f492` and restarted gunicorn 8092 from it, so the server ran the unfixed `schema.py` and `folders.py`. Vite served the unfixed client.
- `TestUploadActivityDataLibrary`, all 3 tests, including the list test:
  - Playwright: 3 passed.
  - Selenium: 3 passed.
- This run has neither helper wait (Start or Add Selected), and the list test still passes. It relies on the Baseline-era workarounds:
  - folder description set
  - short history name
  - no tooltip or duplicate-HDA assertions
- Vitest at `6e27939f492`, with the galaxy-ui alias config, on `vGTooltip.test.ts`, `TargetHistorySelector.test.ts` and `useUploadBatchOperations.test.ts`: 29 passed.
- For Baselines #1-3 I only checked by reasoning plus `pytest --collect-only` on `test_upload_activity.py` and `test_history_contents.py`.
  - Collection is clean at each of them.
  - Each later Baseline only adds or extends tests, and #4 passes in full.

**Each fix's test goes red without its own fix.**
- I reverted one fix's product file at a time on head. No later commit touches those files, so this is equivalent to reverting at each fix commit.
- I confirmed each failure was the intended assertion:

| Fix | Test | Red without the fix |
|---|---|---|
| #7 schema `str \| None` | API `test_index_folder_without_description` | Run against the baseline server: 500. The log shows the `LibraryFolderMetadata.folder_description` validation error, not the in-progress bug. `fetch()` waits for the job. |
| #8 `folders.py` inner join | unit `test_library_folder_contents_service.py` | `AttributeError: 'NoneType' object has no attribute 'dataset'`. Only `folders.py` was reverted; the mock was kept. |
| #9 `TargetHistorySelector.vue` | E2E list test (Playwright) | "change link overflows the banner by 193.8px" |
| #10 `vGTooltip.ts` | E2E list test (Playwright) | the `assert_absent` on the "Change target history for this upload" tooltip |
| #11 `useUploadBatchOperations.ts` | E2E list test (Playwright) | the dataset-id assertion: 2 extra HDAs |
| #11 `useUploadBatchOperations.ts` | vitest | the two-step retry test: 1 failed |

- Helper commits #5 and #6 have no red test of their own. They harden against races.

## Tests run

All runs were sequential, against gunicorn 8092 and Vite 5181.

**At new head `1fccf61f2d5`** (head-code server):
- E2E `TestUploadActivityDataLibrary`:
  - Playwright: 3 passed.
  - Selenium: 3 passed.
- Vitest with a temporary config aliasing `@galaxyproject/galaxy-ui` to this worktree's `packages/ui/src/index.ts` (deleted afterwards):
  - `vGTooltip.test.ts` plus `TargetHistorySelector.test.ts`: 26 passed.
  - I confirmed the alias resolves locally: removing the `:focus` conjunct turned 5 tests red.
- `useUploadBatchOperations.test.ts`: 3 passed.
- API `test_index_folder_without_description` and `test_inheritance_chain_library_to_histories`: 2 passed. Nobody had run the second one before, and it's the existing test Baseline #1 rewrote.
- Unit `test_library_folder_contents_service.py`: 1 passed.
- The red checks in the table above.

**At Baseline `6e27939f492`** (baseline-code server): the runs listed above.

**After the baseline runs:**
- I restarted 8092 from the branch head and confirmed it with `/api/version` and a passing `test_index_folder_without_description`.
- The worktree is on `selenium_upload_data_library` and clean.
