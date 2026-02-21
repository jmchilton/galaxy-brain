---
type: research
subtype: design-problem
tags:
  - research/design-problem
  - galaxy/testing
  - galaxy/collections
status: draft
created: 2026-02-21
revised: 2026-02-21
revision: 1
ai_generated: true
---

# Workflow Framework Test Collection Inputs

How collection inputs get populated in Galaxy framework workflow tests, what works, what doesn't, and what needs fixing.

---

## Entry Point

`load_data_dict()` in `lib/galaxy_test/base/populators.py:3764` converts `.gxwf-tests.yml` job dicts into actual Galaxy history items. For collections, it dispatches on `collection_type` to different helper methods.

All collection creation ultimately goes through either:
- `upload_collection()` (line 3536) → `__create_payload_fetch()` → fetch API
- `__create_payload()` (line 3548) → also delegates to `__create_payload_fetch()` when `direct_upload=True` (default)
- `_create_collection()` — direct collection creation API (used by `create_sample_sheet()` and `create_nested_collection()`)

The fetch API path (`__create_payload_fetch`, line 3555) is the most flexible — it passes dict elements through as-is to the fetch targets, supporting nested structures natively.

## Element Pre-processing (lines 3791-3809)

Before dispatch, `load_data_dict` iterates over the `elements` array from the test YAML and transforms each element dict:

```python
for i, element_data in enumerate(elements_data):
    if "name" not in element_data:       # allows pre-named elements
        identifier = element_data.pop("identifier")
        element_data["name"] = identifier
    input_type = element_data.pop("type", "raw")  # consumed, not forwarded
    content = None
    if input_type == "File":
        # opens file, sets src="files", adds to __files dict
    else:
        content = element_data.pop("content")  # <-- KeyError if missing
        if content is not None:
            element_data["src"] = "pasted"
            element_data["paste_content"] = content
```

**Key limitation:** This loop expects every element to be a flat leaf with either `type: File` + `value` or a `content` string. Nested elements (elements containing sub-`elements`) are not handled — `pop("content")` on an element with no `content` key raises `KeyError`.

Note: an explicit `content: null` wouldn't crash but would produce an element with no `src` — also broken, just differently.

## Dispatch Table (lines 3812-3845)

| `collection_type` | Method called | Accepts custom elements? | Notes |
|---|---|---|---|
| `list` | `create_list_in_history()` | **Yes** — passes `contents=elements` | Elements pre-processed above |
| `paired` (else fallthrough) | `create_pair_in_history()` | **Yes** — passes `contents=elements or None` | Elements pre-processed above |
| `paired_or_unpaired` (with elements) | `upload_collection()` | **Yes** — passes `elements=elements` | Elements pre-processed above |
| `paired_or_unpaired` (no elements) | `create_paired_or_unpaired_pair_in_history()` | No — hardcoded `("forward","123"),("reverse","456")` | |
| `list:paired` | `create_list_of_pairs_in_history()` | **No** — `contents=elements` passed but silently dropped (method only extracts `name` from kwds) | Always creates 1 pair w/ "TestData123" via `upload_collection()` |
| `list:paired_or_unpaired` | `create_list_of_paired_and_unpaired_in_history()` | **No** — elements not forwarded in the call at all | Creates 1 paired + 1 unpaired w/ hardcoded strings via `__create_payload()` |
| Other nested (`:` in type) | `create_nested_collection()` | **No** — elements not forwarded; uses `nested_collection_identifiers()` | Could accept `element_identifiers` param but `load_data_dict` doesn't use it |
| `sample_sheet` | **Not handled** — falls to `else` → `create_pair_in_history()` | N/A | **Bug**: wrong collection type created |
| `sample_sheet:*` | Hits `":"` branch → `create_nested_collection()` | N/A | **Bug**: `nested_collection_identifiers()` treats `sample_sheet` as a paired-like rank (falls to else), producing semantically wrong structure without error |

## Which Types Support Custom Elements?

**Support custom elements from test YAML:**
- `list` — full support, elements are passed through
- `paired` — full support via fallthrough else branch
- `paired_or_unpaired` (when elements provided) — full support via `upload_collection`

**Do NOT support custom elements (hardcoded defaults only):**
- `list:paired` — `load_data_dict` passes `contents=elements` but `create_list_of_pairs_in_history()` silently drops it (only extracts `name` from kwds)
- `list:paired_or_unpaired` — `load_data_dict` doesn't forward elements at all; `create_list_of_paired_and_unpaired_in_history()` uses hardcoded content
- All other nested types (`list:list`, `list:list:paired`, etc.) — `create_nested_collection()` uses `nested_collection_identifiers()` which creates generic datasets; it could accept custom `element_identifiers` but `load_data_dict` doesn't pass them

