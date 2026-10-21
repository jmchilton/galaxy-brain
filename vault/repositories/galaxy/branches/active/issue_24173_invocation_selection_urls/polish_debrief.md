# Polish debrief — 2026-10-20

Polished `issue_24173_invocation_selection_urls` from `a33bfd0d049` to `c69f43e3222` (six commits on top, no history rewrite) and wrote the [PR description](pr_description.md), [titles](pr_titles.md) and [tags](pr_tags.md). Moved to `branches_ready_for_final_review`. No PR opened, nothing posted.

## CI

Fork CI on `a33bfd0` was still queued at start, and the newer heads are pending. The prior evaluated head `978ff1c925` had these reds, all unrelated:

- Client Unit Testing: `FormBoolean`, `FormCheck` and `FormOptionalText` fail. They fail locally on this head too, but neither branch nor prep touches Form code; `dev` fixed them in `7db3ecd6783` ("Feed controlled checkbox updates back into form tests"), 480 commits after this stack's base.
- Playwright, Integration Selenium, first startup, Tool form harness: `Failed to restore cache entry ... galaxy-static-<sha>` (cache eviction, before tests ran).
- Toolshed: setup errors in `TestShedRepositoriesApi`.
- Test Galaxy release script: fork-only failure.

The browser checks never ran in fork CI on any head. Rebasing the stack onto current `dev` would clear the Form reds; it wasn't done here (it rewrites prep too).

## Checklist (GENERAL + WORKFLOW_RELATED)

First pass ([evaluation](subagents/polish_checklist.md), since overwritten by the second) failed two items and raised judgement calls:

- **Banner regression.** The selection writer drops `success` and the route no longer remounts, so the "Successfully invoked workflow" banner was torn down mid-fade. Fixed by capturing `success` once (`a8626fd29b0`). `test_simple_execution` now asserts `success` left the URL and `.donemessagelarge` is still mounted: absent without the fix, present with it. The banner fades by CSS after 3s by design, so the test checks presence, not visibility.
- **Baseline-only `Analysis.test.ts`.** Its one remaining test passes on prep. John chose to delete it (`69e09784c1f`).
- **Stale URL keys** (John: strip them). Unknown `job`/`output`/`step_tab` are cleared once the step is terminal, and unknown workflow outputs once the invocation is terminal; running steps keep them (`6f6f8686774`). Red→green vitest.
- **No `output=` coverage** (John: add E2E). `test_output_urls_expand_outputs` exposed a real bug: GenericItem scrolled while the target was a loading placeholder, so the loaded dataset sat below the fold (1040px in a 1000px window, in the inner `.tab-content-container`). Now it scrolls with `block: "start"` and skips items the user just toggled (`bea9fe79755`). Red with the old code, green with the fix.

Second pass: all items pass except the human-read item (left for John) and two judgement calls (no error message on bad links; thin user-demand evidence). It caught a needless `scrollIntoView` stub whose `afterEach` deleted happy-dom's native method; removed along with GenericItem's `?.` call, and a spy test now covers click-vs-link scrolling (`a161b912cd7`).

## Strengthening round

The strengthening subagent found no missing feature work. Applied:

- Fixed description claims: "no touched file crosses 1,000 lines" (two were already over), an agent-cited `GTabs` rationale, a self-contradicting "None." answer, prep "baselines" (one commit is a screenshot wait), red-run claims scoped to what was run, #18101 softened.
- New tests (`c69f43e3222`): `job` removed after closing the dialog (browser), Share copies the routed selection, subworkflow error links carry `step_index` (both red without their fix).
- New lead screenshot `invocation_mapped_job_table.png` (filter and page 2 visible), recaptured all mapped-job screenshots on this head (Oct 15 ones in `earlier_drafts/4/`).
- Added highlighted answers for bare links, history behavior and REST API scope.

Left over:

- **Evidence of demand is thin:** the issue was filed by John, no reactions. Linking a real user request would strengthen the pitch.
- **Scope-widening ideas (not done):** a message for unresolvable selectors, linking the job page's invocation row to the step, syncing the Inputs tab, named-tab `GTabs`.
- **Unchecked UX quirk:** on the Steps tab, clicking a tab or output in a non-selected card selects that step, which may scroll its header to the top. Worth a manual look.
- **History cleanliness:** `Analysis.test.ts` is added in `c978b652038` and removed in `69e09784c1f`, and `a8626fd29b0` fixes a regression from `c978b652038`. Fold these if the PR won't be squashed.

## Validation

- Client: 33 files / 162 tests across invocation, graph, history content and analysis suites before the last two commits. After them, the touched suites pass: 21 files / 82, then 13 GenericItem and 12 Share/Overview tests. Full `vue-tsc` clean; eslint and prettier clean.
- Browser (Playwright, headless, one at a time): `test_simple_execution`, `test_output_urls_expand_outputs`, `test_step_url_scrolls_steps_list`, `test_mapped_job_selection_urls` and `test_job_details` pass.
- Ran against this worktree's own Galaxy on 8081 and Vite on 5175, because another session held 8080/5173. That needed a local, gitignored `config/galaxy.yml` binding gunicorn to 8081.
