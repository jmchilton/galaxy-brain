# Scope evaluation

**Recommendation: keep the scope as implemented.** The branch fixes exactly #24178: the export's re-keying, the normalizer's inverse, and the proposed 400. It also preserves the inner `parameter_input` check that the helper swap would otherwise have dropped. It adds the `WorkflowStep` helper pair that #24176 already stacks on and #24175 plans to reuse. None of the alternatives below is a scope change for this branch:
- Retargeting to `release_26.2` is a maintainer call at PR time.
- The latent `param_map` keyed-by-id bug should be a separate follow-up.
- The export-side 500 for unknown inner ids belongs to #24175, which should not be folded in.

Evaluated at `5cf81e75c12` on `dev` @ `88127f42979`: 5 commits, +187/−19 across 5 files.

## As implemented

Inverse helpers `WorkflowStep.step_parameters_by_index` / `step_parameters_by_id`. The export re-keys inner step ids to `"<inner order_index>|name"`, and `_normalize_step_parameters` uses the inverse. Malformed, unknown or non-numeric inner keys now get a 400. The `parameter_input` "must specify 'input'" check now recurses into subworkflows through `_validate_normalized_step_parameters`.

| Pros | Cons |
| --- | --- |
| It matches the issue's Proposed Approach item for item: the helpers, the export change, the `(TypeError, ValueError)` catch, the 400 and the tests. | Unknown or non-numeric *inner* indices now get a 400, but unknown *outer* order indices are still silently ignored (`param_map.get(str(step.order_index), {})` loops over steps). A reviewer may ask about the asymmetry. |
| No migration and no change to stored data. Existing invocations export correctly because the re-keying happens at read time. | It changes behaviour in two ways (an ignored key becomes a 400, a 500 becomes a 400), and the PR description must spell both out. |
| It deletes the inline split-and-recurse loop and the export TODO. One definition of the key format serves both directions. | The 40 helper lines land in the 13.6k-line `model/__init__.py`. They sit next to `steps_by_id` and `step_by_index`, so this is acceptable. |
| The helpers are the reusable unit for the siblings. #24176 already stacks on them, and #24175 needs `by_id` at import. | |
| The Codex finding (the inner `parameter_input` check was silently dropped) was confirmed red, then fixed and tested. The narrowing was dealt with, not left behind. | |

<details><summary>Details</summary>

- The diff is small, server-only and on the request path. An end-to-end test is in place: export, rerun, the rerun produces 2 lines, and the rerun's own export matches.
- The `_validate_normalized_step_parameters` walk was not scope creep. It keeps validation from d8c6b0c76fa (2026-10-03) that the helper swap would otherwise have regressed.
- The outer/inner asymmetry existed on dev, where both levels were lenient. Only the inner level gets stricter here. Making the outer level strict would be a new behaviour change for top-level callers, so it is not suggested.

</details>

## Contract: export-only fix

Change only `serialize_workflow_invocation_to_request` to call `step_parameters_by_index`, and leave `_normalize_step_parameters` and its inline `split("|")` loop alone.

| Pros | Cons |
| --- | --- |
| It is the smallest diff that makes the round trip work, with no behaviour change on invoke. | A key without `\|` stays an unhandled `ValueError`, which is a 500. The issue explicitly asks for a 400. |
| | The key format would be defined in two places, with parse and format drifting apart. |
| | #24175 needs `step_parameters_by_id` anyway (to re-key against the target step at import), so the inverse would just land later, on another branch. |

## Contract: drop the 400 behaviour change

Keep the helper pair, but leave unknown and non-numeric inner indices silently ignored, either by skipping in the normalizer or by having the helper tolerate them. Only the no-pipe 500 would become a 400.

| Pros | Cons |
| --- | --- |
| No new rejections. A hand-saved request replayed against an edited workflow keeps "working". | It contradicts the issue text, which proposes the 400 by name. |
| It avoids a user-visible change that reviewers might debate. | Silently dropping user-set parameters is exactly the failure that #24177 and #24176 complain about. |
| | A tolerant helper is a worse contract for #24175's import re-keying, where an unknown index means corrupt data. |
| | The run form and the export only emit valid indices, so legitimate callers are unaffected. The change only bites stale or hand-built requests, and a loud failure is better there. |

