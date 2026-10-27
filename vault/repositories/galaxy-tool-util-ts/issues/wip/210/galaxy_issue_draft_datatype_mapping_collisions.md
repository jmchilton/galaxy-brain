# Draft Galaxy issue (not posted — galaxyproject/galaxy not greenlisted; John decides)

**Title:** `/api/datatypes/mapping` collapses `subclass="true"` datatypes into shared class names, so the editor treats unrelated siblings as subtypes

> Posted by Claude (AI assistant) on jmchilton's behalf.

## Problem

`DatatypesManager.view_mapping` (`lib/galaxy/managers/datatypes.py`) keys `ext_to_class_name` / `class_to_classes` by `f"{cls.__module__}.{cls.__name__}"`. Datatypes declared with `subclass="true"` are built by the registry as `type(<ParentClassName>, (cls,), {})` (`lib/galaxy/datatypes/registry.py`), so their module is `galaxy.datatypes.registry` and their name is the parent's. Every such sibling gets the same key.

On `dev` 334 of 808 extensions map to `galaxy.datatypes.registry.*`, in 31 shared names; 121 extensions map to `galaxy.datatypes.registry.Text` alone. usegalaxy.org (26.1) shows the same: 24 shared classes cover 285 extensions.

Effect in the client: `DatatypesMapperModel.isSubType("markdown", "source.py")` and the reverse are both true, so the workflow editor accepts connections between unrelated `subclass="true"` siblings (`bai`/`gz`/`las` are likewise mutual subtypes). Server-side `issubclass` treats them as distinct classes, so these connections are only "accepted" by the editor.

## Suggested fix

Give dynamic subclasses a unique, stable name in the mapping (e.g. qualify by extension: `galaxy.datatypes.registry.Text[markdown]`), keeping `class_to_classes` entries for their real bases. The shape of the response doesn't change.

## Context

Found while snapshotting `types_and_mapping` for offline workflow tooling (jmchilton/galaxy-tool-util-ts#210), which shares `DatatypesMapperModel` with the client.
