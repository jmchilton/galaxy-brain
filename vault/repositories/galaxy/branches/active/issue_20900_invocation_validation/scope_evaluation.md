Run via Claude Opus at high effort.

**Recommend a modest expansion: keep the branch as implemented, and add three things.**

1. Reject URI datasets for collection input steps. Fix the input declarations in two of dev's tests with it (needs John's sign-off):
   - the singular URL test, whose declaration looks swapped;
   - `test_metadata_copied_to_copied_outputs`, which the branch already breaks.
2. Compute `requires_materialization` per batch entry.
3. Restore the collection-type check, but only for inputs that declare a type other than the default `list`.

The transaction change that removes the double populate stays a separate decision. The other candidates below are excluded or left as follow-ups. **Scope change vs as-implemented: yes, a modest one.**

Branch size: 5 commits on `7e16f446410`. There are about 330 production insertions and 190 deletions across 6 files, plus about 313 test lines.

## Possible Decompositions

Commits: `fde4e03dd8d` baseline tests · `cc2099794c5` public renames · `7e670abd636` extract history/param helpers · `7848553da11` validate before histories · `9f2d892ad17` landing check.

**A. By commit, 3 PRs.**
1. Refactors (`cc2099794c5` + `7e670abd636`), behavior-neutral.
2. Landing check (`9f2d892ad17`). It needs only the rename from 1.
3. Baseline tests + `7848553da11`.

Order: 1, then 2 and 3 in either order.

**B. Finer, 5 PRs.**
1. Refactors, as in A.
2. Landing check.
3. Parameter value checks. This is `validate_input_value` plus `WORKFLOW_PARAMETER_VALUE_TYPE_CHECKS`, inline in dev's existing loop, and it's the issue's own Sentry case. Dev returns 200 and fails at scheduling; this returns 400 at submission, but a history can still be left behind.
4. Data-input content checks: deleted inputs, dataset-vs-collection, sample-sheet URI pre-check and explicit access errors. This is the slice `remaining_split_candidates.md` anticipated. Expansion items 1 and 3 belong here.
5. Two-phase restructure. Nothing is created until every entry validates. The batch check moves up, resource and replacement params are checked once, and state is populated once per distinct `param_map`. Expansion item 2 belongs here.

Order: 1, then 2, 3 and 4 in any order, then 5.

**C. Restructure first.**
1. Refactors.
2. The restructure, carrying only dev's existing checks: parameter `validate`, resource/replacement params and the sample-sheet check moved before history creation.
3. Parameter value checks.
4. Data-input checks.
5. Landing check.

This delivers atomicity first, so each later check is side-effect-free when it lands.

## As implemented

Every run-request entry is validated before any history is created or any input copied. That covers parameter type, restrictions and validators; data-input existence, access, deleted state and dataset-vs-collection; sample-sheet URI metadata; replacement and resource params; and step state. The claimed landing request is also checked before invoking.

| Pros | Cons |
| --- | --- |
| Delivers #20900's core claim: a bad request, or a bad batch entry, leaves no history. | Inconsistent: `src: hda` is rejected for a collection input, but `src: url` is accepted. |
| Covers the Sentry case and reuses existing validators and `workflow_parameter_input_definitions` tables. | No collection-type check, so `list:list` given to a typed `list:paired` input still gets through. |
| 8 slices already merged, so what's left is the coherent core. | A single invocation populates twice (about +N_steps queries on the new-history path). |
| | The 2026-10-11 integration red is unresolved. `test/integration/test_dataset_copy_metadata_files.py::test_metadata_copied_to_copied_outputs` declares `bam_file` as a `list` collection but supplies a `File`, so the hda check now rejects it. It needs `bam_file: data`, a test-data change for John. Only API and unit selections ran after the rebase. |

## Reject URI datasets for collection inputs (recommended)

Also run the kind check for `DataRequestUri`/`FileRequestUri` on a `data_collection_input` step. Keep accepting Collection URIs and `hdca` for `data_input` steps, which is legitimate map-over.

| Pros | Cons |
| --- | --- |
| Closes the hda/url inconsistency that Codex and the thermo review flagged. | Changes dev's `test_run_workflow_from_url_with_implicit_conversion_on_collection`. That's test data, so it needs John's OK, in the same sign-off as the integration test above. |
| Small: one branch in `_resolve_data_input`. | Any external client that relies on the lenient URL path gets a 400. |

<details><summary>Why the test looks mis-declared</summary>

Both URL tests come from `3190de2a07a` (John, 2025) and look swapped:

- The singular test declares `collection`, sends one file URL, and asserts an HDA in `outputs`.
- The plural sibling declares `File`, sends a `paired` Collection URI, and asserts `output_collections`.

Changing the singular test's input to `File` keeps its assertions true. Leave the plural one alone: a collection given to a data input maps over, and the `hdca` ID path accepts it too.

</details>

## Per-entry `requires_materialization` (recommended)

Reset the flag for each batch entry. Today, once one entry has a non-deferred URI, every later run config is marked as needing materialization.

