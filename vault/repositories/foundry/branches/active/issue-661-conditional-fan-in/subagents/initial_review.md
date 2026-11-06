# Initial review: `issue-661-conditional-fan-in`

Profile: default (`_shared/reviewers/default.md`). Model: Claude Opus 5.5 (`claude-opus-5-5`). Effort: not exposed to this agent. Reviewed commit: `0070bc1a`, base `origin/main` `7453431d`.

I did not run `planemo test`, per the brief. The Galaxy behavior below comes from reading `origin/release_26.1` and `dev` in `~/projects/repositories/galaxy`, and each finding says what was and wasn't run.

The core of the branch holds up. The tests match the page's positive claims, and no P1 turned up. The findings are about what the new recipe leaves unsaid, and about how it sits with the rest of the conditionals pages.

## P2

### P2 1: Equal-length arms over different lists pass `pick_value` silently, with the wrong identifiers

The page says "`pick_value` needs the arms to match, and when their lengths differ the invocation fails". That leaves "match" undefined and implies a mismatch fails loudly. Galaxy only compares shape, so two different lists of equal length are accepted and paired by position. The output then labels the right arm's data with the left arm's identifiers, and nothing fails.

This is the worst outcome for the case the section exists for. An agent whose arms happen to have equal lengths can reason that `pick_value` works, and it will appear to. The debrief already names this shape as not run.

Evidence, by code reading on `release_26.1` (not run):
- `lib/galaxy/model/dataset_collections/structure.py:142` `compatible_shape` compares collection type, child count and leaf-ness, never identifiers.
- `structure.py:118` `_walk_collections` slices every input by `index`.
- `lib/galaxy/workflow/modules.py`, `_execute_mapped` names each element from the first mapped input in sorted order.

Fix: this can run under Planemo, because nothing fails. Add a shape to `route-mapped-fan-in` with two different equal-length lists through built-in `pick_value`, and assert the identifiers it really gives. Then state the result in the page, for example: arms pair by position and keep the first arm's identifiers, so a length check doesn't make different lists safe. Add the Tool Shed spelling if it's cheap, since it goes through the same matching code.

### P2 2: Filter-then-merge drops the exactly-one guarantee, and the page doesn't say so

The MOC bullet tells the reader to "choose merge behavior that detects zero or multiple live outputs rather than silently taking the first", and the same bullet then gives filter-then-merge as the rule for different collections. That recipe detects neither case. With both arms on it returns the union, or silently drops colliding identifiers under `keep_first`. With both arms off it should return an empty list, and downstream map-over then runs nothing.

The route page's "Non-exclusive booleans" pitfall only covers `pick_style`. The test cases only turn one arm on at a time, so these outcomes are unverified.

The snippet's `duplicate_options: keep_first` also adds nothing. It's already the default (`lib/galaxy/tools/merge_collection.xml:67`) and only matters in the case the recipe should be warning about. `fail` is available (`:69`) and at least rejects colliding identifiers. It can't catch both arms live when identifiers differ.

Fix:
- Add a both-on test case, which needs no workaround and pins the union. Add a neither-on case too, if the empty result can be asserted.
- State in the recipe that it does not enforce exclusivity, and that the booleans must.
- Either use `fail` or drop the `advanced` block.

### P2 3: "For new work, use Galaxy's built-in module" has no version floor and conflicts with the page's own Tool section

`PickValueModule` is absent from `release_25.1` and `release_26.0` and present in `release_26.1` (`lib/galaxy/workflow/modules.py:2090`). `content/research/cwl-pickvalue-to-galaxy/index.md:109` already warns that such workflows won't import on older Galaxy, and `conditional-transform-or-pass-through.md:83` names `release_26.1`. The new recommendation gives no floor, so an agent targeting an older server gets a workflow that won't import. DOMAIN_REVIEW §5 asks for the built-in preference and also asks to check versions.

The page now also speaks with two voices. The Tool section still says the shapes "use the toolshed tool — that is the established pattern" and that the built-in "will generally be preferred in the future", while the new section says to use it for new work. Nothing says whether that covers an unmapped route, and `route-between-alternatives` doesn't test the built-in on that shape.

Fix: state the `release_26.1` floor once, in the Tool section, and move the recommendation there so one rule covers both. If the built-in is to be recommended for unmapped routes as well, add it to `route-between-alternatives`. Otherwise say the recommendation is for mapped routes only.

### P2 4: The page recommends `__FILTER_NULL__` while sibling pages list it as a pitfall

These lines are untouched and still steer readers away from what the MOC now recommends:
- `conditional-run-optional-step.md:137`: "keep it as catalog knowledge, not the corpus-backed authoring path".
- `conditional-transform-or-pass-through.md:138`: "Reaching for `__FILTER_NULL__`" listed under pitfalls.
- `conditional-gate-on-nonempty-result.md:144`: "Do not cite `__FILTER_NULL__` as an IWC-backed conditional pattern".
- `iwc-conditionals-survey/index.md:134`: "Its fit needs separate evidence".

Those sentences aren't strictly false, but a reader who follows the links gets opposite advice with no rule for choosing between them.

The route page also still declares `evidence: corpus-and-verified`, and this one recipe has no corpus use. The MOC sentence that said so is the one this branch deleted, so the MOC no longer signals it. The plan directed that deletion, and the claim that the recipe works is well supported. Whether it is the recommended practice is an expert call (§5, §6.7). Its only real-world shape is an agent-built run under `foundry-runs`.

Fix: John confirms the recommendation. Then narrow the sibling pitfalls to what they mean, for example that `__FILTER_NULL__` is not for unmapped optional steps, and point them at the route page's mapped section. Mark in the route page that this recipe is verified, not corpus-observed.

### P2 5: The README documents upstream gaps, and the workflow carries a workaround for one, with no issue text written

