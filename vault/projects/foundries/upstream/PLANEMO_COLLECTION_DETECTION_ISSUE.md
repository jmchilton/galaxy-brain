# Planemo issue draft — collection output assertions

**Posted:** https://github.com/galaxyproject/planemo/issues/1705 (2026-09-14)

---

🤖 This issue was written by Claude (AI assistant) on jmchilton's behalf, not authored by them personally.

### Summary

Planemo and Galaxy's own framework workflow test runner read the same workflow test YAML but use
different rules to decide that an output assertion describes a *collection*. Each silently ignores the
other's spelling — no error, no warning, the assertion is just skipped. Planemo additionally drops
`collection_type`, the only spelling the published schema accepts.

### Detection disagreement

Planemo, `planemo/test/_check_output.py`:

```python
def for_collections(test_properties):
    return "element_tests" in test_properties
```

Galaxy, `lib/galaxy_test/workflow/test_framework_workflows.py`:

```python
is_collection_test = isinstance(test_properties, dict) and (
    "elements" in test_properties or test_properties.get("class") == "Collection"
)
```

So an output written `class: Collection` + `elements:` — the spelling used throughout Galaxy's own
framework workflow tests — is not seen as a collection by Planemo. It falls through to
`_check_output_file` and fails with `No path specified for expected output file`, which gives no hint
that the collection assertion was the thing that went unread.

### `collection_type` is dropped

`_check_output_collection` calls `TestCollectionOutputDef.from_dict(test_properties)`. Galaxy ships a
second constructor, `from_yaml_test_format` (`lib/galaxy/tool_util/parser/interface.py`), written for
exactly this file format — it resolves the `elements` / `element_tests` alias and maps top-level
`collection_type` onto `attributes["type"]`:

```python
@staticmethod
def from_yaml_test_format(as_dict):
    if "attributes" not in as_dict:
        as_dict["attributes"] = {}
    attributes = as_dict["attributes"]
    if "elements" in as_dict or "element_tests" in as_dict:
        as_dict["element_tests"] = resolve_element_tests(as_dict)
    if "collection_type" in as_dict:
        attributes["type"] = as_dict["collection_type"]
    return TestCollectionOutputDef.from_dict(as_dict)
```

Because Planemo uses `from_dict` instead, top-level `collection_type` is discarded and the collection
type simply is not asserted. The only spelling Planemo honours at runtime is
`attributes: {type: ...}` — and that one is rejected by the published schema, since
`CollectionAttributes` in `galaxy-tool-util-models` is `extra="forbid"` and declares only
`collection_type`:

```
INVALID  attributes: {type: list} + element_tests   -> attributes.type: Extra inputs are not permitted
VALID    class: Collection + collection_type + element_count + element_tests
```

That leaves no spelling that is both schema-valid and type-asserting under Planemo.

### Suggested fix

In `_check_output_collection`, call `TestCollectionOutputDef.from_yaml_test_format(test_properties)`
rather than `from_dict`, and widen `for_collections` to match Galaxy's gate:

```python
def for_collections(test_properties):
    return (
        "element_tests" in test_properties
        or "elements" in test_properties
        or test_properties.get("class") == "Collection"
    )
```

### Impact

IWC carries 236 collection output assertions; 206 use `class: Collection` + `element_tests` and 30 use
bare `element_tests`. The paired spelling works today only because `element_tests` happens to be present
alongside `class: Collection` — the `class` key is doing nothing for Planemo. None of the 236 assert a
collection type, which is consistent with there being no spelling that both validates and works.

Found while adding workflow tests to galaxyproject/foundry; verified against planemo 0.75.47 and
galaxy-tool-util-models as published on PyPI.
