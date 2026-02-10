---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/collections
  - galaxy/client
  - galaxy/workflows
  - galaxy/tools/collections
  - galaxy/testing
status: draft
created: 2026-02-08
revised: 2026-02-09
revision: 2
ai_generated: true
github_pr: 19377
github_repo: galaxyproject/galaxy
galaxy_areas:
  - collections
  - client
  - workflows
  - tools
  - testing
related_notes:
  - "[[Component - Dataset Collections]]"
branch: collection_specification
---

# PR #19377 Research Summary

**Title:** Empower Users to Build More Kinds of Collections, More Intelligently
**Author:** John Chilton (jmchilton)
**URL:** https://github.com/galaxyproject/galaxy/pull/19377
**Status:** MERGED into `dev` (branch: `fixed_length_collections`)
**Labels:** area/UI-UX, kind/feature, area/API, area/dataset-collections, area/tool-framework, highlight
**Merge commit in dev:** `c212434dc8`
**In current branch's merge base:** Yes -- all PR changes are already in the `yaml_tool_harden_1` working tree.

## Summary

Massive feature PR (~6700 additions across 130+ files) introducing:

1. **`paired_or_unpaired` collection type** -- mixed paired/unpaired data in a single collection. Elements are either `{forward, reverse}` (paired) or `{unpaired}` (singleton). Tools declaring `collection<paired_or_unpaired>` also accept plain `paired` input. Lists of these (`list:paired_or_unpaired`) can match both `list` and `list:paired`.

2. **`record` collection type** -- CWL-style heterogeneous tuples with named, typed fields. Generalization of `paired`. Fields defined via `FieldDict` (`{name, type, format?}`). Database stores `fields` JSON on `DatasetCollection`.

3. **Collection Adapter framework** (`adapters.py`) -- wraps model objects to create ephemeral/pseudo collections for tool execution. Key adapters: `PromoteCollectionElementToCollectionAdapter`, `PromoteDatasetToCollection`, `PromoteDatasetsToCollection`. Adapter state serialized to `adapter` JSON column on job input association tables.

4. **List Wizard UI** -- replaces `PairedListCollectionCreator` (deleted, -1257 lines) with wizard-based `ListWizard.vue` + `PairedOrUnpairedListCollectionCreator.vue`. "Auto Build List" and "Advanced Build List" options in history dropdown. Auto-detects pairing.

5. **Rule-Based Import Activity** -- new standalone activity + wizard for seeding rule builder from remote files, pasted data, existing datasets, etc.

6. **Collection Semantics Documentation** (`collection_semantics.yml` + generated `collection_semantics.md`) -- formal specification of mapping, reduction, sub-collection mapping, and `paired_or_unpaired` semantics with labeled examples tied to test cases.

7. **`__SPLIT_PAIRED_AND_UNPAIRED__` tool** -- new collection operation that splits `list:paired_or_unpaired` into homogeneous `list` + `list:paired`.

8. **Database migration** (`ec25b23b08e2`) -- adds `fields` column to `dataset_collection`, `adapter` column to `job_to_input_dataset`, `job_to_input_dataset_collection`, `job_to_input_dataset_collection_element`.

## Key Architectural Decisions

- **Collection type matching is asymmetric:** `paired_or_unpaired` *consumes* `paired` but not vice versa. `can_match_type()` in `type_description.py` implements this. `list:paired_or_unpaired` matches `list` and `list:paired`.
- **Adapters bridge type gaps at runtime:** When a `paired` collection is passed to a `paired_or_unpaired` input, an adapter wraps it. Adapter JSON is persisted on job input associations for provenance but isn't re-used during job evaluation.
- **`single_datasets` pseudo-type:** Used as a subcollection type to allow flat collections (like `paired_or_unpaired`) to be split into individual DCE-level adapters.
- **`fields` parameter threaded everywhere:** From API payload -> `collections_util` -> `collections.py` -> `builder.py` -> type plugins. `"auto"` value triggers field guessing from element identifiers.
- **Discriminated unions for adapter models** in `tool_util_models/parameters.py` -- `AdaptedDataCollectionRequest` and `AdaptedDataCollectionRequestInternal` use `adapter_type` discriminator.
- **`DatasetCollection.allow_implicit_mapping`:** Records return `False` -- they don't participate in implicit mapping.

## Files Changed (130 files)

### New Backend Files
| File | Description |
|------|-------------|
| `lib/galaxy/model/dataset_collections/adapters.py` (+289) | CollectionAdapter hierarchy |
| `lib/galaxy/model/dataset_collections/types/paired_or_unpaired.py` (+43) | paired_or_unpaired type plugin |
| `lib/galaxy/model/dataset_collections/types/record.py` (+45) | record type plugin |
| `lib/galaxy/model/dataset_collections/types/semantics.py` (+240) | YAML->Markdown doc generator |
| `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` (+563) | Formal collection semantics spec |
| `lib/galaxy/tools/split_paired_and_unpaired.xml` (+132) | Split paired/unpaired tool |
| `lib/galaxy/model/migrations/.../ec25b23b08e2_...py` (+46) | Alembic migration |
| `doc/source/dev/collection_semantics.md` (+762) | Generated docs |