## Expand: fix the latent `param_map` keyed-by-id lookup

In `workflow_run_config_to_request`, the sub-invocation's `param_map` reads `run_config.param_map.get(step.order_index)`, but that map is keyed by `step.id`.

| Pros | Cons |
| --- | --- |
| It is a one-line correctness fix in neighbouring code. | It is not on #24178's path. The bug affects what is persisted on the *sub*-invocation, while this issue concerns the top-level request export. |
| Small-id test databases could hit collisions, and this would remove that. | The spike notes the fix changes what gets persisted on sub-invocations. That cuts against the issue's "changes no stored data" premise, and John's note says he took on these issues only on that basis. |
| | It is harmless today, because subworkflow values reach scheduling through `step_states`. There is no red user-facing test to anchor it. |
| | It is better as its own tiny issue or PR, where the persistence change can be discussed on its own. |

## Expand: wrap the export-side 500 for unknown inner step ids

An unknown inner step id in stored params still raises `KeyError` from `step_parameters_by_index`, which is a 500. The outer `steps_by_id[step_id]` lookup behaves the same way.

| Pros | Cons |
| --- | --- |
| It would make the export fail more cleanly, for example with `InconsistentDatabase` or a skip-and-warn. | It is only reachable for imported (or corrupt) invocations, which is #24175's bug. |
| | Whether to skip or to error is a design decision for #24175. The spike skips pre-fix store rows with a warning. Deciding it here would preempt that design. |
| | The normal, Codex and thermo-nuclear reviews all deferred it to #24175. |

## Expand: fold in #24175

Add the model-store import re-keying (serialize `order_index` plus index-keyed params, then re-key on import) to this branch, as the spike's "1+2 as one server PR" option.

| Pros | Cons |
| --- | --- |
| One server PR for "step params aren't portable", with a single review of the key format. | The spike calls #24175 the part reviewers will debate. It adds to the store format and leaves pre-fix archives degraded. Folding it in would tie a straightforward bug fix to that debate. |
| The export-side unknown-id 500 would be handled in the same place. | #24176 is already stacked on this branch. Growing the base would churn the stack. |
| | No #24175 branch record exists yet, so there is no reviewed work to fold in. It would be new scope, not a merge. |
| | It goes against the deliberate 4-way split John chose. |

## Retarget or backport: `release_26.2`

Target `release_26.2` (or backport to it) instead of shipping on `dev` only.

| Pros | Cons |
| --- | --- |
| The bug is present on 26.2: the export still has the `# TODO: test subworkflows` line. | #24176 is a `dev` feature stacked on this branch. Retargeting the base means #24176 waits for a forward merge or gets restacked. |
| 26.2 is not tagged yet (the latest tag is v26.1.1). The three lib files are identical between this branch's base and `origin/release_26.2`, and `d8c6b0c76fa` is in 26.2, so the implementation would apply cleanly. Only `test_workflows.py` differs, by about 59 lines, so expect test-hunk context fuzz. | It puts the behaviour change (ignored keys becoming a 400) on a frozen branch. |
| Galaxy usually sends bug fixes to the oldest affected supported release. | The issue frames this as a legacy run-form path, which John took on reluctantly. That makes it a low-urgency candidate for a stable branch. |

<details><summary>Details</summary>

This is a decision about the PR's target, not about the size of the work, and it doesn't change what the branch contains. Keep it on `dev`. If a maintainer asks for 26.2, rebase this branch alone onto `release_26.2` and let the forward merge carry it to `dev`, then restack #24176. Whichever target is chosen, mention it in the PR description.

</details>

## Minor test contraction: drop `test_workflow_request_step_parameters_rerun`

The normal review suggested dropping the top-level baseline or folding it into `test_run_replace_params_over_default`, since it already passes on dev.

| Pros | Cons |
| --- | --- |
| It saves two workflow runs on CI. | The issue explicitly proposes it as the top-level baseline. |
| | It is the only check that a top-level conditional key containing `\|` (`seed_source\|seed`) passes through `step_parameters_by_index` unchanged, which is the no-op path. |
| | It was declined in both the normal review and the test-challenge pass, each with a stated reason. |
