Run via Claude Opus 5.5 at high effort.

**Recommendation: (a) keep scope as implemented, on `release_26.0`. No further expansion or contraction.** The first evaluation's expansion is fully in: the native `NoReplacement` → `null` fix in `WorkflowInvocation.to_dict`, the empty `next_page_token`, the shared anonymous guard with encoded ids, and a real `auth_instructions_url`. The hardening passes since then (test challenges, Codex, performance, thermo-nuclear, baseline refactor) found no scope gap. They did find follow-ups, but every one changes error codes, messages or admin semantics, or touches shared code outside WES. What's left on the probe list and in the review notes doesn't fit as a modest addition. The child bug-5 branch is waiting on John's decision. The native `new_history_name` leak, the shared missing-input message and integer validation (bug 7) are fixes to shared invocation code, each better as its own small PR with a native test. The remaining service-info items, the WES "honesty" work, DRS and the thermo refactors are design changes or `dev` work. Contracting would mostly bring back the WES-only special case the first evaluation removed. Two things should go with the PR, but neither is a scope change. The PR description and labels must flag the native invocation API change (`output_values` now has `null` where it had the marker dict). The child branch needs rebasing onto `67305c6d0a1`.

Evaluated at `67305c6d0a1`, base `origin/release_26.0` (`9ae7ab9c1df`). Ten commits, +369/−121: `services/wes.py` +158/−78, `model/__init__.py` +5/−1, `doc/source/dev/ga4gh_wes.md` +12/−8, and tests +194/−34 in `test_wes.py` and `test_workflows.py`. No generated code. The re-scope delta from `wes_api_fixes_26_0_alt_original_scope` is the four items above, two behavior-preserving refactor commits, and test tightening.

## Possible Decompositions

The commits, oldest first:

| # | Commit | Kind | Depends on |
| --- | --- | --- | --- |
| H | `e16eaa804e8` WES tests: add helpers for listing and cancelling runs | test-only | none |
| R1 | `be3ffb8e6fd` WES: share one anonymous-user check | refactor, no behavior change | none |
| R2 | `7ec82f1d600` WES: split history lookup from history creation | refactor, no behavior change | none |
| 1 | `3f94ec3906b` accept a JSON boolean for `use_cached_job` | 500 → 200/400 | none |
| 2 | `06e8d39d589` 403, not 500, for anonymous run-scoped requests | 500 → 403 | R1; H (`_cancel_wes_run`) |
| 3 | `03adee74219` cancelling a finished run leaves its state alone | WES semantics | H (`_cancel_wes_run`) |
| 4 | `df4317ee032` rejected submissions leave no workflow or history | leak fix | R2; 1 (the test's `"maybe"` 400; `_parse_engine_parameters` wraps 1's helper) |
| 5 | `93d55d7dab5` omitted optional parameters as `null` in invocation output values | **native API change** | none (model + native and WES tests) |
| 6 | `5581d4cfcb4` end paginated lists with an empty `next_page_token` | spec fix | H (`_list_wes_runs`) |
| 7 | `67305c6d0a1` point `auth_instructions_url` at the API key page | spec fix | none |

Each refactor travels with the fix that needs it: R1 with fix 2, R2 with fix 4. H lands with the first PR that contains fix 2, 3 or 6. When the PRs are split they conflict only where tests are appended to the end of `test_wes.py` and on adjacent lines of the docs' Errors table and Pagination section. The child branch `wes_run_state_executor_error_26_0` (bug 5) changes the WES state of `completed` runs and interacts with fix 3's `TERMINAL_GALAXY_STATES`, so it stacks on whichever PR carries fix 3.

1. **One PR (as implemented).** All ten commits. The refactors come first, so each fix's diff shows only its own logic (fix 4's `wes.py` diff fell from 172 to 126 changed lines). This is one review for about 490 changed lines, most of them tests.
2. **Two PRs: WES-only, then the native change.**
   - PR A: H, R1, R2, fixes 1, 2, 3, 4, 6, 7. Every change is confined to `services/wes.py`, the WES tests and the WES docs.
   - PR B, independent of A: fix 5 alone (`model/__init__.py`, one native test, one WES test). This isolates the one commit that changes the native invocation API on a release branch, so it gets its own label, release note and review. If B lands without A, its WES test still passes, because WES reads `to_dict`.
3. **Two PRs: crashes, leaks and spec fixes first, then semantics.**
   - PR A: H, R1, R2, fixes 1, 2, 4, 6, 7. Each change turns a 500 into a 4xx, stops an orphaned object, or corrects a field the spec defines. None changes how a successful run looks.
   - PR B, stacked on A for H: fixes 3 and 5. Both change what clients see for runs that are working (COMPLETE stays COMPLETE after cancel; `null` replaces the marker, natively too). The child bug-5 branch stacks on B.
