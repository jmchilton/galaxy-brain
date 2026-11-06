# Thermo review: `issue-661-conditional-fan-in`

- Profile: `_shared/reviewers/thermo_review.md`
- Model: Claude Opus 5.5 (`claude-opus-5-5`). Effort: not stated in the brief.
- Reviewed commit: `0070bc1a`, base `origin/main` `7453431d`. Not a PR.
- Scope: `route-mapped-fan-in.gxwf.yml`, `route-mapped-fan-in.gxwf-test.yml`, the directory README and the two pattern pages. Nothing was run. Every suggested change below is unexecuted, and behavior predictions are marked as predictions.

## Verdict

The workflow is well named and its test is thorough, but the file pair is the wrong size for this tree. `verification/README.md` asks for a workflow that exercises "one pattern operation". This one holds two disconnected graphs, and its test repeats the same assertion blocks. Don't merge the structure as is. Split it by arm shape, anchor the repeated assertions, and change one fixture identifier so the different-arms outputs stop proving the same thing twice.

The prose is fine. The casts and Dashboard match their sources (spot-checked one cast's `galaxy-conditionals-patterns.md` diff and the Dashboard rows).

## How it compares with siblings

| Measure | Largest sibling | `route-mapped-fan-in` |
| --- | --- | --- |
| Workflow lines | 162 | 245 |
| Test lines | 94 | 272 |
| Workflow outputs | 5 | 7 |
| Inputs, outputs and steps (`- id:` at list level) | 12 | 28 |
| Workflows using `state:` | none | 9 of its 14 steps |
| Test files using YAML anchors | none | this one |

This is also the first page with two `verification_paths` and the first slug directory with two workflows. `verification/README.md` still says "One workflow file". A second workflow here is defensible, because the mapped claim differs from the scalar one. Neither the validator (`validatePatternVerificationPaths` takes any list) nor CI (`git ls-files` plus a per-workflow loop) limits the count, so splitting further needs no tooling change.

## Findings

### P2 1: One workflow holds two disconnected graphs; split it by arm shape

The 14 steps form two graphs with no shared step:

- **Same arms:** `same_left`, `same_right`, two `pick_value` spellings, the direct merge, its filter and the sentinel merge. Inputs are `samples`, `left_marker` and `right_marker`.
- **Different arms:** `different_left`, `different_right`, two filters, the filtered merge, the direct merge and its filter. Inputs are `left_samples` and `right_samples`.

The graphs share only the two booleans, plus one incidental edge: the sentinel step reads `right_samples` (P3 1). Nothing is verified by having them in one invocation. Each graph's outputs depend only on its own steps, so a reader tracing one claim has to filter out the other graph's steps, inputs and fixtures. Every test case also has to supply all five data inputs, though the different-arms graph needs two and the same-arms graph needs three plus the sentinel's list.

The page already draws this line. `## Mapped branches` has two bold headings, "Arms mapped over the same collection" and "Arms mapped over different collections". The split is mechanical and matches them:

- `route-mapped-same-arms.gxwf.yml`, with about 8 steps.
- `route-mapped-different-arms.gxwf.yml`, with about 7 steps.

Together with P2 2, I estimate each workflow at about 110 to 130 lines and each test at about 80 to 110, which puts both near `relabel-via-rules-and-find-replace` at 162 and 94. Add one `verification_paths` entry and name each file in the README's two blocks. Update `verification/README.md`'s "One workflow file" line, which this branch already breaks.

The cost is one more Galaxy boot in CI, because `verification-workflows.yml` runs `planemo test` once per workflow in series. I think that's worth paying: a focused file is what the tree promises, and a failure then names the shape that broke.

Don't split recipe from pitfall instead. Both groups consume the same gated arms, so that split would duplicate the `cat1` steps.

### P2 2: The test repeats the same assertion blocks; about a third of the file is copies

Parsing the test and comparing `element_tests` across outputs gives these identical groups:

- **Left case:** 3 outputs share the s1/s2 block (`same_arms_tool_shed_pick_value`, `same_arms_builtin_pick_value`, `same_arms_direct_merge`).
- **Left case:** 3 outputs share the a1/a2 block (`different_arms_filter_then_merge`, `different_arms_direct_merge`, `different_arms_direct_merge_live`).
- **Right case:** 2 outputs share the s1/s2 block.
- **Right case:** 4 outputs share the b1/b2/b3 block, including the sentinel output.

The file already uses `&job` and `<<: *job`, so the anchor mechanism is in use here. Define `&same_left`, `&same_right`, `&left_elements` and `&right_elements` on the first use of each and alias the rest. That removes about 95 of the 272 lines and shows at a glance that these outputs must agree, which is the claim. Today a reader has to diff the blocks by eye.

Use the list form of `asserts` throughout (`- that: has_text`). The file mixes it with the `has_text:` map form, and the only reason is that some elements need two assertions.

### P2 3: The different-arms fixtures can't distinguish the recipe from a shorter one

`different_arms_filter_then_merge` and `different_arms_direct_merge_live` have identical assertions in both test cases. So this test shows merge-then-filter (2 steps) doing what the page's recipe does with filter-then-merge (3 steps). A reader of the test has no reason to prefer the recipe, and the page doesn't give one.

The likely reason is overlapping identifiers, and the fixtures avoid that case: `a1`, `a2` against `b1`, `b2`, `b3`. "Different collections" doesn't mean disjoint identifiers. The page's own pitfall says a direct merge keeps the first arm's element when identifiers are shared, so a merge done first would lose a live element to a null, and the filter can't recover it.

Change one fixture so a single identifier is shared, for example renaming `a2` and `b2` to `shared`. Predicted results, not run:

| Case | `filter_then_merge` | `direct_merge` count | `direct_merge_live` |
| --- | --- | --- | --- |
| Left on | `a1`, `shared` | 4 | `a1`, `shared` |
| Right on | `b1`, `shared`, `b3` | 4 | `b1`, `b3` (the live `shared` is lost) |

This one rename gives `different_arms_direct_merge_live` a claim of its own, proves why the filters come first, and leaves the step count unchanged. Add one clause to the page saying why the filters run before the merge. If the prediction fails on Galaxy, the shorter merge-then-filter is the recipe and the page should say so.

### P3 1: The sentinel merge is indirect; the tree has a more direct emptiness idiom

`same_arms_direct_merge_live_plus_right_samples` exists because `element_count: 0` is skipped as falsy. It merges the filtered output with an unrelated list so that "3" can mean "none". It works and the README explains it, but it takes a paragraph to explain, it has the longest name in the file, and it's the only edge between the two graphs in P2 1.

`conditional-gate-on-nonempty-result` already handles this: `collection_element_identifiers` accepts an empty list (its false-path test feeds `elements: []`). Replacing the sentinel with that step, plus `asserts: has_size` of 0 or `has_n_lines` of 0 on the output, states the emptiness directly and removes the merge. This workflow already depends on a Tool Shed tool, so that adds no new kind of dependency. Whether the identifiers output of a filtered, all-null collection is zero bytes needs one run, since the sibling reaches its count through `wc_gnu` rather than asserting the file directly. If it doesn't work out, keep the sentinel with its own small input once the split removes `right_samples` from this graph.

### P3 2: `keep_first` is spelled out on one merge of four and can't fire

`different_arms_merge` sets `advanced.conflict.duplicate_options: keep_first`. The other three merges omit it. Galaxy's `lib/galaxy/tools/merge_collection.xml` marks `keep_first` as the selected default, and the page's pitfall says so too. With one arm live and disjoint identifiers, no conflict arises in any test case.

The block was copied into the page's recipe, where it reads as a required setting. Drop it from both, which shortens the recipe by 3 lines. If it stays to document non-exclusive gates, say so in the page. `galaxy-conditionals-patterns` tells readers to choose merge behavior that detects multiple live outputs rather than silently taking the first, and `keep_first` is the silent option here. `duplicate_options: fail` is the guard, though Planemo can't verify it because a failed job fails the test.

### P3 3: Output names and state spelling drift from the rest of the tree

- Five outputs match their step names. Two don't: `same_arms_tool_shed_pick_value` comes from step `same_arms_pick_value`, and `different_arms_filter_then_merge` comes from step `different_arms_merge`. Rename the steps to match.
- Every other verification workflow uses `tool_state:` with `__class__: ConnectedValue`, including those that call `__FILTER_EMPTY_DATASETS__`. This file uses `tool_state:` on 5 steps and `state:` on 9, sometimes `state: {}`. Built-in `type: pick_value` may need `state:`. Check whether `__FILTER_NULL__` and `__MERGE_COLLECTION__` work with the sibling spelling, and use it if they do, so one file doesn't carry two conventions.

## Not flagged

- The asymmetry between `same_*` (with marker) and `different_*` (no marker) arms is justified: same-input arms need a marker to show which arm ran, and different-input arms already differ.
- `element_tests: {}` at line 221 is unique in the tree. It correctly says "two elements, content unreadable", so I left it.
- The 245 and 272 line counts are nowhere near the 1k threshold. The issue is scope, not file size.
- No follow-up refactor issue file: this branch targets `main`, and all of the above fits in the branch.
