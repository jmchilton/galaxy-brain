# Implementation debrief

**STATUS: READY.** Base `release_26.1` (`df713519127`), head `60607462357`, fork `jmchilton/issue_24389_duplicate_test_params_26.1`. Fixes #24389.

## What it does

1. **Conflicting duplicate test params are reported.** Two params with the same qualified name, at top level, in a `<repeat>`, or in `<repeat><conditional>` (the cutadapt shape), now raise the existing `Ambiguous test parameter (...)` error instead of silently keeping one value.
   - At profile ≥ 24.2 it shows as a `TestsCaseValidation` lint error and a test error at load.
   - Below 24.2 it is a lint warning, and the test still runs on the legacy inputs.
   - Identical duplicates are still tolerated, compared by content.
2. **`<edit_attributes>` test children are stored as dicts**, not lxml elements. This is a separate bug fix: such tools' `ToolTestDescription.to_dict()` couldn't be serialized, so `Tool.tests` became None and `/api/tools/{id}/test_data` raised.

## Commits

1. `f6d8ce3bcbb` Baseline tests: identical duplicates are tolerated. Creates `test_parameter_test_cases_duplicates.py` and passes on base.
2. `07ba880404c` `COMPOSITE_DATA_RENAME_PREFIX` constant (base refactor).
3. `0887ec8a863` The fix:
   - exact-name matches go through `_resolve_matching_inputs`;
   - `_inputs_by_name` keeps repeat duplicates;
   - the `test_case_validation` state build moves inside the `try` (mirrors dev `262e080dfe0`);
   - content comparison via `_comparable_test_input`.
4. `6b6251ff6e2` `edit_attributes` stored as dicts, with a JSON round-trip test.
5. `60607462357` Generated composite renames are ignored inside duplicate collection elements (Codex round 2).

## Decisions

- **No XSD constraint.** I proposed one in the issue comment, but `xs:unique` per test container breaks a working ≤ 24.1 idiom (outer repeat left out of the test), and the XSD can't be gated on profile. Found by the normal review.
- **Legacy runtime below 24.2 is unchanged.** It still keeps the last value; the lint warning is the only signal there.
- **Re-scoped once, after the first scope evaluation.** The `edit_attributes` dict change was added. The alt `_alt_original_scope` (`497b90bc667`) keeps the pre-re-scope version. The second scope evaluation recommends no further change.

## Impact

tools-iuc main (`ace97b1e2`) has 5 tools with genuine conflicting duplicates:

| tool | profile | effect |
|---|---|---|
| sourmash sketch | 25.0 | test now errors at load |
| isoformswitchanalyzer | 25.1 | test now errors at load |
| qiime make_emperor | 18.01 | lint warning only |
| hicexplorer hicAdjustMatrix | 23.0 | lint warning only |
| augustus | 23.1 | lint warning only |

The PR body should name the first two, and should list the `edit_attributes` fix separately.

## Validation

- The 4 unit suites pass: 155 passed, 1 skipped. Red checks were run by overwriting files in the worktree; extracted-lib checks don't work because pytest puts the worktree `lib` first.
- The full `test/unit/tool_util` run has 38 failures, all env/network (mulled, cwl schema fetch, conda, watcher).
- mypy on the touched files: no new errors against base.
- I used the main clone's `.venv`; this worktree wasn't bootstrapped.
- Fork CI not checked.

## Merge-forward to dev

Checked against `origin/dev` on 2026-10-25. Three files conflict:

- `case.py` (dev's `262e080dfe0` in `test_case_validation`): take dev's; keep this branch's resolver, grouping and comparison changes.
- `parser/util.py` (dev adds code after `DEFAULT_DECOMPRESS`): keep both.
- `test_tool_linters.py` (both sides append at EOF): keep both.

## Dev follow-ups

- Carry the generated composite rename outside `edit_attributes`; that deletes the prefix filter and `_comparable_collection`.

## Debriefs

[Initial](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Normal review](subagents/normal_review.md) · [Re-scope review](subagents/rescope_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Round 1](earlier_drafts/1/) · Alt: [original scope](alts/original_scope.md)
