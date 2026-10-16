**Recommendation: modest expansion.** Keep the re-keying fix and add one small change on this branch: at import, drop `type == "step"` rows that have no `order_index`, and log a warning. Those rows can never be mapped, and dropping them closes the legacy cross-server collision. It also stops a re-export from carrying a wrong step into a new-style archive. That costs about 5 lines and one red-to-green assertion. Target `release_26.2` for this branch and #24178 together. The bug is in 26.2's new Rerun button (26.1 doesn't have it), and #24178 is the only commit between `release_26.2` and this stack that touches these files. Two changes outside this branch: (1) remove the duplicate step-parameter parser now instead of waiting for "whichever lands second": restack #24176 onto #24175 so `recover_step_parameters()` delegates to `resolve_step_parameters()`; (2) fix the `param_map` lookup bug in #24178, which already edits `run_request.py`. Defer the "step params lost" notice and the 400 for unknown outer indices.

Evaluated at head `00f0d68ec9d`, which has been rebased onto #24178 @ `a171dbed419`. The branch's own diff is now `a171dbed419..HEAD` (4 files, +117/−8). `5cf81e75c12..HEAD` now also pulls in upstream `dev` changes.

## As implemented: re-key on import, skip unknown ids at `/request`

`_serialize` adds `order_index` and order-index-keyed `step_parameters` to step rows that resolve. Import re-keys those rows onto the rebuilt workflow. `/request` skips rows whose step it can't find and logs a warning. All three go through `WorkflowRequestInputParameter.resolve_step_parameters()`.

| Pros | Cons |
| --- | --- |
| • Follows the issue's Proposed Approach exactly.<br>• Store format only. No migration, and older Galaxy servers ignore the new keys.<br>• One helper does all the step id → order index conversion, built on #24178's helpers.<br>• Every review is clean: normal, Codex (no findings) and thermo (3 small fixes). | • Legacy rows are still imported verbatim. A cross-server id collision silently uses the wrong step, and re-export then records that wrong `order_index` in a new-style archive.<br>• A second near-identical parser lands in #24176.<br>• Targets `dev`, but the bug ships in 26.2. |

## Expansion A (recommended, this branch): drop unmappable step rows at import

In `_import_workflow_invocations`, skip `type == "step"` rows that have no `order_index` and log a warning. Keep the `/request` skip and the `_serialize` guard, because invocations imported before the fix are already in the database. This covers the "should import drop rows without `order_index`" and "cross-server collisions fixed only for new archives" follow-ups.

| Pros | Cons |
| --- | --- |
| • A row without `order_index` is always stale: it is either a legacy archive or a row the exporter couldn't resolve. Keeping it has no use.<br>• Closes the legacy collision for every future import. A re-export can no longer make a wrong step look valid.<br>• About 5 lines, in code this branch already touches.<br>• The `/request` outcome is unchanged (`parameters` None), so the issue's fallback behaviour is kept. | • Through the API, the only observable difference is that a re-exported archive no longer has step rows. The collision itself is only testable in unit tests.<br>• The existing legacy API test would stop exercising the `/request` skip and the `_serialize` guard. They become defensive code for rows imported before the fix.<br>• Rows stored at import would no longer show that parameters were lost. A future notice would have to be recorded at import time (see C). |

<details>
<summary>Why the drop is safe, and how to test it</summary>

- The issue rejected "Drop step parameter rows on import" as the *primary* fix, because it throws away mappable data. This drops only rows that can't be mapped, which is the fallback the issue already accepts at request time.
- Thermo F6 confirmed that a legacy archive has no id → index map (`WorkflowInvocationStep._serialize` exports only `order_index`). Nothing could recover these rows later.
- Red-to-green: extend `test_workflow_request_after_import_of_archive_without_step_parameter_order_index` to assert that the re-exported archive has no `type == "step"` input parameters. That fails on the current head and passes with the drop.
- Covering the now-defensive guards would need a DB-level unit test. Given John's "tiny fix, no dedicated test" preference, that is optional.
- Collisions need an old archive (pre-fix, a shrinking set), a cross-server import, and a small-id clash, so they are rare. The fix is cheap and makes the outcome permanent-safe, so it is worth doing under the expansion bias.

</details>

## Expansion B (recommended, stack target): `release_26.2`

Target `release_26.2` (or backport to it) for #24178 and this branch together. #24176 and #24177 decide separately.

| Pros | Cons |
| --- | --- |
| • `origin/release_26.2` has the bug: `WorkflowRerun.vue`, verbatim `name` import, and `steps_by_id[step_id]` in the `/request` export. `release_26.1` and `26.0` don't have `WorkflowRerun.vue`, so 26.2 is the oldest affected branch.<br>• Rebasing is cheap. The only commit touching these files between `release_26.2` and this stack is #24178's `a1692ef6c27`.<br>• The store-format addition is backward compatible. | • #24178 has to be retargeted as well, because this branch needs its helpers.<br>• Archives exported from 26.2 servers that don't have the fix are still legacy archives. |

