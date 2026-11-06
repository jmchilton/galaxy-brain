# Test challenges debrief

Profile `generic_test_challenger`, reviewed commit `0070bc1a` on `issue-661-conditional-fan-in`, base `origin/main` `7453431d`. The worktree wasn't edited. No Galaxy run: `planemo test` is the coordinator's.

There are no unit tests, mocks or `SimpleNamespace` constructs on this branch, so the process's mock questions don't apply. The challenge here is whether each claim has an assertion that would fail if the claim were false.

## How the assertions were checked

The real checker is Planemo's `check_output`, which calls `galaxy.tool_util.verify.interactor.verify_collection`. I loaded `route-mapped-fan-in.gxwf-test.yml` and replayed it through the pinned Planemo 0.75.47 environment, using simulated outputs built from the debrief's table. All 14 expectations pass on the simulated baseline. This shows how the assertions behave. It says nothing new about how Galaxy behaves.

Thirteen mutated results were all caught:

| Mutant | Result |
|---|---|
| Wrong arm's content, Tool Shed and built-in, either arm | caught |
| Built-in identifiers renumbered to `0`, `1` | caught |
| Built-in with 4 elements, the "3N" shape | caught |
| Filter then merge with nulls kept, 5 elements, either arm | caught |
| Same-list direct merge, right arm, 4 elements | caught |
| `..._live_plus_right_samples`, right arm, direct merge had 1 or 2 live elements | caught |
| `..._live_plus_right_samples`, left arm, direct merge had 0 live elements | caught |
| Different-list direct merge with nulls dropped, 2 elements | caught |
| `different_arms_direct_merge_live` with nulls kept, 5 elements | caught |

Three checks survived, as suspected:

- `collection_type: list` against a `list:paired` result. `TestCollectionOutputDef.from_dict` reads only `attributes.type`, and Planemo never populates it from `collection_type`, so the line asserts nothing. See P3 3.
- `element_count: 0` against 2 elements, which confirms the README's statement.
- `same_arms_direct_merge`, right arm, with 2 live elements. That output asserts only the count. The `..._live_plus_right_samples` output catches this case, which is its job.

## The README's zero-count trick

It's sound. `same_arms_direct_merge_live_plus_right_samples` filters the direct merge and merges the result with `right_samples`.

- The identifiers are disjoint (`s*` and `b*`), so `keep_first` can't hide a live element.
- The right-arm case names `b1` to `b3` and expects a count of 3, so 1 or 2 surviving elements fail it.
- The left-arm case expects 5, including `s1`, so a `__FILTER_NULL__` that drops everything fails it too.

`same_arms_direct_merge`, right arm, needs its `element_tests: {}`. Planemo's `for_collections` tests for that key, and without it the output goes down the single-file path. The empty mapping looks vacuous but isn't.

## Claim by claim

| Claim | Assertion | Bites? |
|---|---|---|
| Gated mapped step keeps its implicit collection, null per skipped job | `different_arms_direct_merge` 5 with `..._live` 2 or 3 | Yes, indirectly |
| A merge must select per element | Gates are uniform across elements | No: a whole-arm pick would pass (P3 2) |
| Same list: `pick_value` gives one element per input, identifiers kept (both spellings) | Count 2, `s1`/`s2`, sample and arm text, both arms | Yes |
| `the_only_non_null` is the counterpart of `pick_style: only` | Only exclusive gates run | No: `first_non_null` would pass (P2 2) |
| Downstream steps read the built-in's `output` | `outputSource: .../output` | Yes |
| Different lengths: invocation fails with `Cannot match collection types` | Scratch run only | No committed assertion, and Planemo can't hold one (P2 1) |
| `pick_value` needs the arms to match | Nothing for equal lengths with different identifiers | No (P2 1) |
| Filter then merge holds only the live arm's elements | Count and every identifier and content, both arms | Yes, for exactly one live arm (P2 3) |
| Direct merge, shared identifiers: `keep_first` is the default, all nulls when the first arm is skipped | Left content; right count 2 with 0 live | Yes. The XML also marks `keep_first` as `selected="true"` |
| Direct merge, different identifiers: skipped arm's elements as nulls | Count 5, live 2 or 3 | Yes, by count. A null element's identifier can't be named |
| Filter recipe's `duplicate_options: keep_first` | Identifiers are disjoint and filtered | No (P3 1) |
| README: `element_count: 0` is skipped | Replay above | Confirmed on the pinned version |
| README: Planemo can't hold a failed invocation | `expect_failure` absent from pinned Planemo; Galaxy's framework tests have it | Confirmed by reading |

Not checked: that the Functional_annotation_of_sequences exemplar maps its `pick_value`. The IWC fixtures aren't in this worktree and sibling worktrees are out of bounds.

## Test plan

1. **Equal-length arms with different identifiers.** Add a two-element list (`c1`, `c2`) and a gated arm over it, then built-in `pick_value` with `different_left`. Assert what happens with the right arm live. The code reading predicts elements named `a1`, `a2` holding right-arm content. Then state it on the page, or correct the page if the run disagrees.
2. **Both arms on and neither arm on, filter then merge.** Use a separate small workflow, because `only` and `the_only_non_null` in `route-mapped-fan-in` would fail the run. Both on: expect 5 elements. Neither on: expect an empty merge, so use the sentinel merge from the README. Add a pitfall saying the recipe doesn't detect either state.
3. **Exclusivity of `the_only_non_null`.** Planemo can't hold this. Follow `verification/README.md` and cite Galaxy's `test_pick_value_the_only_non_null_error_multiple`, and say that the failure is an invocation failure, not a job failure.
4. **`duplicate_options`.** Drop it from the filter recipe or say what it does, after step 2 shows whether it matters.
5. **Mixed gates.** Cite Galaxy's `pick_value_mapped_mixed_skip_pja` for the built-in, unless a Foundry case proves cheap.

Nothing here argues for deleting a test. The two direct-merge outputs and the sentinel output all earn their place.
