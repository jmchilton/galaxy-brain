# Collection Type Description Refactoring Plan

## Motivation

CONNECTION_VALIDATION.md Phase 1 needs a `CollectionTypeDescription` class in `galaxy.tool_util` for offline workflow connection type checking. This class already exists in `galaxy.model.dataset_collections.type_description` (galaxy-data), but galaxy-data depends on galaxy-tool-util — not the reverse. We need to extract the pure-logic core into galaxy-tool-util so both packages can use it.

## Current State

**`lib/galaxy/model/dataset_collections/type_description.py`** contains:
- `COLLECTION_TYPE_REGEX` — validates collection type strings
- `CollectionTypeDescription` — full type abstraction (matching, subcollections, dimensions, normalization)
- `CollectionTypeDescriptionFactory` — factory with registry reference
- `COLLECTION_TYPE_DESCRIPTION_FACTORY` — singleton factory instance
- `map_over_collection_type()` — pure function
- `_normalize_collection_type()` — pure function

**Dependencies that block moving to tool-util:**
1. `from galaxy.exceptions import RequestParameterInvalidException` — used in `validate()`. Already available in tool-util (used in 6 tool-util files).
2. `from .registry import DATASET_COLLECTION_TYPES_REGISTRY` — used as default arg in `CollectionTypeDescriptionFactory.__init__()`.

**Registry coupling is minimal:**
- The factory stores `type_registry` but the comment says "taking in type_registry though not using it, because we will someday I think."
- Only ONE method uses the registry: `rank_type_plugin()` (line 150-151) — called in only 3 places, all in galaxy-data (`builder.py`, `collections.py`).
- Everything else is pure string logic.

## Callers (what the re-export shim must cover)

| Caller | Imports | Package |
|--------|---------|---------|
| `dataset_collections/builder.py` | `COLLECTION_TYPE_DESCRIPTION_FACTORY`, `CollectionTypeDescription` (TYPE_CHECKING) | galaxy-data |
| `dataset_collections/structure.py` | `CollectionTypeDescription` (TYPE_CHECKING) | galaxy-data |
| `managers/collections.py` | `COLLECTION_TYPE_DESCRIPTION_FACTORY` | galaxy |
| `job_execution/output_collect.py` | `COLLECTION_TYPE_DESCRIPTION_FACTORY` | galaxy |
| `workflow/modules.py` | `COLLECTION_TYPE_DESCRIPTION_FACTORY` | galaxy |
| `test/.../test_type_descriptions.py` | `CollectionTypeDescriptionFactory` | tests |
| `test/.../test_structure.py` | `CollectionTypeDescriptionFactory` | tests |

## Plan

### Step 1: Create `lib/galaxy/tool_util/collections.py`

Move the pure-logic core here. Changes from the original:

```python
import re
from typing import Optional, TYPE_CHECKING, Union

from galaxy.exceptions import RequestParameterInvalidException

if TYPE_CHECKING:
    from galaxy.tool_util_models.tool_source import FieldDict

COLLECTION_TYPE_REGEX = re.compile(...)

class CollectionTypeDescriptionFactory:
    def __init__(self, type_registry=None):  # <-- default None, not registry
        self.type_registry = type_registry

    def for_collection_type(self, collection_type, fields=None):
        assert collection_type is not None
        return CollectionTypeDescription(collection_type, self, fields=fields)

class CollectionTypeDescription:
    # Identical to current, MINUS rank_type_plugin()
    ...

def map_over_collection_type(...): ...
def _normalize_collection_type(...): ...

COLLECTION_TYPE_DESCRIPTION_FACTORY = CollectionTypeDescriptionFactory()
```

Key changes:
- Factory default `type_registry=None` instead of `DATASET_COLLECTION_TYPES_REGISTRY`
- `rank_type_plugin()` removed (stays in galaxy-data subclass)
- All other methods identical

### Step 2: Update `lib/galaxy/model/dataset_collections/type_description.py` to re-export

Becomes a thin shim that imports from tool-util and adds back the registry coupling:

```python
from galaxy.tool_util.collections import (  # noqa: F401 — re-exports
    COLLECTION_TYPE_REGEX,
    CollectionTypeDescription as _BaseCollectionTypeDescription,
    CollectionTypeDescriptionFactory as _BaseFactory,
    map_over_collection_type,
    _normalize_collection_type,
)
from .registry import DATASET_COLLECTION_TYPES_REGISTRY


class CollectionTypeDescriptionFactory(_BaseFactory):
    def __init__(self, type_registry=DATASET_COLLECTION_TYPES_REGISTRY):
        super().__init__(type_registry=type_registry)


class CollectionTypeDescription(_BaseCollectionTypeDescription):
    def rank_type_plugin(self):
        return self.collection_type_description_factory.type_registry.get(
            self.rank_collection_type()
        )


COLLECTION_TYPE_DESCRIPTION_FACTORY = CollectionTypeDescriptionFactory()
```

All existing callers importing from `galaxy.model.dataset_collections.type_description` continue to work unchanged — they get the subclassed versions with registry support.

### Step 3: Verify

1. Run existing type_description tests: `pytest test/unit/data/dataset_collections/test_type_descriptions.py test/unit/data/dataset_collections/test_structure.py`
2. Run roundtrip tests: `pytest test/unit/workflows/test_roundtrip.py`
3. Verify imports: `python -c "from galaxy.tool_util.collections import CollectionTypeDescription"`
4. Verify re-exports: `python -c "from galaxy.model.dataset_collections.type_description import COLLECTION_TYPE_DESCRIPTION_FACTORY; print(type(COLLECTION_TYPE_DESCRIPTION_FACTORY))"`
5. Grep for all callers and verify no breakage

### Step 4: CONNECTION_VALIDATION.md can proceed

Phase 1 of CONNECTION_VALIDATION.md (`connection_types.py`) imports from `galaxy.tool_util.collections` directly. It gets `CollectionTypeDescription`, `COLLECTION_TYPE_REGEX`, `_normalize_collection_type`, `map_over_collection_type` — everything it needs for can_match/can_map_over logic without any galaxy-data dependency.

The connection validation module may extend `CollectionTypeDescription` with additional methods (like `can_map_over` which doesn't exist in the current backend class but does in the TypeScript). Those extensions live in `connection_types.py` as functions or a subclass — the base class stays clean.

## Risk Assessment

**Low risk:**
- Pure mechanical extraction — no logic changes to the moved code
- Re-export shim preserves all existing import paths
- Only 7 callers, all in galaxy-data or galaxy proper (none in tool-util yet)
- `rank_type_plugin()` stays in the subclass exactly where it was

**One subtlety:** `CollectionTypeDescription.__init__` creates instances via `self.collection_type_description_factory.for_collection_type()`. When called from the galaxy-data subclass factory, this produces galaxy-data `CollectionTypeDescription` instances (with `rank_type_plugin`). When called from the tool-util base factory, it produces base instances (without). This is correct — tool-util callers don't need the registry.

## Not in scope

- Moving `registry.py` or `types/` to tool-util — these depend on model classes
- Moving `builder.py`, `matching.py`, `structure.py` — these depend on model objects
- Moving `auto_identifiers.py`, `auto_pairing.py` — could move but no current need
- Updating existing tool-util code to use the new module — deferred to connection validation work
