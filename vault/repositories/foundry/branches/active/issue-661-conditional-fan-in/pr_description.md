Extends the route pattern to mapped `when`-gated branches, which it didn't cover. A gated step mapped over a collection leaves a null element for each skipped job, so a fan-in must select per element.

- Arms mapped over the same collection use `pick_value`. The page leads with the built-in module, which needs `release_26.1` or later.
- Arms mapped over different collections use `__FILTER_NULL__` on each arm, then `__MERGE_COLLECTION__`. Don't use `pick_value` here even when the lengths match: Galaxy pairs mapped inputs by position, so equal-length arms succeed with the right arm's data under the left arm's identifiers.
- A direct merge of gated arms is a pitfall. Under the default `keep_first`, a skipped first arm's null beats a live element with the same identifier, and filtering afterwards can't recover it. This differs from #661's account: same-list arms give N elements, not 3N.
- `galaxy-conditionals-patterns` carries the rule that picks a recipe. Two sibling pages' `__FILTER_NULL__` pitfalls now point at the mapped recipe.

Part of #661.

## For John to confirm

- This uses `the_only_non_null` and `pick_style: only` where #661 proposed `first_or_error`, following the page's own guidance.
- No IWC workflow uses filter then merge, and the page says so. Its evidence is the verification test. Recommending it is an expert call.
- The recipe doesn't enforce one live arm. With both arms on, the output holds both arms' elements, and the first arm's wins on a shared identifier. The page says the booleans have to be exclusive.

## Evidence

`planemo test` with Planemo 0.75.47 and `--galaxy_branch release_26.1`, on a live Galaxy, against the workflows as committed:

- `route-mapped-same-arms`: 2 of 2 passed.
- `route-mapped-different-arms`: 3 of 3 passed.

| Shape | Left arm on | Right arm on | Both on |
|---|---|---|---|
| Same list, Tool Shed `pick_value` (`only`) | 2 elements, left content | 2 elements, right content | not run |
| Same list, built-in `pick_value` (`the_only_non_null`) | 2 elements, left content | 2 elements, right content | not run |
| Same list, direct merge | 2 live elements | 2 elements, 0 live | not run |
| Different lists, filter then merge | `a1`, `shared` | `b1`, `shared`, `b3` | all 4, `shared` from the left arm |
| Different lists, direct merge | 4 elements, 2 live | 4 elements, 2 live, `shared` lost | not asserted |
| Equal lengths, different identifiers, built-in `pick_value` (`first_non_null`) | `a1`, `shared`, left content | `a1`, `shared`, right content | not asserted |

**Backed by committed tests:** every row above.

**Not backed by a committed test**, because Planemo can't expect a failed invocation. The verification README lists these with what stands behind them:

- Arms of different lengths failing with `Cannot match collection types`. Galaxy's `test_lists_of_different_cardinality_do_not_match` covers it, and one manual run of the built-in on `release_26.1` showed the message. That run predates the review pass. The Tool Shed spelling wasn't run; it goes through the same matching code by reading.
- `the_only_non_null` with more than one live input failing the invocation. Galaxy's `test_pick_value_the_only_non_null_error_multiple` covers it, unmapped.

**Not tested:**

- Neither arm on, because an empty collection can't be asserted: `element_count: 0` is skipped as falsy.
- A mix of skipped and live elements within one arm. Gates here are workflow-level booleans. Galaxy's `pick_value_mapped_mixed_skip_pja`, on `dev`, covers it for the built-in.
- `planemo lint` checks nothing on these workflows: it exits 2 with no output, as it does on the existing `route-between-alternatives`, and CI runs it under `continue-on-error`. `planemo workflow_lint` passes tests, tool ids and tool versions, with missing-annotation warnings. `gxwf validate` passes with tool state.

CI's `planemo` job passes all five tests on `release_26.1`. The new workflows add one Galaxy boot each to `verification-workflows.yml`.

`make -k check` passes everything except two failures that also occur on clean `main`: `check-vendored` (this machine's upstream checkouts) and `validate-roadmap` (live GitHub labels; a 403 rate limit on this run).

CI's `changeset` passes. Its `test` job is red at `validate:roadmap`, the step that also fails on `main` at this PR's base, so it skips every later step. I ran the skipped steps `make -k check` doesn't cover at this head: `check:kinds`, `typecheck`, package tests (16 skipped), `smoke:packages`, `format`, `lint` and `site:build` all pass. Two skipped steps have no passing run: the Pi container boundary test wasn't run, and `check-vendored` is the failure above.

## Limits of this PR

- The leaf page doesn't reach repair's bundle until #738 lands. Until then the map-of-content page carries the rule, through #753, and names both tools.
- #661 stays open until #753 and #738 land.
- A few suspected upstream problems came up, including `element_count: 0` checking nothing and Planemo's `TypeError` on a null element. None is filed yet.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