The last two README paragraphs state that Planemo can't hold a failed invocation, can't read a null element's content, and can't check a zero count. `same_arms_direct_merge_live_plus_right_samples` exists only to work around the last of these. DOMAIN_REVIEW §1 flags both the sentences and the derived-dataset recipe, and says a suspected upstream bug gets verified and written up as issue text. The debrief says no issue text exists.

Status of each gap:
- **Zero count:** confirmed on Galaxy `dev`, where the debrief hadn't checked. `lib/galaxy/tool_util/verify/interactor.py:1675` is `if output_collection_def.count and ...`, and `min` and `max` have the same shape at `:1678` and `:1681`. Galaxy's own `lib/galaxy_test/workflow/filter_null.gxwf-tests.yml:32` asserts `element_count: 0`, so that assertion checks nothing. This is a small upstream fix.
- **Null element `TypeError`:** I didn't verify this.
- **Failed invocation:** Galaxy's own framework has this (`expect_failure`, `lib/galaxy_test/workflow/test_framework_workflows.py`). A grep of Planemo's `planemo/galaxy/activity.py`, `planemo/engine/` and `planemo/test/` found no equivalent.

Fix: write the issue text for the zero-count check and the other two gaps, for John to file. Once the zero-count fix is available, assert `element_count: 0` on the filtered output and delete the marker step and the README sentence. If the step stays in the meantime, cut the README to one line saying what the step asserts.

## P3

### P3 1: The mismatch sentence rests on a discarded scratch run

"The invocation fails with `Cannot match collection types`" has no committed test, and the debrief says the page sentence rests on one throwaway run. `verification/README.md` already gives the convention for behavior a Planemo test can't hold: cite Galaxy's own test.

Galaxy has one, `test/unit/data/dataset_collections/test_matching.py::test_lists_of_different_cardinality_do_not_match`. By code reading, the debrief's Tool Shed gap also closes: `compute_collection_info` (`modules.py:721`) is shared by `PickValueModule` (`:2252`) and tool steps (`:2931`). Cite the test in the README.

### P3 2: The MOC names no merge tool, and the MOC is all the bundles get

The eight recast bundles copy the MOC, not the route page. Until #738 lands, an agent working from them reads "filter nulls and then merge", and the `[[conditional-route-between-alternative-outputs]]` link leads to a page they don't have. `__FILTER_NULL__` appears further down, under "Clean a collection instead", and `__MERGE_COLLECTION__` not at all.

Fix: name both tool ids in the rule sentence, and fold the "Clean a collection instead" sentence into it.

### P3 3: `the_only_non_null` is not quite the counterpart of `pick_style: only`

The page says `only` fails the job, while the built-in raises `FailWorkflowEvaluation` (`modules.py:2229-2236`), so one bad element fails the whole invocation at scheduling time. That changes what a reader sees when debugging. The other modes don't line up either: `first_non_null` fails when all inputs are null, while `pick_style: first` returns null.

Fix: say the failure is at invocation level, and link `[[cwl-pickvalue-to-galaxy]]` for the modes. It isn't in `related_notes` yet.

### P3 4: The new verification workflow mixes `tool_state` and `state`

The `cat1` and Tool Shed steps use `tool_state` with `__class__: ConnectedValue`, and the rest of the file uses `state`. §5 prefers `state`. The Tool Shed step mirrors the page's existing shape, but the new `cat1` steps could use `state` and drop the `ConnectedValue` boilerplate.

### P3 5: The exemplar is cited by bare name

"The Functional_annotation_of_sequences exemplar" should use the abstract ID, `genome_annotation/functional-annotation/functional-annotation-of-sequences/Functional_annotation_of_sequences`, per `AGENTS.md`. The claim itself checks out: the IWC workflow gates steps on `Sequence collection` and merges them with Tool Shed `pick_value`, though at `pick_style: first`.

### P3 6: The page's framing still says `pick_value` is the only merge

The `summary`, the Operation Boundary diagram, "The reusable operation is the merge...connect to the `pick_value` output" and the "Forgetting the merge" pitfall ("should consume `pick_value`") all still describe `pick_value` only. The mapped recipe's output comes from `__MERGE_COLLECTION__`. The summary is what catalogs route on, so it should mention mapped branches. Also add `[[galaxy-collection-tools]]` to `related_notes`, because it documents both new tools.

## Checked and fine

- Generated output: `make validate check-generated check-casts` passes and the tree stays clean. All 8 cast copies of the MOC are byte-identical to the source, and the provenance diff looks routine.
- Workflow validity: `gxwf validate` with tool state passes on `route-mapped-fan-in`, 13 validated and 0 skipped.
- CI: `verification-workflows.yml` picks up the new file by glob and uses `release_26.1`.
- Page claims against Galaxy source: `keep_first` is the `__MERGE_COLLECTION__` default, `__FILTER_NULL__` 1.1.0 and `__MERGE_COLLECTION__` 1.0.0 exist on `release_26.1`, and the module's `input_N` terminals, `output` and `the_only_non_null` match the snippet.
- Test assertions: the dict and list forms of `asserts` are both accepted. The direct-merge pitfall matches the test expectations, and the identifier-free counts 5/2 and 5/3 imply the nulls the page describes.

## Out of scope, noted for the coordinator

- `planemo lint` exits 2 with no output on both workflows, which I reproduced with 0.75.47. CI runs it under `continue-on-error: true`, so the lint step checks nothing, and `verification/README.md` still recommends it. This predates the branch and deserves a separate small fix.
- Whether `__MERGE_COLLECTION__` under `keep_first` should prefer a skipped null over a live element may be worth asking upstream. It reads as defined merge behavior, so I didn't flag it under §1, but the pitfall exists only because of it.
