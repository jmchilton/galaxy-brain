# Test challenges review

Profile `generic_test_challenger` (shared.md), model Claude Opus 5.5 (`claude-opus-5-5`), effort low. Reviewed commit `0070bc1a`, base `origin/main` `7453431d`. Details and the claim table are in [test_challenges_debrief.md](test_challenges_debrief.md).

**Overall.** The committed assertions bite. I replayed the test file through the pinned Planemo 0.75.47 checker against simulated outputs, and all 13 mutated results were caught, including 1 or 2 live elements on the zero-count sentinel. The README's trick is sound. The gaps are claims with no assertion behind them, and none of them come from a weak existing assertion. This replay exercises the checker and not Galaxy. Findings that rest on reading Galaxy's source say so.

## P2 1: "Different collections" is only tested for different lengths, and equal-length arms look silently wrong

The page says `pick_value` "needs the arms to match" and gives the failure for differing lengths. The MOC's rule is wider: arms over different collections filter and then merge. Equal-length arms with different identifiers have no assertion, and the debrief says they were never run.

<details><summary>Evidence (code reading on Galaxy `dev`, not run)</summary>

`Tree.compatible_shape` in `lib/galaxy/model/dataset_collections/structure.py` compares collection type, child count and leaf-ness, not identifiers. `PickValueModule._execute_mapped` in `lib/galaxy/workflow/modules.py` names each output from the first mapped input in sorted order. With `a1`, `a2` on `input_0` and a live right arm over `c1`, `c2`, this should produce no error and elements named `a1`, `a2` holding the `c*` content.

The length claim itself rests on one scratch run of the built-in only. The README says so, and Planemo can't hold a failed invocation, so that part is acceptable as it stands.

</details>

Add an equal-length, different-identifier arm to `route-mapped-fan-in` and assert the identifiers and content with the right arm live. Then have the page say that `pick_value` pairs by position and takes the first input's identifiers, so a shared length doesn't make it safe. If the run disagrees with the code reading, the page follows the run.

## P2 2: `the_only_non_null` being the counterpart of `pick_style: only` has no assertion

Both test cases have exactly one arm live, so swapping the mode to `first_non_null`, or `pick_style: only` to `first`, would still pass. What defines these modes is the both-on and neither-on behaviour, and nothing runs it. The two spellings also fail differently, which the page doesn't say: its pitfall says `only` gives a job failure, while the built-in raises `FailWorkflowEvaluation` and fails the invocation.

<details><summary>Evidence</summary>

`_pick_from_replacements` raises when `len(non_null) != 1`. Galaxy's `test_pick_value_the_only_non_null_error_multiple` asserts `invocation["state"] == "failed"`, unmapped. No workflow under `lib/galaxy_test/workflow/pick_value_*` uses `the_only_non_null`, so the mapped path has no upstream test either. It reaches the same function for each slice.

</details>

Planemo can't hold the failure, so follow `verification/README.md`'s Eligibility section: cite Galaxy's API test, and say on the page that a routing bug fails the invocation under the built-in. If John wants the mapped path pinned, that's an upstream Galaxy framework test, which does have `expect_failure`.

## P2 3: Filter then merge is only tested with one arm live, and the recipe can't detect anything else

The page's "holds only the live arm's elements" holds only for exactly one live arm. The MOC sentence just before the new rule tells authors to pick merge behaviour that "detects zero or multiple live outputs", and the rule then recommends a recipe with no such detection. From the tool's behaviour, both arms on gives all 5 elements and neither gives an empty collection, both green. Neither was run. This is the one recipe where exclusivity is lost, and no pitfall mentions it.

Add a small separate workflow, since `only` in `route-mapped-fan-in` would fail the run: both on expects 5 elements, neither on uses the README's sentinel merge. Add a pitfall that this recipe doesn't enforce exclusivity, so a routing bug goes unnoticed.

## P3 1: `duplicate_options: keep_first` in the filter recipe is inert

The filtered arms have disjoint identifiers, so nothing conflicts. Changing the setting to `keep_last`, `fail` or `suffix_conflict`, or removing it, would still pass. It is also already the default, as the pitfall says. Drop it from the page snippet and the workflow, or say what it's for once P2 3 shows whether it matters.

## P3 2: "A merge must select per element" can't be told apart from a whole-arm pick

Gates are workflow-level booleans, so every element of an arm is skipped or none is. A merge that picked a whole arm would pass. Galaxy's `pick_value_mapped_mixed_skip_pja` covers mixed skips for the built-in, but it relies on the `param_value_from_file` test tool, so a Foundry case isn't obviously cheap. Citing that test is enough.

## P3 3: `collection_type: list` in the test file asserts nothing under Planemo

In the replay, a `list:paired` result passed. `TestCollectionOutputDef.from_dict` reads `attributes.type`, and only `from_yaml_test_format` fills that from `collection_type`; Planemo calls `from_dict`. No claim on these pages depends on it, and `verification/README.md` teaches the same form. It belongs with the two upstream notes in the debrief, for John, and needs no change here.

## Not checked

The Functional_annotation_of_sequences exemplar claim: the fixtures aren't in this worktree. No security findings.
