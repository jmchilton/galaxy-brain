# Implementation debrief

`issue-661-conditional-fan-in`, base `origin/main` `7453431d`, head `0070bc1a`. Part of #661.

## What changed

- `conditional-route-between-alternative-outputs` (rev 5): a "Mapped branches" section and a direct-merge pitfall. Built-in `type: pick_value` comes first for new work, because the test passed.
- `galaxy-conditionals-patterns` (rev 5): the rule that picks a recipe, on the map-of-content page that repair's bundle gets through `issue-669-repair-contract`. The sentence about no IWC use is gone.
- `verification/workflows/conditional-route-between-alternative-outputs/`: `route-mapped-fan-in` with its test, tiny data and a README section.

## Evidence

**`planemo test` ran.** `planemo` 0.75.47 with `--galaxy_branch release_26.1`: 2 of 2 passed, on a live Galaxy.

| Shape | Left arm on | Right arm on |
|---|---|---|
| Same list, Tool Shed `pick_value` (`only`) | 2 elements, left content | 2 elements, right content |
| Same list, built-in `pick_value` (`the_only_non_null`) | 2 elements, left content | 2 elements, right content |
| Different lists, filter then merge | `a1`, `a2` only | `b1`, `b2`, `b3` only |
| Same list, direct merge | 2 live elements | 2 elements, 0 live |
| Different lists, direct merge | 5 elements, 2 live | 5 elements, 3 live |

Two controls, as throwaway runs in scratch, not committed:

- **Negative control.** Setting the expected counts of 3 to 4 failed the right-arm case with three count errors, so those assertions do bite.
- **Mismatch.** Built-in `pick_value` over the 2- and 3-element arms failed the invocation with `Cannot match collection types`. The page's sentence rests on this one run. I didn't run the Tool Shed spelling on this shape, or arms of equal length with different identifiers.

`planemo lint`, the plan's and `verification/README.md`'s command, is not a check here: it exits 2 with no output on this workflow and on the existing `route-between-alternatives`, because it lints tools. I ran `planemo workflow_lint` instead. Tests, tool ids and tool versions all pass. It exits 1 on missing-annotation warnings, as the existing workflow does (which also warns on its license). `gxwf validate --no-tool-state` passes.

## What differs from the research and #661

- A direct merge of same-list arms gives N elements from the first arm, all null when it's skipped, as the research read from the code. That's now checked on `release_26.1`. #661's "3N" doesn't happen on this shape.
- The research said the merge of different lists was only a driver probe. It's now a committed test.

## Upstream, for John

Neither is in Foundry prose except the README's note on how the test is built.

- `galaxy.tool_util.verify.interactor.verify_collection` skips `element_count: 0`, because the check is `if output_collection_def.count and ...`. A test asserting an empty collection passes on any count. Galaxy's own `filter_null.gxwf-tests.yml` asserts `element_count: 0`, so that check may not be doing what it says.
- Planemo raises `TypeError` in `_verify_output_file` when `element_tests` names a null element, and the whole run dies with no report.

I read these in the Planemo environment's copy and didn't check `dev`, and no issue text is written.

## Local gate

`make -k check` at `0070bc1a`: everything passes (496 tests, 15 fixtures) except `check-vendored`, the known machine-only failure, and `validate-roadmap`, which fails the same way on clean `origin/main` `7453431d` because it reads live GitHub labels. CI hasn't run, since it starts when the PR opens.

## Collisions

#738: cast regeneration only. #696: revision and `related_molds` lines. `issue-669-repair-contract`: recast only, in either order.