| Pros | Cons |
| --- | --- |
| A bug in code the branch rewrote, so it's cheap to fix here. | Dev behaves the same, so it isn't a regression. |
| Testable via the second invocation's state in a mixed `[url, hda]` batch. | Adds one more test. |

## Narrow collection-type check (recommended)

Restore the old check (`HistoryQuery.from_parameter(...)` `direct_match`/`can_map_over`, from `07377e10531`), but skip it when the declared type is `list`. Typed and untyped inputs can't be told apart, because `InputModule.save_to_step` persists `_parse_state_into_dict()`, and that fills in the default `list`.

| Pros | Cons |
| --- | --- |
| Reuses the run form's own matching algebra, so the API agrees with the UI. | A heuristic: an explicitly `list` input still accepts anything, as dev does. |
| Catches real mismatches (`list:list` or `list` to `list:paired`, `list` to `sample_sheet`). | Not run on the branch yet. It needs the framework workflow suite and the mapping API tests. |
| The 2 reds caused by the dropped check were both on default-`list` inputs. The other 2 of the 4 were `replacement_params: null` 500s. | Workflows that declare an over-specific type and rely on the API ignoring it will now get a 400. |
| Checked read-only against dev's typed framework fixtures (`collection_semantics_paired_or_unpaired`, `collection_semantics_list_paired_or_unpaired`). Every supplied job type is accepted by `direct_match` or `can_map_over`, including `list`, `sample_sheet:paired` and `list:list`. | |

## Full collection-type check (not recommended now)

Stop persisting the default `list`, so untyped inputs stay untyped, then enforce the type everywhere.

| Pros | Cons |
| --- | --- |
| A correct, non-heuristic contract. | Every stored workflow already says `list`, so the change only helps newly saved ones. |
| | Touches workflow storage, import and editor semantics. It's a decision scope of its own. |

## Commit→flush in the side-effect loop (separate decision)

Replace the history `commit()` and the LDDA `commit=True` with flushes. `queue_invoke` can then reuse the validation populate, and a failure during `queue_invoke` rolls back the new histories.

| Pros | Cons |
| --- | --- |
| Removes the 2-vs-1 populate (+50 queries for a 50-step workflow when the request creates a history). | A transaction-semantics change in core invocation. |
| Extends "no side effects" through `queue_invoke`. | Not checked whether `dereference_input_to_hda`/`dereference_input_to_hdca` commit internally. |

## Reject collections for data inputs (exclude)

Make the kind check symmetric.

| Pros | Cons |
| --- | --- |
| Uniform kind checks. | Breaks legitimate map-over; dev's plural URL test pins it. |

## Enforce data-input `format` (exclude)

Reject datasets whose extension doesn't match the step's declared format, allowing for implicit conversion.

| Pros | Cons |
| --- | --- |
| Mirrors the run form's filtering. | Formats on input steps are loose in practice (IWC), so real invocations would break. |
| | Implicit-conversion rules make a correct check non-trivial. |

## Reject unknown `inputs` keys (follow-up)

`_normalize_inputs` silently ignores labels that match no input step, so a typo'd optional input vanishes.

| Pros | Cons |
| --- | --- |
| Squarely "catch things early"; it's the planemo-typo class of bug. | Client compatibility is unknown (UI, planemo, BioBlend, `inputs_by` combos, legacy `ds_map`). |
| | A different concern (request shape), better as its own PR. |

## Check that the landing request matches the workflow (exclude)

Reject a `landing_uuid` whose target isn't the workflow being invoked.

| Pros | Cons |
| --- | --- |
| Prevents a misleading landing↔invocation association. | URL/TRS landings import a new workflow, so there's nothing to compare. |
| | `WorkflowLandingRequest.workflow_id` and `stored_workflow_id` have swapped foreign keys, which needs untangling first. |

## Lenient text coercion (alternative, not recommended)

Coerce an int given to a text param into a string instead of rejecting it, which is the issue's Sentry case.

| Pros | Cons |
| --- | --- |
| Friendlier to planemo job files. | Hides client bugs. The issue asks to catch them early. |
| Integer params already accept `"5"`. | A one-way leniency adds a special case. |

## Contraction: ship value checks only

Ship the parameter and data-input checks (B.3 and B.4) and drop the restructure.

| Pros | Cons |
| --- | --- |
| A smaller diff and no batch-loop rewrite. | Gives up the issue's core property: failures still leave a history. |
| | The thermo review judged the restructure sound and worth it. |

## Minor review follow-ups (not in scope)

| Item | Disposition |
| --- | --- |
| Shared helper for the "no history named X" assertion (about 15 uses, mostly dev) | Small test-only follow-up. |
| `_validate_resource_params` TODOs | Moved verbatim from dev; leave. |
| `[text]` multiple values skip the per-element type check | Upstream's per-entry validation; already decided. |
| Batch tests beyond the first invalid entry | Optional; one batch test proves the claim. |
| `param_map not in` linear scan | Trivial at real batch sizes. |
| `#7781`: optional params connect only to optional inputs | Save-time validation, not invocation; separate. |
