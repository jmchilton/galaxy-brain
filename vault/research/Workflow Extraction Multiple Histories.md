---
type: research
subtype: design-problem
tags:
  - research/design-problem
  - galaxy/workflows
  - galaxy/api
related_issues:
  - "[[Issue 9161]]"
  - "[[Issue 13823]]"
status: draft
created: 2026-02-05
revised: 2026-02-05
revision: 1
ai_generated: true
---

# Multiple History Support for ID-Based Workflow Extraction

## Executive Summary

**Yes, the plan should be updated to remove the single-history limitation.**

The single-history restriction in `WORKFLOW_EXTRACTION_HID_TO_ID_ISSUE.md` is an artificial constraint inherited from HID-based assumptions, not a technical requirement. The extraction logic does not fundamentally require datasets to be in one history - it needs a set of datasets/jobs and their relationships. ID-based extraction unlocks the ability to support cross-history datasets, which would fix the "copied dataset problem" (#9161, #13823) more comprehensively.

---

## Analysis: Why Single-History Exists in Current Plan

### In the HID-Based System

The current HID-based extraction requires a single history because:

1. **HID is history-scoped**: HIDs only have meaning within a specific history. `hid=5` in History A is unrelated to `hid=5` in History B.

2. **`WorkflowSummary` iterates one history**: Line 282 of `extract.py`:
   ```python
   for content in self.history.visible_contents:
   ```
   This builds the `hid_to_output_pair` mapping by scanning one history.

3. **HID lookup requires context**: The `hid()` method (lines 259-275) tries to map cross-history objects back to "current history" HIDs, but this is fragile.

### In the Proposed ID-Based System

The plan carries over `from_history_id` as a required parameter, but this is **not technically necessary** when using IDs:

```python
# From the plan (lines 226-232):
if dataset.history_id != history.id:
    # Cross-history dataset - could be supported in future
    raise exceptions.RequestParameterInvalidException(
        f"Dataset {dataset_id} is not in history {history.id}"
    )
```

This check is **artificially restrictive**. With ID-based lookup:
- Dataset ID uniquely identifies the dataset across all histories
- No HID collision is possible
- Connection tracing uses IDs not HIDs

---

## Technical Feasibility of Cross-History Extraction

### What Would Need to Change

**1. API Changes**

Current plan:
```python
from_history_id: DecodedDatabaseIdField  # Required
input_dataset_ids: List[DecodedDatabaseIdField]
```

Updated for cross-history:
```python
from_history_id: Optional[DecodedDatabaseIdField] = None  # Optional, for UI context only
input_dataset_ids: List[DecodedDatabaseIdField]  # Required
input_dataset_collection_ids: List[DecodedDatabaseIdField]
```

The `from_history_id` becomes optional/context-only rather than required.

**2. Extraction Function Changes**

Remove history-scoped validation:
```python
# OLD (restrictive):
if dataset.history_id != history.id:
    raise RequestParameterInvalidException(...)

# NEW (permissive with access check):
if not self.hda_manager.is_accessible(dataset, trans.user):
    raise ItemAccessibilityException(...)
```

**3. WorkflowSummary Changes**

For ID-based extraction, `WorkflowSummary` would not iterate `history.visible_contents`. Instead:

```python
def extract_steps_by_ids(trans, input_dataset_ids, input_collection_ids, job_ids):
    # Load datasets directly by ID
    for dataset_id in input_dataset_ids:
        dataset = trans.sa_session.get(model.HDA, dataset_id)
        # No history check needed, just permission check

    # Load jobs directly by ID
    for job_id in job_ids:
        job = trans.sa_session.get(model.Job, job_id)
        # Trace connections via IDs not HIDs
```

**4. Connection Mapping Uses IDs**

Current (HID-based):
```python
hid_to_output_pair[hid] = (step, "output")
# Later...
if other_hid in hid_to_output_pair:
    # connect
```

ID-based:
```python
id_to_output_pair[(content_type, content_id)] = (step, "output")
# Later...
if (content_type, content_id) in id_to_output_pair:
    # connect
```

This is already proposed in the plan. It naturally supports cross-history because IDs are globally unique.

---

## Benefits of Cross-History Extraction

### 1. Fixes Copied Dataset Problem Completely

From `WORKFLOW_EXTRACTION_ISSUES.md` (#9161):
> When datasets are copied from other histories: All connections are broken, Includes tools from original history

With cross-history ID extraction:
- User copies dataset from History A to History B
- Runs tools on copy in History B
- Extraction request includes: datasets from History B, jobs from History B
- The copied dataset is marked as an input (its ID in B)
- Connections to jobs in B work correctly via IDs
- No "foreign jobs" pulled from History A

### 2. Supports Job Cache Outputs

When job caching returns outputs from a job in another history, ID-based extraction can still trace connections because it doesn't require all outputs to be in the "current" history.

### 3. More Flexible Workflow Construction

Users could potentially construct workflows from multiple analysis sessions across histories:
- Select outputs from History A (training data processing)
- Select outputs from History B (validation data processing)
- Combine into single workflow

---

## Permission Model Considerations

### Current State

The existing code has minimal permission checking in `extract.py`:

```python
# Line 97-98:
# Find each job, for security we (implicitly) check that they are
# associated with a job in the current history.
```

This "implicit" security relies on:
1. User can only access their own history's contents
2. History access is checked at API level (`history_manager.get_accessible`)

### Required Changes for Cross-History

**Explicit Dataset Access Checks**:
```python
for dataset_id in input_dataset_ids:
    dataset = trans.sa_session.get(model.HDA, dataset_id)
    if not dataset:
        raise ObjectNotFound(f"Dataset {dataset_id} not found")

    # Explicit permission check
    if not hda_manager.is_accessible(dataset, trans.user):
        raise ItemAccessibilityException(
            f"Dataset {dataset_id} is not accessible to user"
        )
```

**Explicit Job Access Checks**:
```python
for job_id in job_ids:
    job = job_manager.get_accessible_job(trans, job_id)
    # This already exists in jobs.py:340
```

**Permission Scenarios**:

| Scenario | Should Work? | Permission Check |
|----------|--------------|------------------|
| User's own dataset from another history | Yes | `dataset.user_id == trans.user.id` |
| Shared dataset user can access | Yes | Galaxy's standard dataset access rules |
| Published dataset | Yes | `dataset.dataset.published` |
| Private dataset from another user | No | Access check fails |
| Anonymous user's dataset (session-based) | Complex | May need session tracking |

### Recommendation

Use existing `HDAManager.get_accessible()` or similar for each dataset/collection. This leverages Galaxy's existing permission model without reinventing it.

---

## UI Implications

### Current UI Flow

1. User opens extraction from current history
2. UI shows all jobs/datasets from that history
3. User selects items
4. Extraction runs on single history

### Cross-History UI Options

**Option A: History-Scoped UI (Minimal Change)**
- Keep current UI showing one history at a time
- User selects items from current history
- For copied datasets, UI could show "(copied from History X)"
- API accepts cross-history IDs but UI doesn't expose it directly

**Option B: Multi-History Selection (Future Enhancement)**
- UI allows browsing multiple histories
- User can select items from different histories
- More complex but more powerful

**Recommendation**: Start with Option A. The primary benefit of cross-history support is handling copied datasets correctly, which happens transparently when using IDs. The UI can show the current history but the backend accepts any accessible dataset.

---

## Required Changes to the Plan

### 1. Make `from_history_id` Optional

```python
# Changed from required to optional
from_history_id: Optional[DecodedDatabaseIdField] = None

# If provided, used for:
# - Backward compatibility
# - UI context (which history was open)
# - Fallback for HID-based params
```

### 2. Remove Cross-History Validation Error

In `extract_steps_by_ids()`:

```python
# REMOVE this code:
if dataset.history_id != history.id:
    raise exceptions.RequestParameterInvalidException(...)

# REPLACE with:
self.hda_manager.error_unless_accessible(dataset, trans.user)
```

### 3. Add Permission Checks

```python
def extract_steps_by_ids(trans, input_dataset_ids, ...):
    hda_manager = trans.app.hda_manager  # or inject via DI

    for dataset_id in input_dataset_ids:
        dataset = trans.sa_session.get(model.HDA, dataset_id)
        if not dataset:
            raise ObjectNotFound(f"Dataset {dataset_id} not found")
        hda_manager.error_unless_accessible(dataset, trans.user)

        # ... rest of step creation
```

### 4. Update API Documentation

```python
:param from_history_id: Optional. The history context for extraction.
    Not required for ID-based extraction but may be used for UI purposes.
:param input_dataset_ids: Dataset IDs to use as workflow inputs.
    Datasets may be from any history the user can access.
```

### 5. Update Test Cases

Add tests for:
- Extracting with datasets from different histories (same user)
- Permission denied for inaccessible cross-history dataset
- Mixed: some datasets from current history, some from another

---

## Recommendation

**Update the plan to support cross-history extraction.** Specifically:

1. **Phase 1 (Initial Implementation)**:
   - Add ID-based params as planned
   - Remove the `history_id != history.id` validation
   - Add explicit permission checks per dataset/collection
   - Keep `from_history_id` optional (for UI context, backward compat)

2. **Phase 2 (Vue UI)**:
   - UI continues to show current history
   - Copied datasets work correctly without special handling
   - Future: consider multi-history selection UI

3. **Documentation**:
   - Document that ID-based extraction supports cross-history datasets
   - Note permission requirements

**Justification**:
- Fixes copied dataset bugs (#9161, #13823) more completely
- Minimal additional complexity (just permission checks)
- ID-based lookup naturally supports cross-history
- Single-history was only needed due to HID semantics

---

## Unresolved Questions

1. **Should `from_history_id` be required for backward compat?** Or can we make it fully optional from the start?

2. **Anonymous users**: If a session-based user copies datasets between histories, does session tracking support cross-history access?

3. **Job access**: When job cache is used, the job may be in a different history. Should we allow referencing jobs from other histories if user can access them?

4. **UI discovery**: How does a user discover/select datasets from other histories for extraction? Is this needed in initial implementation or can we rely on copied datasets being in current history?

5. **Shared histories**: If History A is shared with user B, can user B extract workflows using datasets from History A? (Probably yes if access checks pass, but need to verify.)

6. **Collection elements**: For copied collections, do all elements need to be accessible, or just the HDCA itself?
