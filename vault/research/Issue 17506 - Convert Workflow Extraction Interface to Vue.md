---
type: research
subtype: issue
tags:
  - research/issue
  - galaxy/workflows
  - galaxy/api
  - galaxy/client
github_issue: 17506
github_repo: galaxyproject/galaxy
related_issues:
  - "[[Issue 17194]]"
  - "[[Issue 9161]]"
  - "[[Issue 13823]]"
  - "[[Issue 21336]]"
status: draft
created: 2026-02-05
revised: 2026-02-05
revision: 1
ai_generated: true
---

# Issue #17506: Convert Workflow Extraction Interface to Vue

**URL**: https://github.com/galaxyproject/galaxy/issues/17506
**Status**: Open
**Created**: 2024-02-20
**Author**: @guerler (Aysam Guerler)
**Labels**: `kind/enhancement`, `area/UI-UX`, `kind/refactoring`, `area/backend`

---

## Issue Description

> The last non-data display related mako in Galaxy is the `build_from_current_history` mako. This mako and its associated controller endpoint should be converted to FastAPI and Vue.

![Current Mako UI](https://github.com/galaxyproject/galaxy/assets/2105447/3afb8d42-55a5-4f10-b989-88d37f32f773)

---

## Discussion Thread

### Comment 1: @guerler (2024-02-20)

> Having discussed this with @bgruening, the more reasonable alternative here might be to extract the workflow and display it in the workflow editor without having to display the list and selection options for the datasets.

**Proposal**: Skip the selection UI entirely - just extract everything and let users edit in the workflow editor.

---

### Comment 2: @mvdbeek (2024-02-20)

> I don't know if that's feasible for large histories where you might get a lot of crap (see the check all <-> uncheck all). if your goal is to remove makos without further changes I'd just convert it to vue ?

**Concern**: Large histories would produce cluttered workflows. The selection UI serves a purpose.

**Suggestion**: If goal is just removing Mako, do a straight Vue conversion.

---

### Comment 3: @jmchilton (2024-02-21) 👍×1

Detailed technical context about the extraction API:

> I mentioned at the backend meeting I would post about the API for extracting workflows. Here is code for POST /api/workflows if `from_history_id` is included in the request:

```python
if "from_history_id" in payload:
    from_history_id = payload.get("from_history_id")
    from_history_id = self.decode_id(from_history_id)
    history = self.history_manager.get_accessible(from_history_id, trans.user, current_history=trans.history)

    job_ids = [self.decode_id(_) for _ in payload.get("job_ids", [])]
    dataset_ids = payload.get("dataset_ids", [])
    dataset_collection_ids = payload.get("dataset_collection_ids", [])
    workflow_name = payload["workflow_name"]
    stored_workflow = extract_workflow(
        trans=trans,
        user=trans.user,
        history=history,
        job_ids=job_ids,
        dataset_ids=dataset_ids,
        dataset_collection_ids=dataset_collection_ids,
        workflow_name=workflow_name,
    )
    item = stored_workflow.to_dict(value_mapper={"id": trans.security.encode_id})
    item["url"] = url_for("workflow", id=item["id"])
    return item
```

> We have a lot of good tests written around this code to ensure for instance that history import/export doesn't mess up workflow extraction as an indication that copying dataset logic, etc... is being preserved properly. I hope whatever is done here is done with care and done with an eye toward extension in the future. **I think extracting workflows from histories is pretty much the core idea of Galaxy to my mind.**

**Key points**:
- API already exists at `POST /api/workflows` with `from_history_id`
- Accepts `job_ids`, `dataset_ids`, `dataset_collection_ids` for filtering
- Extensive test coverage exists
- Core Galaxy feature - proceed carefully

---

### Comment 4: @guerler (2024-02-21)

> Thanks @jmchilton, and yes I agree. I would like us to use this endpoint as is and without augmenting it unnecessarily. Adding an additional filter option to export a history to a workflow on the basis of a subset of dataset and dataset collection entries might not be worthwhile imo. Instead users could easily create a copy of a history with a subset of entries and/or edit the workflow after it has been exported.

**Conclusion**: Use existing API as-is. Users can:
1. Copy history subset first, then extract
2. Edit workflow after extraction

---

## Current Architecture

### Frontend Entry Point
**File**: `client/src/components/History/HistoryOptions.vue` (lines 210-217)

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

Uses `iframeRedirect` to load the legacy Mako template.

### Mako Template
**File**: `templates/build_from_current_history.mako`

- Server-rendered HTML form
- Shows job list with checkboxes
- Allows marking datasets as inputs
- Posts back to same endpoint

### Web Controller
**File**: `lib/galaxy/webapps/galaxy/controllers/workflow.py` (lines 182-230)

Two-phase handling:
1. **GET**: Calls `summarize(trans, history)`, renders Mako template
2. **POST**: Calls `extract_workflow()`, returns success message

### API Endpoint
**File**: `lib/galaxy/webapps/galaxy/api/workflows.py` (lines 278+)

`POST /api/workflows` with `from_history_id` parameter already supports:
- `job_ids` - filter to specific jobs
- `dataset_ids` - mark specific datasets as inputs
- `dataset_collection_ids` - mark specific collections as inputs
- `workflow_name` - name for extracted workflow

---

## What's Missing for Vue Conversion

### 1. Summarize API Endpoint

The Mako template uses `summarize(trans, history)` which returns `(jobs, warnings)`. This data is used to render the job list with checkboxes.

**Need**: A new API endpoint to get extraction summary data:
```
GET /api/histories/{history_id}/extraction_summary
```

Response would include:
- List of jobs with tool info
- List of outputs per job
- Disabled tools (not workflow-compatible)
- Version warnings
- Datasets that can be marked as inputs

### 2. Vue Component

A new Vue component to replace the Mako template:
- Display job list with checkboxes
- Allow marking datasets as inputs
- Handle form submission via API
- Navigate to workflow editor on success

---

## Related PRs

| PR | Title | Status |
|----|-------|--------|
| #11151 | Fix certain classes of workflow extraction on copied objects | Merged |
| #11165 | Fix import of histories with collections copied from another history | Merged |
| #10560 | Fix workflow extraction if nested collection in input step | Merged |
| #19525 | Fix extracting workflows from purged and deleted histories | Merged |
| #18745 | [WIP] Implement Tool Request API | Closed |

---

## Implementation Options

### Option A: Straight Vue Conversion

**Approach**:
1. Create `GET /api/histories/{history_id}/extraction_summary` endpoint
2. Build Vue component that mirrors current Mako functionality
3. Remove Mako template and controller endpoint

**Pros**:
- Preserves current UX
- Users familiar with existing workflow

**Cons**:
- More work than Option B
- Maintains selection UI complexity

### Option B: Simplified Extraction

**Approach**:
1. Extract full workflow automatically
2. Open in workflow editor
3. Let users delete unwanted steps

**Pros**:
- Simpler implementation
- Leverages existing workflow editor

**Cons**:
- Large histories produce cluttered workflows
- Loss of "mark as input" pre-selection

### Option C: Hybrid Approach

**Approach**:
1. Create summary API endpoint
2. Build minimal Vue selection UI
3. Focus on job selection (not individual datasets)
4. Use API for extraction, redirect to editor

**Pros**:
- Modernizes stack
- Keeps essential selection feature
- Simpler than full recreation

---

## Proposed Implementation Plan

### Phase 1: Backend API

1. Create `GET /api/histories/{history_id}/extraction_summary` endpoint
   - Return jobs list with tool info, outputs, warnings
   - Return datasets available as inputs
   - Use existing `summarize()` function

2. Ensure `POST /api/workflows` with `from_history_id` handles all cases

### Phase 2: Vue Component

1. Create `WorkflowExtraction.vue` component
2. Fetch summary data from new API
3. Render job list with selection checkboxes
4. Handle input dataset marking
5. Submit via existing API
6. Navigate to workflow editor on success

### Phase 3: Cleanup

1. Update `HistoryOptions.vue` to use new component (remove iframeRedirect)
2. Remove Mako template
3. Remove legacy controller endpoint
4. Update tests

---

## Unresolved Questions

1. **Selection granularity**: Jobs only, or individual outputs too?
2. **Input marking UX**: How to handle in Vue (inline vs modal)?
3. **Large history performance**: Pagination or virtualization needed?
4. **Error handling**: How to display extraction failures?
5. **Accessibility**: Current Mako has accessibility issues (#17194)

---

## Related Issues

- **#17194** - Set a label for checkboxes in workflow extraction view (accessibility)
- **#9161** - Extracting workflow from history with copied datasets breaks
- **#13823** - Workflow extraction fails (in specific identified cases)
- **#21336** - Extract workflow from history misses connections