### New Frontend Files (selection)
| File | Description |
|------|-------------|
| `client/src/components/Collections/ListWizard.vue` (+279) | Main list wizard component |
| `client/src/components/Collections/PairedOrUnpairedListCollectionCreator.vue` (+798) | New paired/unpaired creator |
| `client/src/components/Collections/BuildFileSetWizard.vue` (+220) | Rule-based import wizard |
| `client/src/components/Collections/common/AutoPairing.vue` (+188) | Auto-pairing UI |
| `client/src/components/Workflow/Editor/Forms/FormRecordFieldDefinitions.vue` (+145) | Record field editor |
| `client/src/components/Workflow/Editor/Forms/FormFieldType.vue` (+60) | Field type selector |

### Deleted Files
| File |
|------|
| `client/src/components/Collections/PairedListCollectionCreator.vue` (-1257) |
| `client/src/components/Collections/PairedListCollectionCreator.test.js` (-147) |
| `client/src/components/Upload/useUploadDatatypes.ts` (-29) |

### Significantly Modified Backend Files
| File | +/- | Key Changes |
|------|-----|-------------|
| `lib/galaxy/model/__init__.py` | +32/-10 | `fields` on DatasetCollection, `adapter` on job input assocs, `allow_implicit_mapping` |
| `lib/galaxy/model/dataset_collections/type_description.py` | +39/-34 | `can_match_type()` rewrite for paired_or_unpaired, `single_datasets`, `fields` param |
| `lib/galaxy/model/dataset_collections/builder.py` | +24/-5 | `fields` threading, `guess_fields()` |
| `lib/galaxy/model/dataset_collections/registry.py` | +10/-3 | Register record + paired_or_unpaired plugins |
| `lib/galaxy/model/dataset_collections/subcollections.py` | +16/-1 | `PromoteCollectionElementToCollectionAdapter` for flat collections |
| `lib/galaxy/tools/parameters/basic.py` | +80/-20 | `CollectionAdapter` in type unions, `src_id_to_item_collection()`, adapter recovery |
| `lib/galaxy/tools/actions/__init__.py` | +45/-5 | Adapter handling in `_record_inputs()` and collection security checks |
| `lib/galaxy/tools/__init__.py` | +60/-3 | `SplitPairedAndUnpairedTool`, `ExtractDatasetCollectionTool` supports new types |
| `lib/galaxy/tool_util_models/parameters.py` | +74/-0 | Full adapter model hierarchy with discriminated unions |
| `lib/galaxy/tool_util_models/tool_source.py` | +18/-3 | `FieldDict`, `CwlType`, nullable `collection_type` |
| `lib/galaxy/managers/collections.py` | +20/-6 | `fields` param in create/create_dataset_collection, indices in rule data |
| `lib/galaxy/tool_util/parser/interface.py` | +20/-3 | `fields` on TestCollectionDef, nullable collection_type |
| `lib/galaxy/tool_util/parser/output_objects.py` | +10/-0 | `fields` on ToolOutputCollectionStructure |
| `lib/galaxy/schema/schema.py` | +6/-0 | `fields_` on CreateNewCollectionPayload |

## Cross-References to Current Branch (`yaml_tool_harden_1`)

### Files Modified by Both PR and Current Branch (40 files overlap)

The current branch focuses on structured tool state, YAML tool support, and collection runtime hardening. Key overlapping areas:

| File | PR Purpose | Current Branch Purpose |
|------|-----------|----------------------|
| `lib/galaxy/tool_util_models/parameters.py` | Added adapter models (discriminated unions) | Added collection runtime models with discriminated unions |
| `lib/galaxy/tool_util_models/tool_source.py` | Added `FieldDict`, `CwlType` | Modified for YAML tool source changes |
| `lib/galaxy/model/dataset_collections/builder.py` | Added fields support | Modified for collection runtime |
| `lib/galaxy/model/dataset_collections/subcollections.py` | Added adapter for flat collections | Modified for collection runtime |
| `lib/galaxy/tools/parameters/basic.py` | Added CollectionAdapter support | Changes for structured tool state |
| `lib/galaxy/tools/actions/__init__.py` | Adapter recording in _record_inputs | Structured tool state changes |
| `lib/galaxy/model/__init__.py` | fields/adapter columns | Various model changes |
| `lib/galaxy/managers/collections.py` | fields param threading | Collection-related changes |

### No Conflicts

Since PR #19377 is already merged into `dev` and the current branch is based on a commit *after* that merge (`c212434dc8` is an ancestor of the merge base `c89c5f0644`), there are no merge conflicts. The current branch builds on top of all PR #19377 changes.

### Architectural Alignment

The current branch's work on **collection runtime models with discriminated unions** (commits `200d5b8fbc`, `cd04873951`) directly extends the patterns established by PR #19377:

- PR #19377 introduced discriminated unions for adapter models (`AdaptedDataCollectionRequestInternal` discriminated on `adapter_type`)
- Current branch extends discriminated unions to collection runtime models (e.g., `DataCollectionPairedRuntime`, dynamic model factory for recursive collection types)
- PR #19377's `FieldDict` type from `tool_source.py` is available for the current branch's YAML tool work
- The `collection_semantics.yml` spec provides a reference for what test cases should exist for the new collection types

### Key Types/Interfaces Introduced by PR Available in Current Branch

- `CollectionAdapter` and subclasses (`adapters.py`)
- `FieldDict`, `CwlType`, `FieldType` (`tool_source.py`)
- `AdaptedDataCollectionRequest*` models (`parameters.py`)
- `PairedOrUnpairedDatasetCollectionType` and `RecordDatasetCollectionType` (type plugins)
- `DatasetCollection.fields` and `DatasetCollection.allow_implicit_mapping`
- `can_match_type()` with `paired_or_unpaired` semantics
- `SplitPairedAndUnpairedTool` tool type
