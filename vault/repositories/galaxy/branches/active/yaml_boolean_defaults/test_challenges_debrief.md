# yaml_boolean_defaults — test challenges debrief (second pass)

This pass challenged the re-scoped branch's tests per `_shared/GX_PROCESS_CHALLENGE_TESTS.md` against `origin/release_26.1`, merge-base `6df388987b4`. Every step was redone fresh; nothing was carried over from the first pass. Actions taken: three positional `inputs[0]` lookups now also assert the input name, and the test-helper cache-flag fix moved ahead of the baseline commit. A fresh per-commit red/green check confirmed that every case is owned by the right commit. Old tip `d31abb1b55b`, new tip `975b9157f50` (needs force-push). `lib/galaxy/` is byte-identical to the old tip.

## Unit tests

None. The branch has no `test/unit` changes, so there was nothing to drop, rewrite or de-mock. No new unit tests were warranted. Every contract crosses parsing, the `/build` form, and job rendering under three input formats, which is API territory per `writing_tests.md`'s decision tree.

## API tests (`lib/galaxy_test/api/test_user_tool_contract.py`)

- **Strengthened.** `test_omitted_optionality`, `test_optional_boolean_omitted` and `test_optional_boolean_null` took `build()["inputs"][0]` without checking which input they got. Each now asserts the name: `text` and `parameter` are passed as a new param, and the Boolean tools use `flag`. This matches the repeat/section/conditional tests. The changes were folded into the commits that own them.
- **Helpers.** The module makes no raw HTTP calls. Build, create and runtime-model each go through a single populator `*_raw`/convenience pair. Job requests go through `DescribeToolExecution`, with `tool_uuid` support. No endpoint is called twice outside a helper, so no new helpers were needed.
- **Framework-test alternative.** Rejected. The `/build` form state, API user tools, and the three input formats can't be expressed as YAML `tests:` blocks.
- **`user_tool` conftest fixture.** Kept. It is the general, documented counterpart to `required_tool` for user tools. Its one caller, `test_user_checked_is_rejected`, is a user-tool-only contract. `loaded_tool` stays module-local because only this module needs the toolbox/user-tool union. Its user-tool branch is two lines that overlap `user_tool`.
- **Baseline structural xfail kept.** It pins the base parser failure in a splittable baseline commit. `test_repeat_contract` and `test_section_contract` replace it in the commit that fixes loading.

## History change

`923173b9e3e` (send `use_cached_job` only when requested) moved from the tip to directly after `eaea0064b80`. It fixes a pre-existing bug in the test helper, `DescribeToolExecution`: tests ran with the cache flag on. It now sits ahead of every test it affects, so each commit's tests run as the per-commit check ran them. The reorder applied cleanly, with no conflicts.

## Red/green check (tip tests, production files checked out at each commit)

| prod at | result | red cases |
|---|---|---|
| merge-base `6df388987b4` | 47 failed, 11 passed, 6 skipped | everything below |
| `8541fd2a3b3`, `087336e8249` (refactors) | 47 failed, 11 passed, 6 skipped | identical to base (behavior parity) |
| `f3178c7f971` Boolean value | 26 failed | repeat/section ×12, conditional legacy/21.01 ×6, disk optionality ×2, disk omitted Boolean ×3, request null ×3 |
| `1e2386509f6` omitted optional/Boolean | 21 failed | repeat/section ×12, conditional ×6, request null ×3 |
| `cdebfcb580d` request null fill | 18 failed | repeat/section ×12, conditional ×6 |
| `87006435b1d` repeat/section loading | 9 failed | section request null flag ×3, conditional ×6 |
| `d3ad537ee00` strictify sections | 6 failed | conditional legacy/21.01 ×6 (`__current_case__`) |
| `975b9157f50` tip | 64 passed | none |

- Every failure is a behavior assertion, such as `False is True`, `None is False`, `True is False`, or the `{'flag': False}` vs `None` JSON check. There are no missing-helper or missing-fixture errors. The API repeat/section cases fail inside the populator's `build()` 200 assertion, on HTTP 500 (`Unknown Galaxy parameter type section`, `'blocks'`). That is a behavior failure, not a missing API.
- The 6 skipped cases before `87006435b1d` are the repeat/section `-disk` cases. Canonical YAML fails to load into the toolbox at base, so `requires_tool_id` skips them. Red for those facts is carried by the api-yaml/api-json cases, which use the same parser.
- Conditional legacy/21.01 stay red until `975b9157f50` because that commit changed the fixture to render `inputs.choice` whole. Conditional request cases go green at `f3178c7f971`.
- **Baseline commit at its own tree** (`2b351605ed4`, base production): 1 passed, 4 strict xfailed.
- **Cases that pass at base.** These were left as they are:
  - `test_omitted_optionality` api-yaml/api-json ×4: API user tools were already canonical, and only the disk path changes.
  - `test_optional_boolean_null` legacy/21.01 ×6: only request fill changes.

  Each function states one fact across load paths and formats, and its red cases fail at its own assertion.

## E2E

None added. The behavior is in parsing and request filling. The tool form's initial state comes from `/build`, which every test asserts, and job output is pinned for all three input formats. A Selenium test would only re-check this.

## Not acted on

- Did not split mixed functions by load path or input format. Splitting would break the "one fact across all load paths" structure.
- Did not remove the `loaded_tool`/`user_tool` overlap. It is two lines, and merging them would push a disk/API union into the shared conftest.

## Checks

- Contract module at tip: 64 passed.
- Ruff 0.15.13, black and isort pass on the changed test files, and the commit hooks passed.
- Mypy, run from `lib/`, reports no errors in `test_user_tool_contract.py`, `populators.py` or `conftest.py`.
- `git diff d31abb1b55b HEAD -- lib/galaxy/` is empty. The worktree is clean.

## New history

```
975b9157f50 Drop conditional __current_case__ from legacy user tool inputs
d3ad537ee00 Apply YAML Boolean policy to sections in strictify
87006435b1d Load canonical repeat and section inputs in YAML tools
cdebfcb580d Keep explicit null Boolean default for YAML tools in request execution
1e2386509f6 YAML tools default omitted optional and Boolean value to False
f3178c7f971 Honor YAML boolean values when loading tools
087336e8249 Add YAML tool source predicate and child source factory methods
8541fd2a3b3 Add InputSource hooks for Boolean default and text optionality
2b351605ed4 Baseline tests for user tool authoring contracts
923173b9e3e Send use_cached_job only when requested in DescribeToolExecution
eaea0064b80 Function-scope API test interactor fixtures
```
