# Upstream issue text, for John

Nothing here is filed. Each one came out of `issue-661-conditional-fan-in`, and the first three explain a workaround or a limit in its verification README.

## Galaxy: `element_count: 0` checks nothing

`verify_collection` in `lib/galaxy/tool_util/verify/interactor.py` guards its count checks on truthiness:

```python
if output_collection_def.count and output_collection_def.count != actual_element_count:
```

`min` and `max` have the same form on the next lines. A test that expects an empty collection therefore passes at any count. Galaxy's own `lib/galaxy_test/workflow/filter_null.gxwf-tests.yml` asserts `element_count: 0` on its discard case, so that assertion doesn't check what it says.

Read on `dev` and `release_26.1`. Suggested fix: compare against `None`, then see whether `filter_null` still passes.

Foundry's `route-mapped-same-arms` merges a sentinel list into a filtered output only to work around this. It can assert `element_count: 0` directly once this is fixed.

## Planemo: `element_tests` naming a null element raises `TypeError`

`_verify_output_file` in `planemo/test/_check_output.py` calls `open(output_properties["path"], "rb")`. A skipped element in a mapped collection has no path, so naming it in `element_tests` raises `TypeError`, and the implementer saw the whole run die with no report.

Seen in the Planemo 0.75.47 environment. The code is the same on the current `planemo` checkout, by reading only. Suggested fix: report a null element as a test problem, or allow an assertion that an element is null.

## Planemo: workflow tests can't expect a failed invocation

Galaxy's framework test runner honors `expect_failure` (`lib/galaxy_test/workflow/test_framework_workflows.py`). A grep of Planemo finds no equivalent, so a Planemo workflow test can't hold a shape whose correct behavior is a failed invocation, such as `Cannot match collection types` or `the_only_non_null` with two live inputs.

Suggested fix: honor `expect_failure` in Planemo's workflow tests.

## Galaxy: mapped inputs of equal length pair by position, ignoring identifiers

This is a question, and may be by design. `Tree.compatible_shape` in `lib/galaxy/model/dataset_collections/structure.py` compares collection type and shape, and never identifiers.

Observed on `release_26.1` with Foundry's `route-mapped-different-arms`: built-in `pick_value` over a left arm mapped on `a1`, `shared` and a right arm mapped on `c1`, `c2`, with only the right arm live, succeeds. The output holds the `c1` and `c2` data under `a1` and `shared`, with no warning. The two lists had no identifier in common.

This matches long-standing map-over linking, so the question is narrow: should `pick_value`, or map-over linking generally, warn or fail when linked lists disagree on identifiers? A selection module makes the mislabel easier to miss, because the output looks like a clean route.

## Planemo: `collection_type` in a workflow test asserts nothing

`TestCollectionOutputDef.from_dict` reads `attributes.type`, and only `from_yaml_test_format` fills that from `collection_type`. Planemo calls `from_dict`, so a `list:paired` result passes a test that says `collection_type: list`. Found by replaying a test file through the 0.75.47 checker with simulated outputs, not on a live Galaxy.
