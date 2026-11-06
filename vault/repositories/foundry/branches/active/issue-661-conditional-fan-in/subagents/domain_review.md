# Domain review: `issue-661-conditional-fan-in`

Profile: `wf_foundry/reviewers/foundry_domain_review.md`. Model: Claude Opus 5.5 (`claude-opus-5-5`). Effort: not visible to this agent. Reviewed commit: `0070bc1a`, base `7453431d`.

Nothing was run. Galaxy statements come from reading `release_26.1` at `f1fd95ed067` (`~/.planemo/gx_repo`). Planemo statements come from the local 0.75.x copy and the `planemo` checkout. Casts of `galaxy-conditionals-patterns.md` match their source in all 8 bundles (body compared with frontmatter stripped).

## The specific question: the `Cannot match collection types` sentence

**Verdict: not acceptable as written, and fixable in a few lines. It doesn't need a committed failing test, because Planemo can't hold one.**

The sentence (`conditional-route-between-alternative-outputs.md:176`): "`pick_value` needs the arms to match, and when their lengths differ the invocation fails with `Cannot match collection types`."

Under the domain rules:

- **The fact is well supported, but not by what the page cites.** The page has `evidence: corpus-and-verified`, and `verification_paths` points at a test that doesn't contain this shape. A reader following the citation finds nothing for this sentence.
- **`verification/README.md` already gives the route for this.** Its Eligibility section says behavior a Planemo workflow test can't hold should cite Galaxy's own test instead. It names failed jobs, and a failed invocation is the same situation. I confirmed Planemo has no `expect_failure` (Galaxy's framework test runner does). The new README section states the limitation but stops short of the citation.
- **A citable test exists.** `test_lists_of_different_cardinality_do_not_match` in `test/unit/data/dataset_collections/test_matching.py` covers exactly the 2-versus-3 case, at the matcher level.
- **§1 isn't triggered by the length failure.** Galaxy tests it deliberately, so it's designed behavior and no upstream issue is needed. §1 does apply to the equal-length half (P2 2).
- **"Needs the arms to match" overclaims.** `foundry-documentation` says "Do not strengthen a claim beyond its support". Galaxy's check, `Tree.compatible_shape` (`structure.py:142`), compares only type and shape, and never identifiers. The phrase invites the reading that identifiers must match, which is the case the debrief didn't run and the code says isn't checked.

**What the sentence may claim:**

| Claim | Support | May it state this? |
|---|---|---|
| Built-in `pick_value` over 2 and 3 element arms fails the invocation with this message | One throwaway run, plus the code path to `matching.py:66` and Galaxy's unit test | Yes, with the citation in the README |
| The Tool Shed spelling fails the same way | Code only: `PickValueModule` (`modules.py:2252`) and `ToolModule` (`:2931`) share `compute_collection_info`, and a non-multiple data param is added to the same match. Never run | Unqualified `pick_value` is defensible, but the README must say which spelling ran |
| Arms must match by identifier, or arms of equal length are rejected | Contradicted by the code | No |
| Arms of equal length with different identifiers are safe to pass to `pick_value` | Not run, and the code suggests otherwise | No |

Suggested wording, usable before any further run:

> **Arms mapped over different collections.** Galaxy pairs mapped inputs by position and checks only their shape, so `pick_value` fits only arms mapped over the same collection. Arms of different lengths fail the invocation with `Cannot match collection types`. Filter each arm with `__FILTER_NULL__`, then merge the results with `__MERGE_COLLECTION__`. The output holds only the live arm's elements:

The "by position" clause rests on `_walk_collections` (`structure.py:118`), which indexes each collection by position. Replace it with the observed result once P2 2 runs. In the README, replace the current paragraph with something like:

> Galaxy's `test_lists_of_different_cardinality_do_not_match` covers the different-length failure. A Planemo test can't hold a failed invocation, so this workflow doesn't include that shape. A manual run of built-in `pick_value` on `release_26.1` failed with `Cannot match collection types`; the Tool Shed spelling wasn't run.

Optional and stronger: add a Galaxy framework test with `expect_failure: true` beside the `pick_value_*_mapped` tests, then cite that.

## Findings

### P2 1: The mismatch sentence overclaims and cites nothing that covers it

Section: §1 and `verification/README.md` Eligibility; `foundry-documentation` claim strength. See above. Ask: use the wording above, and cite Galaxy's test in the README.

### P2 2: Equal-length arms over different collections aren't covered, and the code predicts a silent wrong answer

Section: §5 "Get it right in this PR"; §1 "A suspected upstream bug gets verified and written up as issue text".

This is the more dangerous half. `compatible_shape` ignores identifiers and `_walk_collections` slices by index, so arms of equal length should pass matching and pair positionally. The output's identifiers should come from the linked structure, which is the first input in sorted order. Expected result (prediction from code, not run): with the right arm live, the output holds `b1`, `b2` content under `a1`, `a2` identifiers, with no error. The same applies to two lists with the same identifiers in different orders.

The page's rule (different collections, so filter then merge) already steers around this, so the recipe stands. But the only reason the page gives is length, so a reader with equal-length collections will conclude `pick_value` is fine.

Unlike the length mismatch, this shape doesn't fail the invocation, so **it can be a committed test**. Ask:

- Add an equal-length, different-identifier pair of lists and a built-in `pick_value` step to `route-mapped-fan-in`, asserting what happens.
- Let the page follow the result, in one clause.
- If the prediction holds, write upstream issue text (or record why it's by design), per §1.

### P2 3: Filter-then-merge doesn't detect zero or two live arms, and the page doesn't say so

Section: §5 "Get it right"; consistency with the page's own guidance.

The sentence just before the new one in the MOC (`galaxy-conditionals-patterns.md:50`) says to choose merge behavior that detects zero or multiple live outputs. The route page says "Ordering candidates only settles the outcome under `first`" and steers exclusive routes to `only`. The new recipe gives that up. From the workflow's shape, both gates on should give the union (or first-wins on shared identifiers), and both off should give an empty collection, each without an error. The committed test only turns on one side at a time, so this is inference.

Ask: add one sentence stating the loss of that check. Add a both-on case to the test; both-off can't be asserted because of the `element_count: 0` skip (P2 5).

### P2 4: The page now contradicts itself on which `pick_value` to use

Section: §5 "Future-facing over corpus-majority legacy"; §4 "Text that will go stale".

The Tool section (`:50`, untouched) says "The shapes below use the toolshed tool — that is the established pattern, and all 63 corpus steps use it. Galaxy's built-in `pick_value` module will generally be preferred in the future." The new section says "For new work, use Galaxy's built-in module" and shows the built-in. So "shapes below" is now false, and "in the future" conflicts with the new guidance. The scalar binary shape, the first one an agent reads, still leads with the Tool Shed tool, and its corpus count sits in prose.

The built-in recommendation is only checked for mapped arms on this branch, so don't extend it to scalars without checking. Ask: rewrite that paragraph so built-in is the recommendation with Tool Shed as the spelling existing workflows use, and either add a built-in scalar shape (the Galaxy `pick_value_*` framework tests can be cited) or scope the recommendation to what's verified.

### P2 5: The README documents suspected upstream bugs as prose, with no issue text

Section: §1 "A suspected upstream bug gets verified and written up as issue text, not documented as prose".

`verification/.../README.md` says "Planemo can't read a null element's content" and "It can't check a count of zero either, because `element_count: 0` is skipped as falsy". I confirmed the falsy check at `interactor.py:1534` on `release_26.1`; `min` and `max` have the same form on the next lines. Galaxy's own `filter_null.gxwf-tests.yml` appears to rely on an `element_count` check for its discard case, which may mean it isn't testing what it says (I read only the start of that file; the debrief reports it asserts `0`).

The debrief says no issue text exists and that `dev` wasn't checked. `same_arms_direct_merge_live_plus_right_samples` is a workaround step that exists only because of this. Ask: check `dev`, write issue text for both (this and the Planemo `TypeError` on a null `element_tests` entry), and reduce the README to one line on why the step exists, linked to the issue.

### P3 1: The different-collections recipe has no corpus backing, which should be John's call

Section: §6.7 "Corpus-first"; §5 "route the call to John"; §1 workaround recipes.

`__FILTER_NULL__` has zero IWC uses. The evidence is the synthetic test plus an agent-built draft (`prose-wb2g-cutandrun-v0`). Three sibling pages warn against reaching for it: `conditional-run-optional-step.md:137`, `conditional-transform-or-pass-through.md:138` and `conditional-gate-on-nonempty-result.md:144`. Those warnings are about non-mapped shapes, so this isn't a strict contradiction, but the recipe now reads as equally established as the corpus-backed one under a page marked `corpus-and-verified`. Removing the MOC's "found no IWC use" sentence was right (§4), but nothing replaces the signal.

Ask: confirm with John that this is the recommendation, and consider whether the gap should be solved upstream. If it stays, say in one clause that no IWC exemplar exists, and point `conditional-transform-or-pass-through.md:138` at the mapped case so the pages agree.

### P3 2: The page's frame still says `pick_value` is the only merge

Section: §6.4 and page consistency.

The `summary`, "Operation Boundary" (`-> pick_value merge ->`, "should connect to the `pick_value` output") and the "Forgetting the merge" pitfall ("should consume `pick_value`") don't allow for the filter-then-merge route. Ask: say "the merge" in those lines.

### P3 3: Boilerplate in the new snippet and workflow

Section: §4 "Ask whether boilerplate entries are needed"; §5 "`state` over `tool_state`".

- `duplicate_options: keep_first` in the page snippet: `keep_first` is the tool's default (`merge_collection.xml:67`, and the page's pitfall says so), and one filtered arm is empty in the routed case. It may stay only if it's there on purpose for the both-live case (P2 3). Otherwise drop it.
- `route-mapped-fan-in.gxwf.yml` uses `tool_state` with `__class__: ConnectedValue` on the `cat1` steps and `state` elsewhere. New workflow text should prefer `state` and drop entries it doesn't need. The Tool Shed `pick_value` step is the exception if its `pick_from` entries require the shape the page documents.

### P3 4: Archaeology in the same README

Section: §4 "Archaeology", which applies even to untouched lines.

"The page carried a conceptual `tool_id: pick_value` snippet..." (README, pre-existing) is history. Ask: keep the correct-shape half and drop the rest.

## Checked, no finding

- Direct-merge pitfall matches the committed test, including how the "0 live" result is reached.
- Built-in first for new work follows §5, and the mapped test backs it.
- Functional_annotation_of_sequences does use the Tool Shed spelling over arms mapped on one collection (inside a subworkflow, at `pick_style: first`), so the exemplar sentence holds.
- `the_only_non_null` as the counterpart of `only` matches the code (`len(non_null) != 1` fails). It fails workflow evaluation rather than a job, and the branch doesn't exercise that path; not worth more prose.
- Revision bumps, aliases and `verification_paths` are as planned. Dashboard changes follow the frontmatter.

## Notes for the coordinator

- The debrief reports that `planemo lint`, the command in `verification/README.md`, isn't a check on these workflows. That README isn't touched here, so this is a follow-up rather than a finding on this branch. Its "Planemo 0.75.41" line also looks old.
- The plan's MOC rule included "a step that consumes a gated step's mapped output sees nulls". The MOC says a null element is left but not that sentence's consumer warning. The route page's mapped recipe doesn't reach repair's bundle until #738, as planned, and until then the MOC names `__FILTER_NULL__` but not `__MERGE_COLLECTION__`.
- Tests worth running if the branch is amended: equal-length different-identifier arms through built-in `pick_value` (P2 2), both gates on (P2 3), and one throwaway of the Tool Shed spelling over different lengths.
