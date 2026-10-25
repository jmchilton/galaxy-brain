# Scope evaluation

**Recommendation: modest expansion.** Keep the branch as implemented and add one parser fix in code it already touches. In `__parse_param_elem` (`parser/xml.py`), store each `<edit_attributes>` child as `dict(child.attrib)`, not as a raw XML Element, and drop the `hasattr(edit, "attrib")` duck-typing from `_comparable_test_input`. The generated composite rename stays in the list, so the prefix filter stays too. Thermo-nuclear review deferred this to dev because of external consumers. I checked, and that reason doesn't hold. Planemo and galaxy-tool-util-ts never reference `edit_attributes`, and both in-tree consumers (`verify/parse.py:602` `require_file` and `verify/interactor.py:2303`) only call `.get()`, which works the same on an Element and a dict. The raw Element is also a live, separate bug: at profile 25.1, a test with one `<edit_attributes>` child makes `json.dumps(ToolTestDescription.to_dict())` fail with `TypeError: Object of type _Element is not JSON serializable`. `Tool.parse_tests` (`lib/galaxy/tools/__init__.py:1646`) catches that, logs it, and sets the tool's tests to `None`, so every test of that tool silently disappears from `/api/tools/{id}/test_data`. No `test/functional/tools` tool and no IUC tool on `main` uses `edit_attributes`, so the impact is small and nobody has noticed. Everything else stays as built. The XSD constraint should stay dropped. The legacy runtime path below profile 24.2 and the composite rename refactor are not worth doing on 26.1. As for the reporter's question: the existing `TestsCaseValidation` linter (`planemo lint`) now catches the reported case, as an error at profile ≥24.2 (cutadapt is 25.1). The XSD can't, because it can't be gated on profile.

## Possible Decompositions

The branch is about 263 lines including tests (about 60 lib lines), across 4 commits: baseline tests, prefix constant, fix, and Codex follow-up. Two dependencies limit the order. The main fix must not land before the content comparison, or identical qualified duplicates with `edit_attributes` or `composite_data` children would become new false "Ambiguous" errors. The `try` move must land with the main fix or before it, or the lint output becomes one coarse "Serious problem parsing" message for the whole tool.

- **A. One PR**, as now, plus the parser dict change if it is taken.
- **B. Two PRs.**
  1. Comparison fix: the baseline tests, `COMPOSITE_DATA_RENAME_PREFIX`, `_comparable_test_input`, the parser dict change if taken, and their tests. This stands alone: it fixes a false rejection on the existing unqualified-duplicate path (`5a443294512`) and the dropped-tests JSON bug.
  2. Main fix: `input_for` through `_resolve_matching_inputs`, `_inputs_by_name`, the `try` move, the conflicting and legacy-profile tests, and the linter test.
- **C. Three PRs.** (1) The `try` move in `test_case_validation`, a release-branch copy of dev's `262e080dfe0` that improves lint messages on its own. (2) The comparison fix from B1. (3) The main fix from B2.

## Scopes considered

### 1. As implemented

Conflicting duplicate qualified test params (top level, repeat, repeat > conditional) now raise the existing "Ambiguous test parameter" error. Identical duplicates are still accepted. That error becomes a per-test `TestsCaseValidation` finding: an error at ≥24.2, a warning below. At runtime, a ≥24.2 test fails at load. Comparison is by content, so identical `edit_attributes` and `composite_data` duplicates are not rejected.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the reported cutadapt shape (profile 25.1) at lint time and at load time</li><li>Reuses `_resolve_matching_inputs` and `visitor.repeat_inputs_to_array`; no new linter, flag or XSD</li><li>Also fixes the false "Ambiguous" error on the existing unqualified path</li><li>Mirrors dev's `try` move, so merge-forward stays small</li></ul> | <ul><li>Leaves the parser's Element/dict mix in place; `_comparable_test_input` duck-types around it</li><li>sourmash sketch (25.0) and isoformswitchanalyzer (25.1) go red at load on a point release (already noted for the PR body)</li><li>Below 24.2 the runtime still silently takes the last value; only the lint warning signals it</li></ul> |

### 2. Modest expansion: parser stores `edit_attributes` as dicts (recommended)

In `__parse_param_elem`, change `attrib["edit_attributes"].append(child)` to append `dict(child.attrib)`. Simplify `_comparable_test_input` so it only filters the generated rename. Add a test that `json.dumps(to_dict())` works on a test with `edit_attributes`.

| Pros | Cons |
|---|---|
| <ul><li>Fixes a real related bug in a file the branch already touches: tests vanish from `Tool.parse_tests` / `test_data` for any tool using `edit_attributes`</li><li>Removes the duck-typing branch from `_comparable_test_input`</li><li>Makes `(value, extra) not in required_files` (`verify/parse.py:600`) dedupe identical uploads, since Elements compare by identity</li><li>No consumer found that relies on Elements: planemo and galaxy-tool-util-ts don't reference `edit_attributes`; in-tree consumers use only `.get()`</li></ul> | <ul><li>Changes the parsed test dict shape on a release branch, so an unknown external `.attrib`/`.text` user would break (none found)</li><li>A few more lines and one more test</li></ul> |

