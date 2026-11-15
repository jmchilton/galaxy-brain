# Implementation debrief: wes_api_fixes_26_0

STATUS: **READY**. The head is `67305c6d0a1`: ten commits on `release_26.0` (`9ae7ab9c1df`), pushed to jmchilton. Fork CI was queued at hand-off.

This branch is stage 3 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md). It fixes the Galaxy WES bugs the demo's probes found (`~/projects/repositories/galaxy-wes-tes/docs/troubleshooting.md`, "Galaxy WES bugs"). The original implementation debrief, with the before-fix evidence and the reasons for each choice, is [earlier_drafts/1/implementation_debrief.md](earlier_drafts/1/implementation_debrief.md).

## How it got here

The branch was recovered and hardened on 2026-11-15:
1. The first hardening pass ran brain research, test challenges, performance, Codex, thermo-nuclear and baseline refactor. Those debriefs are in `earlier_drafts/1/`.
2. That pass's scope evaluation recommended a modest expansion. The branch as it stood was kept as `wes_api_fixes_26_0_alt_original_scope` (`0bbc3e55ae8`, [alts/original_scope.md](alts/original_scope.md)).
3. The expansion was implemented and reviewed ([implementation_rescope_debrief.md](implementation_rescope_debrief.md), [subagents/rescope_review.md](subagents/rescope_review.md)).
4. Every hardening step was rerun fresh. The second [scope evaluation](scope_evaluation.md) recommends keeping the scope as implemented.

## Commits

| Commit | What it does |
| --- | --- |
| `e16eaa804e8` | Test helpers `_list_wes_runs` and `_cancel_wes_run`. |
| `be3ffb8e6fd` | Refactor: one `_require_user` anonymous check in `submit_run` and `list_runs`. No behavior change. |
| `7ec82f1d600` | Refactor: split `_get_or_create_history` into `_get_requested_history` and `_create_history`. No behavior change. |
| `3f94ec3906b` | `use_cached_job` accepts a JSON boolean or `"true"`/`"false"`. Anything else returns 400; before, a boolean caused a 500. |
| `06e8d39d589` | Anonymous run-scoped requests return 403 instead of 500. `list_runs` checks auth before decoding the token. Error messages show encoded ids. |
| `03adee74219` | Cancelling a `completed`, `failed` or `cancelled` run returns its `run_id` and leaves its state unchanged. |
| `df4317ee032` | A rejected submission leaves nothing behind. Parameters and a requested `history_id` are validated before the workflow import. If invocation fails after the import, the imported workflow and any new history are soft-deleted. |
| `93d55d7dab5` | `WorkflowInvocation.to_dict` reports an omitted optional parameter output as `null` instead of `{"__class__": "NoReplacement"}`. This covers both the native invocation API and the WES run log. |
| `5581d4cfcb4` | WES lists end with `next_page_token: ""` (WES 1.1). An incoming `""` returns the first page. |
| `67305c6d0a1` | Service-info `auth_instructions_url` is `<galaxy base URL>/user/api_key` instead of `"TODO"`. |

## Choices

- **Cancel on a terminal run is a no-op.** WES terminal states are final, and the spec lists no error for this case. The trade-off is that a WES cancel no longer cleans up paused jobs left in a completed run. Galaxy's own `DELETE /api/invocations/{id}` still does.
- **Rejected submissions roll back and then soft-delete.** They don't purge, because `HistoryManager.purge` raises when user dataset purge is disabled. Validation that only `invoke_workflow` can do (required inputs and the like) still runs after the import, so cleanup covers that case.
- **The `NoReplacement` mapping is native, not WES-only.** This is the re-scope. Storage, model-store export and workflow recovery read the model directly and keep the marker. Nothing in `lib/` or `client/src` reads the marker from the API.
- **Release-branch restraint.** Several things were left for `dev`: router-level `DependsOnUser`, `WorkflowsManager.get_invocation`, `InvocationState` constants, file splits, a shared `NoReplacement` predicate, and rejecting raw `history_id`s. See [thermo_nuclear_review.md](thermo_nuclear_review.md). Each one changes error codes, messages or admin semantics, or rewrites code that predates the branch.

## For the PR

- Flag the native API change: `GET /api/invocations/{id}` `output_values` now returns `null` where it used to return the marker dict.
- WES clients that loop `while next_page_token is not None` would re-fetch page 1. The docs now say to stop on an empty token. Every surveyed client stops on any falsy token ([performance_challenges_debrief.md](performance_challenges_debrief.md)).
- A request with a bad or foreign `history_id` now gets its 404 before anything is imported. An anonymous `GET /runs` with a junk token gets 403 instead of 400.
- [scope_evaluation.md](scope_evaluation.md) lists possible splits.

## Tests

API tests, one per pytest run, with the worktree `.venv`. Each new or changed assertion failed with its fix reverted, at its own assertion, and passes with the fix ([test_challenges_debrief.md](test_challenges_debrief.md)). The WES tests whose code paths changed were rerun after each code change in the thermo and refactor passes, and the two refactor commits were tested on their own.

Linting:
- `make format` leaves the tree unchanged.
- `ruff`, `flake8` and `mypy` (with the pinned typecheck stubs installed) are clean on `services/wes.py`, `model/__init__.py`, `test_wes.py` and `test_workflows.py`.

Codex found nothing in either pass. The performance pass found nothing to fix.

Fork CI was green on the original `85f9b2b42be`. Runs for `67305c6d0a1` were queued at hand-off.

## Not done

- Bug 5 (completed runs with paused jobs report EXECUTOR_ERROR) is on the stacked child branch [`wes_run_state_executor_error_26_0`](../wes_run_state_executor_error_26_0/index.md) and needs John's decision. That branch still sits on the old head `85f9b2b42be` and needs rebasing onto `67305c6d0a1`. Its interaction with the cancel no-op is in [scope_evaluation.md](scope_evaluation.md).
- These are separate PRs touching shared invocation code: integer input validation (bug 7), the native `new_history_name` leak, and the missing-input message that names a database step id.
- DRS, the remaining service-info defaults and the WES "honesty" fields are design or config work.

## Snapshot

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/wes_api_fixes_26_0/differential-review/snapshots/20261115T122108Z-hardening-67305c6d0a10.json
  hardening @ 67305c6d0a10 vs origin/release_26.0 (merge-base 9ae7ab9c1df6)
  first snapshot: 10 commits, 5 files, 36 hunks
```
