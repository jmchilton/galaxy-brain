---
type: research
subtype: component
tags:
  - research/component
  - galaxy/workflows
  - galaxy/api
component: Workflow Extraction
status: draft
created: 2026-02-05
revised: 2026-02-05
revision: 1
ai_generated: true
---

# Workflow Extraction in Galaxy - Overview

## Frontend Code

### User Entry Point

**File**: `/client/src/components/History/HistoryOptions.vue` (lines 210-217)

The "Extract Workflow" option appears in the history dropdown menu:

```vue
<BDropdownItem
    v-if="historyStore.currentHistoryId === history.id"
    :disabled="isAnonymous"
    :title="userTitle('Convert History to Workflow')"
    @click="iframeRedirect(`/workflow/build_from_current_history?history_id=${history.id}`)">
    <FontAwesomeIcon fixed-width :icon="faFileExport" />
    <span v-localize>Extract Workflow</span>
</BDropdownItem>
```

Key points:
- Only available for the **current history** (not other histories in multiview)
- Requires user to be logged in
- Uses `iframeRedirect` to load the legacy Mako-based extraction UI

### Legacy Mako Template

**File**: `/templates/build_from_current_history.mako`

This is the actual extraction UI - a server-rendered Mako template (not Vue). It provides:

1. **Workflow name input** - Pre-filled with "Workflow constructed from history '{history_name}'"
2. **Job listing table** with columns:
   - Tool name (with checkbox to include/exclude)
   - Output datasets created by that job
3. **Input dataset marking** - Datasets can be marked as workflow inputs with custom names
4. **Tool compatibility warnings** - Non-workflow-compatible tools shown in gray/disabled
5. **Version warnings** - Alerts when tool version differs from extraction version

Form submission posts back to same endpoint with selected `job_ids`, `dataset_ids`, `workflow_name`.

### Web Controller (serves the Mako template)

**File**: `/lib/galaxy/webapps/galaxy/controllers/workflow.py` (lines 182-230)

**Method**: `build_from_current_history()`

Two-phase handling:
1. **GET request** (initial load):
   - Calls `summarize(trans, history)` to analyze history
   - Returns jobs dict and warnings
   - Renders `build_from_current_history.mako` template

2. **POST request** (form submission):
   - Calls `extract_workflow()` with selected job_ids, dataset_ids, workflow_name
   - Returns success message with links to edit/run the new workflow

```python
if (job_ids is None and dataset_ids is None) or workflow_name is None:
    jobs, warnings = summarize(trans, history)
    return trans.fill_template("build_from_current_history.mako", jobs=jobs, warnings=warnings, history=history)
else:
    stored_workflow = extract_workflow(trans, user=user, history=history, job_ids=job_ids, ...)
    # Returns success message with edit/run links
```

## Backend Code

### Core Extraction Module

**File**: `/lib/galaxy/workflow/extract.py` (463 lines)

#### Main Functions

- **`extract_workflow()`** (lines 34-77)
  - Entry point for workflow extraction
  - Takes trans, user, history, job_ids, dataset_ids, dataset_collection_ids, workflow_name
  - Returns a stored workflow object

- **`extract_steps()`** (lines 80-197)
  - Builds workflow steps from history content
  - Handles job-to-step mapping
  - Manages input/output connections

- **`summarize()`** (lines 233-240)
  - Called by web controller to prepare data for Mako template
  - Returns `(jobs, warnings)` tuple
  - Creates `WorkflowSummary` instance internally

#### Key Classes

- **`WorkflowSummary`** (lines 243-389)
  - Analyzes history for extractable content
  - Identifies jobs, datasets, collections
  - Maps job IDs to representative jobs (for implicit collection jobs)
  - Tracks `hda_hid_in_history` and `hdca_hid_in_history` for HID lookups
  - `__summarize()` method builds the jobs dict shown in the extraction UI

### API Controller

**File**: `/lib/galaxy/webapps/galaxy/api/workflows.py`

- **Create workflow endpoint** (lines 196-317)
  - Handles `POST /api/workflows`
  - Supports `from_history_id` parameter for extraction mode

### Manager Layer

**File**: `/lib/galaxy/managers/workflows.py`

- Coordinates between API and extraction logic
- Handles permissions and storage

## APIs

### Workflow Extraction Endpoint

**Route**: `POST /api/workflows`

**Key Parameters for Extraction**:
- `from_history_id` (required for extraction) - History ID to extract from
- `job_ids` (optional) - Specific jobs to include
- `dataset_ids` (optional) - Specific datasets to include
- `dataset_collection_ids` (optional) - Specific collections to include
- `workflow_name` (optional) - Name for extracted workflow

**Response**:
```json
{
  "id": "workflow_encoded_id",
  "name": "Extracted Workflow",
  "steps": {...},
  "annotation": "...",
  ...
}
```

**Error Handling**:
- 400: Invalid parameters or unextractable content
- 403: Permission denied on history
- 404: History not found

## Roundtrip Workflow Extraction Tests

**File**: `/lib/galaxy_test/api/test_workflow_extraction.py` (687 lines)

### What "Roundtrip" Means

Roundtrip testing validates that:
1. A workflow can be run on input data
2. The resulting history can have a workflow extracted from it
3. The extracted workflow matches the original (structurally)
4. The extracted workflow can be run again with equivalent results

### Test Scenarios

1. **Basic extraction** - Simple tool chains
2. **Copied content handling** - Datasets copied between histories
3. **Collection mapping** - Tools that map over collections
4. **Collection reduction** - Tools that reduce collections to single outputs
5. **Subcollection nesting** - Nested collection structures
6. **Output collections** - Tools producing collection outputs
7. **Multiple inputs** - Workflows with multiple input datasets
8. **Conditional steps** - Steps with when clauses
9. **Subworkflows** - Nested workflow extraction

### Key Test Patterns

```python
# Typical roundtrip test pattern
def test_extract_workflow_xxx(self):
    # 1. Run a workflow
    history_id = self.dataset_populator.new_history()
    self._run_workflow(workflow_def, history_id=history_id)

    # 2. Extract workflow from history
    extracted = self._extract_workflow(history_id)

    # 3. Verify structure matches
    self._assert_workflow_structure(extracted, expected_structure)

    # 4. Optionally run extracted workflow
    self._run_workflow(extracted, new_history_id)
```

### Helper Methods

- `_extract_workflow(history_id, **kwargs)` - Calls extraction API
- `_assert_workflow_structure()` - Validates extracted workflow
- `_run_workflow()` - Executes workflow for testing
- `_wait_for_history()` - Waits for history to settle

### Test Limitations Noted

- Some complex nested subworkflow scenarios may not roundtrip perfectly
- Collection type inference can be imperfect in edge cases
- Tool version changes between extraction and re-run can cause issues
