# Review debrief: `issue-661-conditional-fan-in`

Reviewed `0070bc1a`, now at `bac5ae4b`, base `origin/main` `7453431d`. No P1s and no security findings. The branch should ship.

**Acted on.** All five reviewers agreed the core claims held and that the gaps were in what the page left unsaid. I fixed those: the mismatch sentence, equal-length arms (now a committed test), filter then merge losing exclusivity (now a both-on test and a sentence on the page), the missing `release_26.1` floor, the sibling pitfalls, and the workflow's size. I also split the test by arm shape and gave the different lists a shared identifier, which shows why the filters come first. Every prediction the reviewers made from reading code held when I ran it. `planemo test` passes 2 of 2 and 3 of 3 on `release_26.1`.

**Reviewer profiles.** `default`, `foundry_domain_review`, `generic_test_challenger` and `thermo_review` at medium, `generic_risk_assessment` at low, all on Claude Opus 5.5. Thermo ran because the workflow and test YAML came to 517 hand-written lines, over the 500 threshold.

## Not acted on

- **Writing issue text into the README or linking issues (default P2 5, domain P2 5).** Partly done. The text is in `../upstream_issue_text.md` and the README is cut back, but nothing is filed, since GitHub was off limits. The sentinel step stays until the `element_count: 0` fix lands.
- **`collection_element_identifiers` in place of the sentinel merge (thermo P3 1).** Filtered: it's untested, adds a Tool Shed dependency, and the sentinel is now small and has its own input.
- **Removing the archaeology in the README's older paragraph (domain P3 4).** Filtered: untouched pre-existing text.
- **`planemo lint` being a non-check, and the stale `0.75.41` line in `verification/README.md`.** Filtered: pre-existing and outside this branch. Worth a small separate fix.
- **Neither-on test (test challenger P2 3, default P2 2).** Not possible without a workaround, because an empty collection can't be asserted. The page makes no claim about it, and the README says it's untested. A separate workflow seemed like too much for a claim the page doesn't make.
- **Built-in spelling on the unmapped shapes (domain P2 4, default P2 3).** Not added. The page keeps the Tool Shed spelling on those shapes and says to prefer the module for new work. Galaxy's own `pick_value` tests cover the unmapped module, but no Foundry test does.
- **Adding `first_or_error` or `fail` advice.** Not added: Planemo can't verify a failure, and the page says only what's shown.
- **Tool Shed spelling over different lengths (domain's suggested throwaway).** Not run. The README says so and points at the shared matching code.
- **`iwc-conditionals-survey:134` and `conditional-gate-on-nonempty-result:144`.** Left alone: both are still true.
- **Risk notes on the first CI lint run and revert cost.** No action: `planemo lint` runs under `continue-on-error`, and a revert is a mechanical recast.
- **`collection_type` asserting nothing (test challenger P3 3).** No change here; it's in the upstream text.

## For John

- `pick_style: only` is used where #661 proposed `first_or_error`.
- Recommending filter then merge is an expert call: it has no IWC use, and the page now says so.
- `../upstream_issue_text.md` has five items to file or drop. The equal-length pairing is a question and may be by design.

<details><summary>Verified findings</summary>

Each was checked against the code or a run. Reviewers are in brackets.

### P2 1: Equal-length arms over different lists (default P2 1, domain P2 2, test P2 1)

Confirmed by a run. Built-in `pick_value` over `a1`, `shared` and `c1`, `c2` with the right arm on succeeds, and gives `a1`, `shared` holding `equal-one`, `equal-two`. Fixed: a committed test and a page sentence.

### P2 2: The mismatch sentence overclaimed (domain P2 1, default P3 1, flagged by the implementer)

Confirmed in Galaxy's source: `compatible_shape` compares type and shape only, and `test_lists_of_different_cardinality_do_not_match` covers the length failure. Fixed: new page wording, and the README cites that test and says what the manual run covered.

### P2 3: Filter then merge loses exclusivity (default P2 2, domain P2 3, test P2 3, risks)

Confirmed by a run for both arms on: 4 elements, with `shared` from the left arm. Fixed: a both-on test case, a page sentence and an MOC clause. `keep_first` removed from the recipe and workflow, where it restated the default.

### P2 4: No version floor, and the Tool section contradicted the new section (default P2 3, domain P2 4, risks)

Confirmed: `release_26.1` has `PickValueModule`, and `cwl-pickvalue-to-galaxy` already warns about older Galaxy. Fixed: the floor and recommendation now sit in the Tool section, which is scoped to the unmapped shapes.

### P2 5: `__FILTER_NULL__` recommended while sibling pages warn against it (default P2 4, domain P3 1)

Confirmed at the cited lines. Fixed: narrowed two pitfalls, added the no-IWC-use sentence, and routed the recommendation to John.

### P2 6: One workflow held two disconnected graphs (thermo P2 1, P2 2)

Confirmed: no shared step. Fixed: `route-mapped-same-arms` and `route-mapped-different-arms`, with anchored assertions. Cost: one more Galaxy boot in CI. `verification/README.md`'s layout line is updated.

### P2 7: The fixtures couldn't justify filtering first (thermo P2 3)

Confirmed by a run. With `shared` in both lists and the right arm on, `filter_then_merge` keeps 3 elements and `direct_merge_live` keeps 2. Fixed: fixture change and pitfall rewrite. The earlier pitfall wording was also incomplete without this.

### P2 8: `the_only_non_null` has no failure evidence (test P2 2, default P3 3)

Confirmed in source: it raises `FailWorkflowEvaluation`. Fixed: the page says it fails the invocation, and the README cites Galaxy's API test.

### P3s fixed

- MOC names both tools (default P3 2), and adds the plan's consumer warning (domain note).
- Exemplar cited by abstract ID (default P3 5).
- Summary, Operation Boundary and pitfall no longer call `pick_value` the only merge (default P3 6, domain P3 2).
- `state` on the `cat1` steps, and step names match outputs (default P3 4, thermo P3 3). Tool Shed `pick_value` keeps `tool_state`, the shape the page documents.
- Mixed skips cited to Galaxy's `pick_value_mapped_mixed_skip_pja`, which is on `dev` and not `release_26.1` (test P3 2).

### Checked and fine

`make validate check-generated check-casts`, cast contents against sources, and CI picking up the new files by glob. The test challenger's replay through the 0.75.47 checker caught all 13 mutated results at `0070bc1a`. It wasn't repeated on the split files, and neither was the implementer's negative control. The new assertions passed against outcomes the reviewers predicted before the run.

Full reports, all in this directory: `initial_review.md`, `domain_review.md`, `test_challenges_review.md`, `test_challenges_debrief.md`, `risks.md`, `thermo_review.md`.

</details>