**Not supported at all:**
- `sample_sheet` — wrong dispatch (creates paired)
- `sample_sheet:paired` — wrong dispatch (creates nonsensical structure via `nested_collection_identifiers`)
- `sample_sheet:paired_or_unpaired` — same

## The Pre-processing Crash

The pre-processing loop (lines 3791-3809) processes elements as flat leaf datasets. When a test YAML specifies nested elements:

```yaml
elements:
  - identifier: el1
    elements:                    # <-- nested
      - identifier: forward
        content: "forward content"
      - identifier: reverse
        content: "reverse content"
```

The outer element (`el1`) has no `content` key — it has sub-`elements`. The loop does `element_data.pop("content")` on it, which raises `KeyError`.

This crash affects **any collection type** when nested elements are specified in test YAML — the pre-processing runs before dispatch.

## Dispatch Methods Ignoring Custom Elements

Even if the pre-processing didn't crash, the dispatch methods for nested types ignore custom elements:

- `create_list_of_pairs_in_history()` — silently drops `contents` kwarg, calls `upload_collection()` with its own hardcoded elements
- `create_list_of_paired_and_unpaired_in_history()` — elements never passed to it in the first place
- `create_nested_collection()` — uses `nested_collection_identifiers()` to build generic structure from the collection_type string

The only way to get custom content into nested collections today is to use a helper that accepts pre-built fetch API element dicts (like `upload_collection()` which passes dict elements through as-is) or create sub-collections from existing history items.

## `create_sample_sheet()` — Exists But Not Wired

`create_sample_sheet()` (line 3671) exists and creates sample sheets with `column_definitions` and `rows` via the direct collection creation API. But `load_data_dict()` has no branch that calls it, so test YAML cannot create sample sheets.

## What Needs Fixing

### For the immediate test enhancement issues (WORKFLOW_TEST_ENHANCMENTS.md)

The `list:paired_or_unpaired` test (Issue 2/3) can't specify custom nested elements because:
1. Element pre-processing crashes on nested elements (`KeyError: 'content'`)
2. Even if it didn't, `create_list_of_paired_and_unpaired_in_history()` doesn't receive or use custom elements

**Fix option:** When `load_data_dict` encounters elements with sub-`elements`, skip the flat pre-processing and route through `upload_collection()` which passes dict elements as-is to the fetch API.

### For sample_sheet tests (SAMPLE_SHEET_WORKFLOW_TESTS_PLAN.md)

1. Add `sample_sheet` branch to dispatch table
2. For flat `sample_sheet`: route to `upload_collection()` (or `create_sample_sheet()` if metadata needed)
3. For nested `sample_sheet:paired` etc: build fetch API nested element dicts and route to `upload_collection()`

### Unified fix

Both problems share the same root cause: `load_data_dict()` can't handle nested element structures in test YAML. A single fix that detects nested elements and builds proper fetch API payloads would solve both:

```python
# In the element pre-processing loop:
for i, element_data in enumerate(elements_data):
    if "elements" in element_data:
        # Nested element — convert to fetch API format recursively:
        #   identifier -> name
        #   content -> paste_content + src:"pasted" (for leaves)
        #   recurse into sub-elements
        element_data = _convert_nested_element_to_fetch(element_data)
        elements.append(element_data)
    else:
        # Flat element — existing logic
        content = element_data.pop("content")
        ...
```

Then in the dispatch, route nested types with custom elements through `upload_collection()` instead of the type-specific helpers:

```python
elif collection_type.startswith("sample_sheet"):
    # Route to upload_collection or create_sample_sheet
    ...
```

## Summary

| Problem | Root cause | Scope |
|---|---|---|
| Nested elements crash with `KeyError: 'content'` | Flat-only pre-processing loop | Any collection type when nested elements specified in test YAML |
| Nested types ignore custom elements | Helpers use hardcoded defaults or elements not forwarded | `list:paired`, `list:paired_or_unpaired`, other nested types |
| `sample_sheet` not supported | No dispatch branch | All sample_sheet variants |
| `sample_sheet` metadata not supported | `load_data_dict` has no schema for `column_definitions`/`rows` | Sample_sheet metadata tests |
