# Collection output tests ignore `count`/`element_count` and `max` of 0

`verify_collection` in `lib/galaxy/tool_util/verify/interactor.py` checks expected sizes by truthiness:

```python
if output_collection_def.count and output_collection_def.count != actual_element_count:
...
if output_collection_def.max and output_collection_def.max < actual_element_count:
```

So `count="0"` (tool XML), `element_count: 0` (workflow/Planemo YAML tests) and `max="0"` are silently skipped, and a test meant to assert an empty collection passes on any collection. (`min: 0` is skipped too, which is harmless.) Nested element checks in the same function already use `is not None`.

Repro against `dev`:

```python
from galaxy.tool_util.parser.interface import TestCollectionOutputDef
from galaxy.tool_util.verify.interactor import verify_collection
coll = {"collection_type": "list", "elements": [{"element_identifier": "a", "object": {}}]}
for attrs in ({"count": "0"}, {"max": "0"}):
    verify_collection(TestCollectionOutputDef("out", attrs, {}), coll, lambda *a, **k: None)  # both pass
```

Docs bots and test authors are already working around it ("prove emptiness with a derived dataset ... `has_size: 0`", galaxyproject/foundry#712).

Fix: compare against `None` (`is not None`) for `count`, `min` and `max`, plus a unit test. Fixing it may turn existing tests with `count="0"` / `element_count: 0` red where they were wrong all along.