4. **Three PRs, by kind of change.**
   - PR A, 500s and spec one-liners: H, R1, fixes 1, 2, 6, 7.
   - PR B, rejected-submission cleanup, stacked on A for fix 1: R2 and fix 4. The largest commit, which deserves its own look at the pre-import validation plus rollback-and-soft-delete design.
   - PR C, semantics, stacked on A for H: fixes 3 and 5. The child bug-5 branch stacks on C.
5. **Refactors first, then fixes.** PR 0: H, R1, R2, all behavior-preserving, reviewable as plain cleanup. Then any of options 1 to 4 for the seven fixes, minus the commits already landed. This adds a round trip on a release branch for three small commits, but it makes each later PR pure bug fix.
6. **One PR per fix.** Seven PRs, with H, R1 and R2 riding along as listed. Fix 1 must land before fix 4. The rest can land in any order. This creates the most merge-forward overhead for the least gain.

## Scopes considered

### As implemented (recommended)

Seven WES fixes on `release_26.0`, preceded by a test-helper commit and two refactor commits. Two 500s become 4xx (JSON-boolean `use_cached_job`, anonymous run-scoped requests). Cancelling a terminal run is a no-op. Rejected submissions validate before importing and clean up the workflow and new history otherwise. Omitted optional parameters are `null` in Galaxy's own invocation serializer, so the native API and WES both get `null`. Lists end with `""`. Service-info points `auth_instructions_url` at `/user/api_key`.

| Pros | Cons |
| --- | --- |
| • Covers every WES-local bug from the probes (1, 2, 3, 4, 6, the `next_page_token` minor item and the `auth_instructions_url` part of 10). It fixes the `NoReplacement` leak at its source, not as a WES special case. | • Changes a native API response (`GET /api/invocations/{id}` `output_values`) on a release branch. Nothing in `client/src` or `lib/` reads the marker, but an external script could. Needs a release note. |
| • The re-scope deleted special-case code (the WES-only marker loop, three ad-hoc anonymous checks) instead of adding to it. | • `""` at the end of a list makes a client that loops on `is not None` re-fetch page 1. No surveyed client does, and the old `null` broke spec-following clients the same way. |
| • Every fix has an API test that fails without it. Codex found nothing, and performance found nothing to change. The thermo-nuclear pass made one simplification and the baseline pass two refactors, all already in. | • The cancel no-op drops a side effect. WES cancel no longer deletes a completed run's paused jobs or a `failed` run's running jobs. Native `DELETE /api/invocations/{id}` still does. |
| • Merges forward cleanly. `dev` and `release_26.2` differ in `wes.py` only by typing. No open upstream PR overlaps. | • `services/wes.py` (1253 lines) and `test_wes.py` (1110) keep growing. The split is deferred to `dev`. |

<details>
<summary>Details</summary>

This is the first evaluation's "modest expansion", taken in full, riders included. The re-harden reviews raised nothing that changes scope. Their "Not acted on" lists are the candidates below, and each was deferred for a reason that still holds: it changes `err_code` values or messages on endpoints that already answer correctly, changes admin semantics, rewrites pre-existing lines, or crosses the `galaxy.model` → `galaxy.tools` layering. The rest are a PR description matter (the release note) or test coverage (the untested "not found" encoded id, which needs a minted id the API tests can't make cleanly).

The process says to lean toward a modest expansion when torn. I'm not torn here. The cheap, related, in-file items have all been taken. What's left is either shared code with its own native-API test story, or a design change.

</details>

### Further expansion: fold in bug 5 (`wes_run_state_executor_error_26_0`)

Squash or stack the child's mapping of `completed` runs with failed or paused jobs to EXECUTOR_ERROR into this PR.

| Pros | Cons |
| --- | --- |
| • It is the bug that matters most to WES clients. COMPLETE with failed or paused jobs makes a client report success. | • It reverses a documented choice ("a failed job does not make the run unsuccessful"), and its record asks John to decide: take it, narrow it (paused only, or failed workflow outputs only, D3) or drop it. |
| • It sits next to fix 3's terminal-state logic, so deciding them together saves a round. | • The project's preferred narrower rule points at `dev`. Folding it in would hold up seven uncontroversial fixes behind one design question. |

<details>
<summary>Details</summary>

It is already a stacked branch, which is the right shape. It only needs rebasing onto `67305c6d0a1`. With bug 5 taken, a `completed` run with paused jobs reports EXECUTOR_ERROR, and fix 3 makes WES cancel a no-op for it, so only native `DELETE` cleans up its paused jobs. That's consistent with WES's "terminal is final", but it is one more reason to decide the two together. The decision belongs on the child, not here.

</details>

### Further expansion: native `new_history_name` leak (sibling of bug 2)

Make native `POST /api/workflows/{id}/invocations` with `new_history_name` stop leaving an empty history when invocation validation fails (`_get_target_history` runs before `_normalize_inputs` in `workflow/run_request.py`).