<details><summary>Evidence</summary>

I ran this on the branch head's `lib` with a profile 25.1 tool. Its one test had `<param name="input" value="1.txt"><edit_attributes type="name" value="renamed"/></param>`. `parse_tool_test_descriptions` gave `error=False`. `required_files` held `[<Element edit_attributes ...>]`, and `json.dumps(td.to_dict())` raised `TypeError: Object of type _Element is not JSON serializable`. `Tool.parse_tests` wraps that `json.dumps` in `try`/`log.exception`, sets `self.__tests = None`, and `Tool.tests` then returns `None`. `parser/yaml.py` has no `edit_attributes` handling, so only the XML parser produces the odd shape. In tools-iuc `origin/main`, nothing uses `edit_attributes` and 3 tools use `composite_data`. The implicit composite rename is already a dict, so composite-only tests serialize fine.
</details>

### 3. Larger expansion: move the generated composite rename out of `edit_attributes`

On top of scope 2, carry the generated `_COMPOSITE_RENAMED_` name in its own key. Teach `require_file` and the interactor's `test_data_iter` to use it, then delete the prefix filter and `COMPOSITE_DATA_RENAME_PREFIX`.

| Pros | Cons |
|---|---|
| <ul><li>`_comparable_test_input` normalization goes away completely (thermo-nuclear's ideal end state)</li><li>Author attributes no longer contain generated data</li></ul> | <ul><li>Touches the upload/rename logic in `require_file` and `interactor.py` that every composite test depends on</li><li>Changes the `required_files` shape sent over the test-data API, and old/new Galaxy and client mixes matter there</li><li>Doesn't fix a user-visible bug; better on dev</li></ul> |

### 4. Re-add the XSD `xs:unique` (as proposed in the root-cause comment)

Add `xs:unique` on `param/@name` per test `repeat`/`conditional`/`section`, so schema validation in `planemo lint` flags duplicates.

| Pros | Cons |
|---|---|
| <ul><li>Literally answers "can the test schema cover this"</li><li>Editor and schema-level feedback</li></ul> | <ul><li>Normal review reproduced that it rejects a legacy idiom that works at ≤24.1: with the outer repeat elided, same-name params in one container fill successive repeat instances</li><li>XSD can't be gated on profile, so it would break the lint of working old tools</li><li>Duplicates what `TestsCaseValidation` already reports with the right per-profile level</li></ul> |

### 5. Contraction: lint-only on 26.1, no load-time error for ≥24.2 tools

Report conflicting duplicates only through `TestsCaseValidation`. At runtime, keep resolving them silently (last value wins) so sourmash and isoformswitchanalyzer don't go red on a point release.

| Pros | Cons |
|---|---|
| <ul><li>No existing tool test changes from pass to error on 26.1</li></ul> | <ul><li>Needs a mode or flag so validation and runtime resolve differently: new spaghetti</li><li>Keeps the bug from the report: the test runs with a silently chosen value and fails as an output mismatch</li><li>Conflicting unqualified duplicates already fail at load (`5a443294512`); this would make qualified ones inconsistent with them</li><li>Both affected tools have genuine authoring slips; failing loudly is the fix</li></ul> |

### 6. Expansion: legacy runtime path below profile 24.2

Make `ParamContext.__raw_param_found` (`verify/parse.py`) detect conflicting matches or unconsumed duplicates, or make it agree with the modern path on first vs. last. This was step 4 and the "optionally" item in the root-cause comment.

| Pros | Cons |
|---|---|
| <ul><li>Closes the last silent drop, for old-profile tools</li></ul> | <ul><li>The runtime path has no warning channel; raising would break old tools' runtime tests on a release branch, which the profile gate exists to prevent</li><li>`TestsCaseValidation` already warns below 24.2</li><li>The first/last split is moot for conflicting values now: the modern path raises, and below 24.2 only the legacy value is used</li><li>Legacy reverse-order fill of elided repeats predates this branch (normal review)</li></ul> |

### 7. Dev-only follow-ups (not for this branch)

- Move the duplicate-param tests (the unqualified ones from `5a443294512` plus this branch's) out of `test_parameter_test_cases.py` (1005 lines) into their own module. That is churn on 26.1, so it belongs on dev.
- Scope 3, if scope 2 is taken now.

### Note: companion tool fixes

Not branch scope, but worth doing with the PR: one-line IUC fixes for sourmash sketch and isoformswitchanalyzer, which go red at load, and optionally for hicAdjustMatrix, augustus and qiime make_emperor, which only get lint warnings.