## Expansion C (defer): a "step parameters lost" notice

Tell the user when legacy step parameters couldn't be mapped. The natural channel is an import-time `InvocationWarning` with a new `WarningReason`, following the `workflow_output_not_found` pattern. That works together with A. Putting a field on `WorkflowInvocationRequestModel` instead would pollute a payload that is meant to be resubmitted.

| Pros | Cons |
| --- | --- |
| • Removes the silent fallback that the issue and the reviews mention.<br>• Uses an existing persisted message abstraction instead of a 4xx that would block the rerun. | • Needs a schema union member, the `InvocationMessage.vue` and `util.ts` client cases, `schema.ts` regen and screenshots. That is well beyond modest.<br>• Only helps for legacy archives, a shrinking population, on a niche import path.<br>• The rerun form's reason alert belongs to #24177, which isn't on this stack. |

## Expansion D (recommended, #24176's area): remove the duplicate parser now

`WorkflowInvocation.recover_step_parameters()` in #24176 parses the same rows as `resolve_step_parameters()`. Restack #24176 (and #24177) onto this branch, and make `recover_step_parameters()` a loop over `parameter.resolve_step_parameters()` that skips `None` and `ValueError` and keys by `step.id`. This branch doesn't change.

| Pros | Cons |
| --- | --- |
| • A reviewer of #24176 would otherwise see two parsers for the same rows. The note "whichever lands second reconciles" defers a known cleanup.<br>• An invocation-level method on top of the per-row one fits the existing `recover_inputs()` pattern.<br>• #24176's imported-invocation seed test could then assert that new-style archives actually prefill, not just that the form loads. | • #24176 can no longer land before #24175. Since #24175 is small and READY, that costs little.<br>• It reverses the previously approved sibling split, so #24176 and #24177 need a fresh human read after the restack.<br>• The two error policies differ (`/request` raises `InconsistentDatabase` on a malformed row, #24176 skips it) and still live with the callers. |

<details>
<summary>Rejected alternative: move `resolve_step_parameters()` into #24178</summary>

That would make it a shared base helper without restacking. But #24178's `/request` export would then have to decide what to do with `None`. Skipping it would silently drop every imported invocation's step parameters, which is the rejected "drop" alternative applied to *mappable* data. Raising keeps the 500 that this branch exists to fix. Moving the helper drags this branch's semantics into the parent, so the restack is the cleaner boundary.

</details>

## Expansion E (recommended, #24178's area): fix the latent `param_map` lookup

`workflow_run_config_to_request` builds each subworkflow's run config with `run_config.param_map.get(step.order_index)`, but `param_map` is keyed by `step.id`. The fix is one line in `run_request.py`, which #24178 already edits.

| Pros | Cons |
| --- | --- |
| • A real bug. On a small-id database, an outer step id can equal a subworkflow step's `order_index`. The subworkflow invocation then persists an unrelated step's flat params as rows (for example `name="num_lines"`). `workflow_request_to_run_config` does `int(parameter.name)` on them during subworkflow scheduling.<br>• Passing `{}` keeps production persistence the same, because on large-id servers the lookup already misses. That answers #24178's "changes what gets persisted" concern. | • It belongs to invoke-side persistence, not import. This branch only sees the garbage rows, and `_serialize` already tolerates them through `ValueError`.<br>• Choosing between `{}` and `.get(step.id)` is a design choice for #24178. Inner parameters are already captured in `step_states`, and decoding `step_states` overwrites `step.state` at scheduling time.<br>• It needs its own red test in #24178. |

## Expansion F (not here; #24178's call): 400 for unknown outer step indices on invoke

With `parameters_normalized`, `_normalize_step_parameters` silently ignores outer keys that don't match any step's `order_index`. #24178 made unknown *inner* indices a 400.

| Pros | Cons |
| --- | --- |
| • Matches the inner-index 400 that #24178 introduced. | • Has nothing to do with import. The `/request` export of this branch emits only known indices.<br>• Could break API clients that send extra keys today. That decision belongs in #24178's PR. |

## Contraction: re-keying only, no legacy skip

Drop the `/request` skip and let pre-fix archives keep returning a 500.

| Pros | Cons |
| --- | --- |
| • Slightly smaller diff. | • Leaves Rerun broken for every invocation already imported, and for every existing archive.<br>• The issue explicitly asks for the skip. |

## Larger alternative: FK column or a `WorkflowRequestStepState`-derived export

The issue's own alternatives: add a `workflow_step_id` FK with a migration, or build `parameters` from step states.

| Pros | Cons |
| --- | --- |
| • A structural fix for the outer step. | • Needs a migration and backfill, and inner subworkflow ids still sit in the JSON.<br>• Deriving from step states changes what `parameters` means.<br>• The issue rejected both, and John's issue note says this fix must not involve a migration. |