| Pros | Cons |
| --- | --- |
| • It is the same class of bug as fix 4, on the sibling path. A reviewer may ask about it. | • It is shared invocation code that handles batch expansion (one history per parameter set), so cleanup has to track several histories. That is not a few lines. |
| • After the thermo-nuclear change, WES looks up a requested history before the import, so the native path is now the only one that leaks. | • WES doesn't route through `new_history_name`, so fixing it shrinks nothing here. It is cleaner as its own `release_26.0` PR with a native test. |

### Further expansion: missing-input 400 names a database step id

`build_workflow_run_configs` says `input step '25'` (`step.id`) where the client knows the step index or label (`run_request.py:151`).

| Pros | Cons |
| --- | --- |
| • About one line, and fix 4's test reaches this exact error through WES. | • It isn't WES code and isn't touched by the branch. It changes a message every workflow API returns, so it needs its own native test. |
| • The same kind of polish as the encoded-id messages the branch already fixed. | • It is cosmetic. Folding it in would park the branch for John's decision over a message string. A separate tiny PR serves it better. |

### Further expansion: the rest of service-info (bug 10) and spec version

`supported_filesystem_protocols` advertises `file`, `s3` and `gs` whatever file sources are configured. `system_state_counts` is all zeros. The defaults for organization `id`/`name` come from the reversed request host. `organization_url` drops a URL path prefix that `auth_instructions_url` now keeps. `supported_wes_versions` says `1.0.0`, though fix 6 follows 1.1 wording.

| Pros | Cons |
| --- | --- |
| • It is in `service_info`, the function fix 7 touches, and on the probe list. | • Each one is a design question. What does Galaxy accept per configured file source? Do real counts belong on an unauthenticated endpoint, and per whom? Should the version be claimed? |
| | • The organization defaults and `organization_url` live in `services/ga4gh.py`, shared with DRS, and are already configurable (`ga4gh_service_id`, `organization_name`, `organization_url`). An organization URL at the host root isn't wrong. |

### Further expansion: thermo-nuclear and baseline follow-ups

Router-level `DependsOnUser` in place of `_require_user`, `WorkflowsManager.get_invocation(check_ownership=True)` in place of `_get_invocation`, `InvocationState` constants, a shared `NoReplacement` predicate importable from both `galaxy.model` and `galaxy.tools`, rejecting undecodable `history_id`, and file splits.

| Pros | Cons |
| --- | --- |
| • Each one replaces WES's local code with Galaxy's canonical abstraction, which reviewers usually prefer. | • Each one changes `err_code` values (403001 → 403008), messages, admin access to other users' runs, or accepted input on endpoints that already work. On a release branch that's behavior churn with no bug fixed. |
| | • They edit `api/wes.py` route signatures and pre-existing lines, which adds merge-forward conflicts. They belong in a `dev` cleanup PR. |

### Further expansion: integer validation (bug 7), WES "honesty" (D14) and DRS (bugs 8 and 9)

The first evaluation already rejected these, and nothing has changed. Bug 7 is shared parameter validation that would start rejecting input every Galaxy API accepts today. D14 (`request`/`run_log`, omitting nulls, 401 vs 403, type aliases) and DRS (host, 202 without Celery, private datasets, collection URIs) are contract or design changes, partly shared with Galaxy's DRS service.

| Pros | Cons |
| --- | --- |
| • Together they would let the stage 7 WES clients work unmodified. | • Far beyond modest. Separate PRs, mostly on `dev`. |

### Contraction: back to the original scope (`wes_api_fixes_26_0_alt_original_scope`)

Drop the re-scope: WES-only `NoReplacement` mapping, `null` end tokens, `"TODO"`, three ad-hoc anonymous checks.

| Pros | Cons |
| --- | --- |
| • No native API change on a release branch. | • It brings back the WES special case and leaves native `GET /api/invocations/{id}` and `invocation_to_output` with the marker, the "probably not WES-specific" sibling the probes flagged. |
| • The branch exists and is pushed, so this costs nothing. | • It leaves two spec violations that stage 7 conformance flagged, in a file the branch already rewrites. It goes against the direction John's reviewers usually push. |

### Contraction: drop only the native change, keep everything else

Revert fix 5 to the WES-only mapping, but keep `""`, `auth_instructions_url` and the guard.

| Pros | Cons |
| --- | --- |
| • It is the only commit outside WES. Removing it makes the PR a pure WES fix. | • It repeats the contraction above for the change that mattered most. Decomposition option 2 already isolates fix 5 for separate review without giving up the general fix. |

### Contraction: drop the two refactor commits

Fold `_require_user` and the history split back into fixes 2 and 4, as before the baseline pass.

| Pros | Cons |
| --- | --- |
| • Three fewer commits in the series. | • Same final tree, but fixes 2 and 4 get noisier diffs (29 and 172 changed `wes.py` lines instead of 14 and 126). This changes commit layout, not scope. |
