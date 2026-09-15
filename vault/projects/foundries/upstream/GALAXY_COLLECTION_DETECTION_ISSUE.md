# Galaxy issue draft — framework workflow test collection detection

**Posted:** https://github.com/galaxyproject/galaxy/issues/23544 (2026-09-14)

---

🤖 This issue was written by Claude (AI assistant) on jmchilton's behalf, not authored by them personally.

### 1. `element_tests` is not part of the collection-detection gate

`lib/galaxy_test/workflow/test_framework_workflows.py`:

```python
is_collection_test = isinstance(test_properties, dict) and (
    "elements" in test_properties or test_properties.get("class") == "Collection"
)
```

`element_tests` is missing, yet it is the *preferred* key everywhere else in the stack. The alias
resolver a few lines away in `lib/galaxy/tool_util/parser/interface.py` says so outright:

```python
def resolve_element_tests(as_dict):
    """Return the nested element tests, preferring the "element_tests" key over its "elements" alias.

    "element_tests" is the preferred key; "elements" is the accepted alias (see
    https://github.com/galaxyproject/planemo/pull/1417).
    """
```

`TestCollectionOutputAssertions` accepts it, and `from_yaml_test_format` normalises it. Only the
detection gate leaves it out, so an output written with the preferred key alone is verified as a
*dataset* — silently, with no error about the skipped collection assertion.

This is reachable today: of IWC's 236 collection output assertions, 30 are spelled with bare
`element_tests`.

Planemo has the mirror-image gate — it recognises `element_tests` and not `class: Collection` /
`elements:` — so the two tools that read this format agree on no single spelling. Filed there as well.

Suggested fix:

```python
is_collection_test = isinstance(test_properties, dict) and (
    "elements" in test_properties
    or "element_tests" in test_properties
    or test_properties.get("class") == "Collection"
)
```

### 2. The test model rejects nested `count`, which the verifier honours

`verify_collection` in `lib/galaxy/tool_util/verify/interactor.py` reads `count`, `min` and `max` from a
nested element:

```python
expected_count = element_attrib.get("count")
if expected_count is not None and expected_count != element_count:
    raise AssertionError(...)
```

But `TestCollectionCollectionElementAssertions` in `galaxy-tool-util-models` is `extra="forbid"` and
declares only `class`, `elements` and `element_tests`. So a nested count assertion that the verifier
enforces fails schema validation, in every spelling:

```
INVALID  nested: class:Collection + count        -> element_tests.seg1.Collection.count: Extra inputs are not permitted
INVALID  nested: class:Collection + element_count -> element_tests.seg1.Collection.element_count: Extra inputs are not permitted
VALID    nested: class:Collection only (no count assertion possible)
```

The model is narrower than the verifier it describes, and there is no way to assert the size of a nested
collection while staying schema-valid. Either the model should allow `count`/`min`/`max` on a nested
element, or the verifier should stop honouring them.

Found while adding workflow tests to galaxyproject/foundry; checked against galaxy dev @ a63da1dfd1 and
galaxy-tool-util-models as published on PyPI.
