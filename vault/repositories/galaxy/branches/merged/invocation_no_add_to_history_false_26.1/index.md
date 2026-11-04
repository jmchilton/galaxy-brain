---
upstream_base_branch: release_26.1
pr: 24671
---
# invocation_no_add_to_history_false_26.1

Status: `merged` — PR [#24671](https://github.com/galaxyproject/galaxy/pull/24671) merged 2026-11-03 into `release_26.1` (`7e793f145b2`); in `dev`. mvdbeek added `b46bd904f3f` (schema description of `no_add_to_history`) and `a4e0adbbcd6` (assert `inputs` used when `ds_map` empty) before merging; head `a4e0adbbcd6`. Worktree removed 2026-11-04.

Honor explicit `no_add_to_history: false`/`null`, and accept a `null`/`{}` `ds_map` next to `inputs`. The bugs date to 2024 and are exposed by the published api-client types. Standing-branch child of [issue_20900_invocation_validation](../../../../../agents/gx_standing/standing_branches/issue_20900_invocation_validation/index.md).

## Rebase — 2026-11-02

`050ada8acae` → `690e27233e1`. One mechanical conflict in `test_workflows.py`: the new test sat next to #24171's nonexistent/library/inaccessible input tests; kept both. Patches unchanged apart from context. Ruff, black, isort clean. API: 8 passed; with `release_26.1`'s `run_request.py`, the 4 predicted cases fail (null/false `no_add_to_history`, null/empty `ds_map`).

Original backport commits: `3ed01f6e317` (cherry-pick of `9e160f5cbde`; the test-file conflict pulled in 26.2-only neighboring tests, resolved by keeping only `test_run_no_add_to_history`), `9ef7c304d7c` (clean cherry-pick of `33be985c49e`). Diff vs base: `run_request.py` +2/-2, `test_workflows.py` +52.

Initial local API: `test_run_no_add_to_history` and `test_run_inputs_with_ds_map`, 8 passed on `release_26.1`. Fork CI pending.

Worktree: `~/projects/worktrees/galaxy/branch/invocation_no_add_to_history_false_26.1` (created with `git worktree add`, `.venv` symlinked to the main clone's).

## Morning refresh — 2026-10-16

Fork head `9ef7c304d7c92dacf05668716ac146e3c3b0d451` has passing relevant server/API coverage. API and other server checks pass; all browser/harness reds stop at Restore client cache. The release-script red rejects historical master VERSION_MINOR = None, outside this two-server-fix backport. These failures do not exercise the server-only change. Promoted to `branches_implemented` on diagnosed unrelated reds; browser cache misses are unexecuted tests, not passing browser coverage.

Requested failed-job reruns for diagnosed unrelated failures: [run 38786628159](https://github.com/jmchilton/galaxy/actions/runs/38786628159), [run 38786627996](https://github.com/jmchilton/galaxy/actions/runs/38786627996), [run 38786627778](https://github.com/jmchilton/galaxy/actions/runs/38786627778), [run 38786628207](https://github.com/jmchilton/galaxy/actions/runs/38786628207), [run 38786627559](https://github.com/jmchilton/galaxy/actions/runs/38786627559). All requests accepted; reruns are pending evidence, not passing results or recovered cache coverage.

## Polish — 2026-10-16

Base: `release_26.1` at `b2b1e1deeeebf84f16d33fb8831f42987f77267a`. Final published head: `050ada8acaea67f141df241523c7fa3f270fb22a`.

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Polish debrief](polish_debrief.md) · [Checklist evaluation](checklist_evaluation.md) · [One strengthening review](strengthening_review.md)

Conflict-free pre-polish rebase; every commit patch unchanged. Independent checklist and one strengthening round pass with no design decision or scope expansion. 8 focused API cases pass; formatting/whitespace checks pass. Fresh fork CI is pending. Human-read item remains unchecked; no SHA approval/title choice assigned and no PR opened.
