---
type: plan
tags:
  - plan
  - galaxy/workflows
  - galaxy/api
  - galaxy/client
title: Workflow Extraction Vue Conversion
related_issues:
  - "[[Issue 17506]]"
status: draft
created: 2026-02-05
revised: 2026-02-05
revision: 1
ai_generated: true
---

# Workflow Extraction Vue Conversion Plan

## Overview

Convert the legacy Mako-based workflow extraction UI (`build_from_current_history.mako`) to a modern Vue.js component with FastAPI backend. This is the last non-data-display Mako template in Galaxy.

**Related Issue**: [#17506](https://github.com/galaxyproject/galaxy/issues/17506)

---

## Code Review Summary

This plan was reviewed for Galaxy coding standards. Key findings:

### Critical Issues (Fixed Below)

| Issue | Location | Fix |
|-------|----------|-----|
| Missing CBV wrapper | API endpoint | Need `@router.cbv` class, not standalone function |
| Missing error responses | API endpoint | Add 403/404 response documentation |
| No error handling | Service layer | Add try/except with proper exceptions |
| Wrong test base class | Test code | Use `ApiTestCase` not `BaseWorkflowPopulator` |

### High Priority Issues (Fixed Below)

| Issue | Location | Fix |
|-------|----------|-----|
| Type annotation gaps | Service layer | Add return types, parameter types |
| Use `isinstance()` | Service layer | Replace `getattr(job, 'is_fake', False)` pattern |
| Test coverage incomplete | Test code | Expand from 4 tests to ~15 tests |

### Medium Priority Recommendations

| Issue | Recommendation |
|-------|----------------|
| Long service method | Extract `_build_job_response()` helper |
| Large history performance | Consider pagination (see Unresolved Questions) |
| Job ID encoding inconsistent | Always use `trans.security.encode_id()` |

---

## Phase 1: Backend API

### 1.1 Pydantic Response Models

**File**: `lib/galaxy/schema/workflow_extraction.py` (new file)

```python
from typing import Optional
from pydantic import BaseModel, Field


class WorkflowExtractionOutputDataset(BaseModel):
    """Represents a dataset or collection output from a job."""
    id: str = Field(..., description="Encoded ID of the dataset/collection")
    hid: int = Field(..., description="History ID number")
    name: str = Field(..., description="Display name")
    state: str = Field(..., description="Current state (ok, running, etc.)")
    deleted: bool = Field(..., description="Whether this output has been deleted")
    history_content_type: str = Field(..., description="'dataset' or 'dataset_collection'")


class WorkflowExtractionJob(BaseModel):
    """Represents a job available for workflow extraction."""
    id: str = Field(..., description="Encoded job ID (may be 'fake_*' for input datasets)")
    tool_name: str = Field(..., description="Human-readable tool name")
    tool_id: Optional[str] = Field(None, description="Tool ID (None for fake jobs)")
    tool_version: Optional[str] = Field(None, description="Tool version used")
    is_workflow_compatible: bool = Field(..., description="Whether tool can be used in workflows")
    is_fake: bool = Field(..., description="True for input datasets with no creating job")
    disabled_reason: Optional[str] = Field(None, description="Why this job cannot be included")
    outputs: list[WorkflowExtractionOutputDataset] = Field(
        default_factory=list,
        description="Datasets/collections created by this job"
    )
    version_warning: Optional[str] = Field(
        None,
        description="Warning if current tool version differs from job's version"
    )
    has_non_deleted_outputs: bool = Field(
        ...,
        description="True if at least one output is not deleted"
    )


class WorkflowExtractionSummary(BaseModel):
    """Summary data for workflow extraction UI."""
    history_id: str = Field(..., description="Encoded history ID")
    history_name: str = Field(..., description="History name")
    jobs: list[WorkflowExtractionJob] = Field(
        default_factory=list,
        description="Jobs available for extraction, ordered by output HID"
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Global warnings (e.g., 'Some datasets still queued')"
    )
    default_workflow_name: str = Field(
        ...,
        description="Suggested default workflow name"
    )
```

### 1.2 API Endpoint

**File**: `lib/galaxy/webapps/galaxy/api/histories.py` (add to FastAPIHistories class)

> **Review Note**: Galaxy uses class-based views (CBV) with `@router.cbv`. The endpoint must be a method within the existing `FastAPIHistories` class, not a standalone function. Also need error response documentation.

```python
from galaxy.schema.workflow_extraction import WorkflowExtractionSummary

# Add to existing FastAPIHistories class (already decorated with @router.cbv):

@router.get(
    "/api/histories/{history_id}/extraction_summary",
    summary="Get workflow extraction summary for a history.",
    description="Returns the jobs and datasets available for workflow extraction from this history.",
    responses={
        403: {"description": "Not authorized to access this history"},
        404: {"description": "History not found"},
    },
)
def extraction_summary(
    self,
    history_id: HistoryIDPathParam,
    trans: ProvidesHistoryContext = DependsOnTrans,
) -> WorkflowExtractionSummary:
    """Get summary data needed to build a workflow from history contents."""
    return self.service.get_extraction_summary(trans, history_id)
```

Note: This method goes inside the existing `FastAPIHistories` class which is already wrapped with `@router.cbv`. Galaxy auto-discovers routers - no manual registration needed.

### 1.3 Service Layer

**File**: `lib/galaxy/webapps/galaxy/services/histories.py` (add method)

> **Review Notes**:
> - Use `isinstance()` for FakeJob detection (not `getattr(job, 'is_fake')`)
> - Add error handling with proper Galaxy exceptions
> - Add type annotations for all parameters and return types
> - Extract helper method for job transformation

```python
from typing import Union

from galaxy.exceptions import ObjectNotFound, ItemAccessibilityException
from galaxy.model import Job
from galaxy.workflow.extract import summarize, FakeJob, DatasetCollectionCreationJob
from galaxy.schema.workflow_extraction import (
    WorkflowExtractionSummary,
    WorkflowExtractionJob,
    WorkflowExtractionOutputDataset,
)

# Add to HistoriesService class:

def get_extraction_summary(
    self,
    trans: ProvidesHistoryContext,
    history_id: DecodedDatabaseIdField,
) -> WorkflowExtractionSummary:
    """Build extraction summary for workflow creation from history.

    Raises:
        ObjectNotFound: If history does not exist
        ItemAccessibilityException: If user cannot access history
    """
    try:
        history = self.manager.get_accessible(history_id, trans.user, current_history=trans.history)
    except ObjectNotFound:
        raise ObjectNotFound(f"History {history_id} not found")
    except ItemAccessibilityException:
        raise ItemAccessibilityException(f"Cannot access history {history_id}")

    # Use existing summarize() function
    jobs_dict, warnings = summarize(trans, history)

    # Transform to API response format
    extraction_jobs = [
        self._build_extraction_job(trans, job, datasets)
        for job, datasets in jobs_dict.items()
    ]

    return WorkflowExtractionSummary(
        history_id=trans.security.encode_id(history.id),
        history_name=history.name,
        jobs=extraction_jobs,
        warnings=list(warnings),
        default_workflow_name=f"Workflow constructed from history '{history.name}'",
    )

def _build_extraction_job(
    self,
    trans: ProvidesHistoryContext,
    job: Union[Job, FakeJob, DatasetCollectionCreationJob],
    datasets: list,
) -> WorkflowExtractionJob:
    """Transform a job and its outputs into an API response object."""
    is_fake = isinstance(job, (FakeJob, DatasetCollectionCreationJob))

    # Determine tool info
    tool_name = "Unknown"
    tool_id = None
    tool_version = None
    is_workflow_compatible = False
    disabled_reason = None
    version_warning = None

    if is_fake:
        tool_name = job.name if hasattr(job, 'name') and job.name else "Input Dataset"
        disabled_reason = job.disabled_why if hasattr(job, 'disabled_why') else "This item cannot be used in workflows"
    else:
        tool = trans.app.toolbox.get_tool(job.tool_id, tool_version=job.tool_version)
        tool_id = job.tool_id
        tool_version = job.tool_version
        if tool:
            tool_name = tool.name
            is_workflow_compatible = tool.is_workflow_compatible
            if not is_workflow_compatible:
                disabled_reason = "This tool cannot be used in workflows"
            elif tool.version != job.tool_version:
                version_warning = (
                    f'Dataset was created with tool version "{job.tool_version}", '
                    f'but workflow extraction will use version "{tool.version}".'
                )
        else:
            disabled_reason = "Tool not found"

    # Build output list
    outputs = []
    for output_name, data in datasets:
        outputs.append(WorkflowExtractionOutputDataset(
            id=trans.security.encode_id(data.id),
            hid=data.hid,
            name=data.display_name() if hasattr(data, 'display_name') else data.name,
            state=data.state or "queued",
            deleted=data.deleted,
            history_content_type=data.history_content_type,
        ))

    has_non_deleted = any(not o.deleted for o in outputs)

    # Encode job ID consistently
    if is_fake:
        job_id = str(job.id)  # FakeJob IDs are already strings like "fake_123"
    else:
        job_id = trans.security.encode_id(job.id)

    return WorkflowExtractionJob(
        id=job_id,
        tool_name=tool_name,
        tool_id=tool_id,
        tool_version=tool_version,
        is_workflow_compatible=is_workflow_compatible and not is_fake,
        is_fake=is_fake,
        disabled_reason=disabled_reason,
        outputs=outputs,
        version_warning=version_warning,
        has_non_deleted_outputs=has_non_deleted,
    )
```

---

## Phase 2: Vue Component

### 2.1 API Client

**File**: `client/src/api/workflowExtraction.ts` (new file)

```typescript
import { GalaxyApi } from "@/api";
import { rethrowSimple } from "@/utils/simple-error";

export interface ExtractionOutputDataset {
    id: string;
    hid: number;
    name: string;
    state: string;
    deleted: boolean;
    history_content_type: "dataset" | "dataset_collection";
}

export interface ExtractionJob {
    id: string;
    tool_name: string;
    tool_id: string | null;
    tool_version: string | null;
    is_workflow_compatible: boolean;
    is_fake: boolean;
    disabled_reason: string | null;
    outputs: ExtractionOutputDataset[];
    version_warning: string | null;
    has_non_deleted_outputs: boolean;
}

export interface ExtractionSummary {
    history_id: string;
    history_name: string;
    jobs: ExtractionJob[];
    warnings: string[];
    default_workflow_name: string;
}

export async function getExtractionSummary(historyId: string): Promise<ExtractionSummary> {
    const { data, error } = await GalaxyApi().GET("/api/histories/{history_id}/extraction_summary", {
        params: { path: { history_id: historyId } },
    });
    if (error) {
        rethrowSimple(error);
    }
    return data as ExtractionSummary;
}

export interface ExtractWorkflowPayload {
    from_history_id: string;
    workflow_name: string;
    job_ids: string[];
    dataset_ids: number[];
    dataset_collection_ids: number[];
    dataset_names?: string[];
    dataset_collection_names?: string[];
}

export async function extractWorkflow(payload: ExtractWorkflowPayload): Promise<{ id: string; url: string }> {
    const { data, error } = await GalaxyApi().POST("/api/workflows", {
        body: payload,
    });
    if (error) {
        rethrowSimple(error);
    }
    return data as { id: string; url: string };
}
```

### 2.2 Main Component

**File**: `client/src/components/Workflow/WorkflowExtraction.vue` (new file)

```vue
<script setup lang="ts">
import { faCheck, faExclamationTriangle, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { BAlert, BFormCheckbox, BFormInput, BTable } from "bootstrap-vue";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router/composables";

import {
    extractWorkflow,
    getExtractionSummary,
    type ExtractionJob,
    type ExtractionOutputDataset,
    type ExtractionSummary,
} from "@/api/workflowExtraction";
import { Toast } from "@/composables/toast";

import AsyncButton from "@/components/Common/AsyncButton.vue";
import Heading from "@/components/Common/Heading.vue";
import LoadingSpan from "@/components/LoadingSpan.vue";

interface Props {
    historyId: string;
}

const props = defineProps<Props>();
const router = useRouter();

// State
const loading = ref(true);
const loadError = ref<string | null>(null);
const summary = ref<ExtractionSummary | null>(null);
const workflowName = ref("");
const selectedJobs = ref<Set<string>>(new Set());
const inputDatasets = ref<Map<string, { hid: number; name: string; type: string }>>(new Map());

// Computed
const selectableJobs = computed(() => {
    if (!summary.value) return [];
    return summary.value.jobs.filter((j) => j.is_workflow_compatible && j.has_non_deleted_outputs);
});

const disabledJobs = computed(() => {
    if (!summary.value) return [];
    return summary.value.jobs.filter((j) => !j.is_workflow_compatible || j.is_fake);
});

const canSubmit = computed(() => {
    return workflowName.value.trim().length > 0 && (selectedJobs.value.size > 0 || inputDatasets.value.size > 0);
});

// Methods
async function loadSummary() {
    loading.value = true;
    loadError.value = null;
    try {
        summary.value = await getExtractionSummary(props.historyId);
        workflowName.value = summary.value.default_workflow_name;

        // Pre-select all workflow-compatible jobs with non-deleted outputs
        selectableJobs.value.forEach((job) => {
            selectedJobs.value.add(job.id);
        });
    } catch (e) {
        loadError.value = String(e);
    } finally {
        loading.value = false;
    }
}

function toggleJob(jobId: string) {
    if (selectedJobs.value.has(jobId)) {
        selectedJobs.value.delete(jobId);
    } else {
        selectedJobs.value.add(jobId);
    }
}

function toggleAllJobs(checked: boolean) {
    if (checked) {
        selectableJobs.value.forEach((job) => selectedJobs.value.add(job.id));
    } else {
        selectedJobs.value.clear();
    }
    // Also toggle input dataset selections
    if (checked) {
        disabledJobs.value.forEach((job) => {
            job.outputs.forEach((output) => {
                const key = `${output.history_content_type}_${output.hid}`;
                inputDatasets.value.set(key, {
                    hid: output.hid,
                    name: output.name,
                    type: output.history_content_type,
                });
            });
        });
    } else {
        inputDatasets.value.clear();
    }
}

function toggleInputDataset(output: ExtractionOutputDataset) {
    const key = `${output.history_content_type}_${output.hid}`;
    if (inputDatasets.value.has(key)) {
        inputDatasets.value.delete(key);
    } else {
        inputDatasets.value.set(key, {
            hid: output.hid,
            name: output.name,
            type: output.history_content_type,
        });
    }
}

function isInputSelected(output: ExtractionOutputDataset): boolean {
    return inputDatasets.value.has(`${output.history_content_type}_${output.hid}`);
}

async function onSubmit() {
    // Separate dataset and collection inputs
    const datasetIds: number[] = [];
    const datasetNames: string[] = [];
    const collectionIds: number[] = [];
    const collectionNames: string[] = [];

    inputDatasets.value.forEach((input) => {
        if (input.type === "dataset") {
            datasetIds.push(input.hid);
            datasetNames.push(input.name);
        } else {
            collectionIds.push(input.hid);
            collectionNames.push(input.name);
        }
    });

    try {
        const result = await extractWorkflow({
            from_history_id: props.historyId,
            workflow_name: workflowName.value,
            job_ids: Array.from(selectedJobs.value),
            dataset_ids: datasetIds,
            dataset_collection_ids: collectionIds,
            dataset_names: datasetNames,
            dataset_collection_names: collectionNames,
        });

        Toast.success(`Workflow "${workflowName.value}" created successfully!`);
        router.push(`/workflows/edit?id=${result.id}`);
    } catch (e) {
        Toast.error(`Failed to create workflow: ${e}`);
    }
}

onMounted(() => {
    loadSummary();
});
</script>

<template>
    <div class="workflow-extraction">
        <Heading h1 separator size="lg">Extract Workflow from History</Heading>

        <LoadingSpan v-if="loading" message="Loading history contents..." />

        <BAlert v-else-if="loadError" variant="danger" show>
            Failed to load history: {{ loadError }}
        </BAlert>

        <template v-else-if="summary">
            <p>
                The following list contains each tool that was run to create the datasets in your history.
                Please select those that you wish to include in the workflow.
            </p>
            <p class="text-muted">
                Tools which cannot be run interactively and thus cannot be incorporated into a workflow
                will be shown in gray.
            </p>

            <!-- Warnings -->
            <BAlert v-for="(warning, idx) in summary.warnings" :key="idx" variant="warning" show>
                {{ warning }}
            </BAlert>

            <!-- Workflow Name -->
            <div class="form-group mb-3">
                <label for="workflow-name" class="font-weight-bold">Workflow name</label>
                <BFormInput
                    id="workflow-name"
                    v-model="workflowName"
                    type="text"
                    placeholder="Enter workflow name"
                />
            </div>

            <!-- Action Buttons -->
            <div class="mb-3">
                <AsyncButton
                    color="blue"
                    :icon="faCheck"
                    title="Create Workflow"
                    :disabled="!canSubmit"
                    :action="onSubmit">
                    Create Workflow
                </AsyncButton>
                <button class="btn btn-secondary ml-2" @click="toggleAllJobs(true)">Check all</button>
                <button class="btn btn-secondary ml-2" @click="toggleAllJobs(false)">Uncheck all</button>
            </div>

            <!-- Jobs Table -->
            <table class="table table-bordered extraction-table">
                <thead>
                    <tr>
                        <th style="width: 47.5%">Tool</th>
                        <th style="width: 5%"></th>
                        <th style="width: 47.5%">History items created</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="job in summary.jobs" :key="job.id" :class="{ disabled: !job.is_workflow_compatible }">
                        <td>
                            <div class="tool-form" :class="{ 'tool-form-disabled': !job.is_workflow_compatible }">
                                <div class="tool-form-title">{{ job.tool_name }}</div>
                                <div class="tool-form-body">
                                    <template v-if="!job.is_workflow_compatible">
                                        <p class="text-muted font-italic">
                                            {{ job.disabled_reason || "This tool cannot be used in workflows" }}
                                        </p>
                                    </template>
                                    <template v-else>
                                        <BFormCheckbox
                                            :checked="selectedJobs.has(job.id)"
                                            @change="toggleJob(job.id)">
                                            Include "{{ job.tool_name }}" in workflow
                                        </BFormCheckbox>
                                        <BAlert v-if="!job.has_non_deleted_outputs" variant="info" show class="mt-2 mb-0">
                                            All job outputs have been deleted
                                        </BAlert>
                                        <BAlert v-if="job.version_warning" variant="warning" show class="mt-2 mb-0">
                                            {{ job.version_warning }}
                                        </BAlert>
                                    </template>
                                </div>
                            </div>
                        </td>
                        <td class="text-center align-middle">&#x25B6;</td>
                        <td>
                            <div v-for="output in job.outputs" :key="output.id" class="output-item">
                                <div
                                    class="dataset-item"
                                    :class="[`state-${output.state}`, { deleted: output.deleted }]">
                                    <span class="hid">{{ output.hid }}</span>
                                    <span class="name">{{ output.name }}</span>
                                </div>
                                <template v-if="!job.is_workflow_compatible">
                                    <BFormCheckbox
                                        :checked="isInputSelected(output)"
                                        class="ml-2"
                                        @change="toggleInputDataset(output)">
                                        Treat as input {{ output.history_content_type === 'dataset_collection' ? 'collection' : 'dataset' }}
                                    </BFormCheckbox>
                                    <BFormInput
                                        v-if="isInputSelected(output)"
                                        v-model="inputDatasets.get(`${output.history_content_type}_${output.hid}`).name"
                                        size="sm"
                                        class="ml-4 mt-1"
                                        style="max-width: 300px"
                                    />
                                </template>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </template>
    </div>
</template>

<style scoped lang="scss">
.workflow-extraction {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
}

.extraction-table {
    .disabled {
        opacity: 0.7;
    }
}

.tool-form {
    border: 1px solid #ddd;
    border-radius: 4px;
    margin: 0.5rem 0;

    &.tool-form-disabled {
        background-color: #f8f9fa;

        .tool-form-title {
            color: #6c757d;
        }
    }
}

.tool-form-title {
    background-color: #e9ecef;
    padding: 0.5rem 1rem;
    font-weight: bold;
    border-bottom: 1px solid #ddd;
}

.tool-form-body {
    padding: 0.5rem 1rem;
}

.output-item {
    margin: 0.5rem 0;
}

.dataset-item {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    background-color: #f0f0f0;

    &.deleted {
        opacity: 0.5;
        text-decoration: line-through;
    }

    &.state-ok {
        border-left: 3px solid #28a745;
    }

    &.state-error {
        border-left: 3px solid #dc3545;
    }

    &.state-running, &.state-queued {
        border-left: 3px solid #ffc107;
    }

    .hid {
        font-weight: bold;
        margin-right: 0.25rem;
    }
}
</style>
```

### 2.3 Route Registration

**File**: `client/src/entry/analysis/router.js`

Add import and route:

```javascript
// Add import at top
import WorkflowExtraction from "@/components/Workflow/WorkflowExtraction.vue";

// Add route in the children array of Analysis routes (around line 880)
{
    path: "workflows/extract",
    component: WorkflowExtraction,
    redirect: redirectAnon(),
    props: (route) => ({
        historyId: route.query.history_id,
    }),
},
```

---

## Phase 3: Integration

### 3.1 Update HistoryOptions.vue

**File**: `client/src/components/History/HistoryOptions.vue`

Replace the iframeRedirect call with Vue router navigation:

```vue
<!-- Before (lines 210-217) -->
<BDropdownItem
    v-if="historyStore.currentHistoryId === history.id"
    :disabled="isAnonymous"
    :title="userTitle('Convert History to Workflow')"
    @click="iframeRedirect(`/workflow/build_from_current_history?history_id=${history.id}`)">
    <FontAwesomeIcon fixed-width :icon="faFileExport" />
    <span v-localize>Extract Workflow</span>
</BDropdownItem>

<!-- After -->
<BDropdownItem
    v-if="historyStore.currentHistoryId === history.id"
    :disabled="isAnonymous"
    :title="userTitle('Convert History to Workflow')"
    :to="`/workflows/extract?history_id=${history.id}`">
    <FontAwesomeIcon fixed-width :icon="faFileExport" />
    <span v-localize>Extract Workflow</span>
</BDropdownItem>
```

Remove `iframeRedirect` import if no longer used elsewhere.

---

## Phase 4: Cleanup

### 4.1 Remove Legacy Code

1. **Delete Mako template**: `templates/build_from_current_history.mako`

2. **Remove controller method** from `lib/galaxy/webapps/galaxy/controllers/workflow.py`:
   - Delete `build_from_current_history()` method (lines 182-230)

3. **Update imports** if `summarize` is no longer imported in controller

---

## File Changes Summary

### New Files
| File | Description |
|------|-------------|
| `lib/galaxy/schema/workflow_extraction.py` | Pydantic models for extraction API |
| `client/src/api/workflowExtraction.ts` | TypeScript API client |
| `client/src/components/Workflow/WorkflowExtraction.vue` | Main Vue component |

### Modified Files
| File | Changes |
|------|---------|
| `lib/galaxy/webapps/galaxy/api/histories.py` | Add `extraction_summary` endpoint |
| `lib/galaxy/webapps/galaxy/services/histories.py` | Add `get_extraction_summary` method |
| `client/src/entry/analysis/router.js` | Add route for WorkflowExtraction |
| `client/src/components/History/HistoryOptions.vue` | Replace iframeRedirect with router link |

### Deleted Files
| File | Reason |
|------|--------|
| `templates/build_from_current_history.mako` | Replaced by Vue component |

### Controller Cleanup
| File | Changes |
|------|---------|
| `lib/galaxy/webapps/galaxy/controllers/workflow.py` | Remove `build_from_current_history` method |

---

## Test Plan

### Backend Tests

**File**: `lib/galaxy_test/api/test_workflow_extraction.py` (add tests)

> **Review Notes**:
> - Use `ApiTestCase` as base class (Galaxy convention for API tests)
> - Original plan had only 4 tests; expanded to ~15 for proper coverage
> - Tests grouped by: basic functionality, edge cases, authorization, error handling

```python
from galaxy_test.base.api import ApiTestCase
from galaxy_test.base.populators import DatasetPopulator


class TestWorkflowExtractionSummaryAPI(ApiTestCase):
    """Tests for GET /api/histories/{history_id}/extraction_summary endpoint."""

    dataset_populator: DatasetPopulator

    def setUp(self):
        super().setUp()
        self.dataset_populator = DatasetPopulator(self.galaxy_interactor)

    # === Basic Functionality Tests ===

    def test_extraction_summary_empty_history(self):
        """Empty history returns empty jobs list."""
        history_id = self.dataset_populator.new_history()
        response = self._get(f"histories/{history_id}/extraction_summary")
        self._assert_status_code_is(response, 200)
        summary = response.json()
        assert summary["jobs"] == []
        assert summary["history_id"] == history_id
        assert "default_workflow_name" in summary

    def test_extraction_summary_with_uploaded_dataset(self):
        """Uploaded dataset appears as fake job."""
        history_id = self.dataset_populator.new_history()
        self.dataset_populator.new_dataset(history_id, wait=True)

        response = self._get(f"histories/{history_id}/extraction_summary")
        self._assert_status_code_is(response, 200)
        summary = response.json()

        # Should have exactly one fake job for the upload
        assert len(summary["jobs"]) == 1
        job = summary["jobs"][0]
        assert job["is_fake"] is True
        assert job["is_workflow_compatible"] is False
        assert len(job["outputs"]) == 1
        assert job["outputs"][0]["hid"] == 1

    def test_extraction_summary_with_tool_run(self):
        """Tool run appears as workflow-compatible job."""
        history_id = self.dataset_populator.new_history()
        hda = self.dataset_populator.new_dataset(history_id, wait=True)

        # Run cat tool
        self.dataset_populator.run_tool(
            tool_id="cat1",
            inputs={"input1": {"src": "hda", "id": hda["id"]}},
            history_id=history_id,
        )
        self.dataset_populator.wait_for_history(history_id)

        response = self._get(f"histories/{history_id}/extraction_summary")
        self._assert_status_code_is(response, 200)
        summary = response.json()

        # Should have 2 jobs: fake (upload) + cat
        assert len(summary["jobs"]) == 2

        cat_jobs = [j for j in summary["jobs"] if j["tool_id"] and "cat" in j["tool_id"]]
        assert len(cat_jobs) == 1
        assert cat_jobs[0]["is_workflow_compatible"] is True
        assert cat_jobs[0]["is_fake"] is False

    def test_extraction_summary_job_outputs(self):
        """Job outputs include correct metadata."""
        history_id = self.dataset_populator.new_history()
        hda = self.dataset_populator.new_dataset(history_id, content="test", wait=True)

        response = self._get(f"histories/{history_id}/extraction_summary")
        summary = response.json()

        output = summary["jobs"][0]["outputs"][0]
        assert "id" in output
        assert "hid" in output
        assert "name" in output
        assert "state" in output
        assert "deleted" in output
        assert output["history_content_type"] == "dataset"

    # === Edge Cases ===

    def test_extraction_summary_deleted_dataset(self):
        """Deleted dataset still appears but marked as deleted."""
        history_id = self.dataset_populator.new_history()
        hda = self.dataset_populator.new_dataset(history_id, wait=True)

        # Delete the dataset
        self._delete(f"histories/{history_id}/contents/{hda['id']}")

        response = self._get(f"histories/{history_id}/extraction_summary")
        summary = response.json()

        assert len(summary["jobs"]) == 1
        assert summary["jobs"][0]["outputs"][0]["deleted"] is True
        assert summary["jobs"][0]["has_non_deleted_outputs"] is False

    def test_extraction_summary_with_collection(self):
        """Dataset collection appears in extraction summary."""
        history_id = self.dataset_populator.new_history()
        hdca = self.dataset_populator.new_collection(
            history_id,
            collection_type="list",
            element_identifiers=[{"name": "elem1", "src": "new_collection", "collection_type": ""}],
        )
        self.dataset_populator.wait_for_history(history_id)

        response = self._get(f"histories/{history_id}/extraction_summary")
        summary = response.json()

        # Should have job(s) for the collection
        collection_outputs = [
            o for j in summary["jobs"] for o in j["outputs"]
            if o["history_content_type"] == "dataset_collection"
        ]
        assert len(collection_outputs) >= 1

    def test_extraction_summary_tool_version_warning(self):
        """Version mismatch produces warning."""
        # This test would need a tool with version changes
        # Placeholder for when such a test tool is available
        pass

    # === Authorization Tests ===

    def test_extraction_summary_owner_access(self):
        """History owner can access extraction summary."""
        history_id = self.dataset_populator.new_history()
        response = self._get(f"histories/{history_id}/extraction_summary")
        self._assert_status_code_is(response, 200)

    def test_extraction_summary_nonexistent_history(self):
        """Nonexistent history returns 404."""
        response = self._get("histories/nonexistent123/extraction_summary")
        self._assert_status_code_is(response, 404)

    def test_extraction_summary_inaccessible_history(self):
        """Inaccessible history returns 403."""
        # Create history as one user, try to access as another
        history_id = self.dataset_populator.new_history()

        # Create a different user and try to access
        with self._different_user():
            response = self._get(f"histories/{history_id}/extraction_summary")
            self._assert_status_code_is(response, 403)

    # === Response Format Tests ===

    def test_extraction_summary_response_schema(self):
        """Response matches expected schema."""
        history_id = self.dataset_populator.new_history()
        self.dataset_populator.new_dataset(history_id, wait=True)

        response = self._get(f"histories/{history_id}/extraction_summary")
        summary = response.json()

        # Top-level fields
        assert "history_id" in summary
        assert "history_name" in summary
        assert "jobs" in summary
        assert "warnings" in summary
        assert "default_workflow_name" in summary

        # Job fields
        job = summary["jobs"][0]
        required_job_fields = [
            "id", "tool_name", "tool_id", "tool_version",
            "is_workflow_compatible", "is_fake", "disabled_reason",
            "outputs", "version_warning", "has_non_deleted_outputs"
        ]
        for field in required_job_fields:
            assert field in job, f"Missing field: {field}"

    def test_extraction_summary_default_workflow_name(self):
        """Default workflow name includes history name."""
        history_id = self.dataset_populator.new_history(name="My Test History")

        response = self._get(f"histories/{history_id}/extraction_summary")
        summary = response.json()

        assert "My Test History" in summary["default_workflow_name"]
```

### Frontend Tests

**File**: `client/src/components/Workflow/WorkflowExtraction.test.ts` (new file)

> **Review Note**: Frontend tests use Vitest (not Jest). Update imports and mocking patterns accordingly.

```typescript
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { BFormCheckbox, BFormInput } from "bootstrap-vue";
import flushPromises from "flush-promises";
import { describe, it, expect, beforeEach, vi } from "vitest";

import WorkflowExtraction from "./WorkflowExtraction.vue";

// Mock the API (Vitest pattern)
vi.mock("@/api/workflowExtraction", () => ({
    getExtractionSummary: vi.fn(),
    extractWorkflow: vi.fn(),
}));

import { getExtractionSummary, extractWorkflow } from "@/api/workflowExtraction";
import type { Mock } from "vitest";

const mockSummary = {
    history_id: "abc123",
    history_name: "Test History",
    jobs: [
        {
            id: "job1",
            tool_name: "Concatenate",
            tool_id: "cat1",
            tool_version: "1.0",
            is_workflow_compatible: true,
            is_fake: false,
            disabled_reason: null,
            outputs: [
                { id: "out1", hid: 2, name: "Output 1", state: "ok", deleted: false, history_content_type: "dataset" }
            ],
            version_warning: null,
            has_non_deleted_outputs: true,
        },
        {
            id: "fake_1",
            tool_name: "Import from History",
            tool_id: null,
            tool_version: null,
            is_workflow_compatible: false,
            is_fake: true,
            disabled_reason: "Input dataset",
            outputs: [
                { id: "in1", hid: 1, name: "Input 1", state: "ok", deleted: false, history_content_type: "dataset" }
            ],
            version_warning: null,
            has_non_deleted_outputs: true,
        }
    ],
    warnings: [],
    default_workflow_name: "Workflow constructed from history 'Test History'",
};

describe("WorkflowExtraction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getExtractionSummary as Mock).mockResolvedValue(mockSummary);
    });

    it("loads and displays extraction summary", async () => {
        const wrapper = mount(WorkflowExtraction, {
            propsData: { historyId: "abc123" },
            global: {
                plugins: [createTestingPinia()],
            },
        });

        await flushPromises();

        expect(getExtractionSummary).toHaveBeenCalledWith("abc123");
        expect(wrapper.text()).toContain("Concatenate");
        expect(wrapper.text()).toContain("Import from History");
    });

    it("pre-selects workflow-compatible jobs", async () => {
        const wrapper = mount(WorkflowExtraction, {
            propsData: { historyId: "abc123" },
            global: {
                plugins: [createTestingPinia()],
            },
        });

        await flushPromises();

        const checkboxes = wrapper.findAllComponents(BFormCheckbox);
        // The workflow-compatible job should be checked
        const compatibleCheckbox = checkboxes.find(c => c.text().includes("Concatenate"));
        expect(compatibleCheckbox?.props("checked")).toBe(true);
    });

    it("submits workflow extraction", async () => {
        (extractWorkflow as Mock).mockResolvedValue({ id: "wf123", url: "/workflows/wf123" });

        const wrapper = mount(WorkflowExtraction, {
            propsData: { historyId: "abc123" },
            global: {
                plugins: [createTestingPinia()],
            },
        });

        await flushPromises();

        // Click create button
        const createBtn = wrapper.find('[title="Create Workflow"]');
        await createBtn.trigger("click");
        await flushPromises();

        expect(extractWorkflow).toHaveBeenCalledWith(expect.objectContaining({
            from_history_id: "abc123",
            job_ids: ["job1"],
        }));
    });
});
```

### Integration Tests

**File**: `lib/galaxy_test/selenium/test_workflow_extraction.py` (new file)

```python
from .framework import SeleniumTestCase


class TestWorkflowExtractionVue(SeleniumTestCase):
    """Selenium tests for the Vue workflow extraction UI."""

    ensure_registered = True

    def test_extraction_ui_loads(self):
        """Test that the extraction UI loads for a history with content."""
        self.perform_upload(self.get_filename("1.fasta"))
        self.history_panel_wait_for_hid_ok(1)

        # Navigate to extraction
        self.navigate_to_extraction()

        # Should see the extraction form
        self.wait_for_selector(".workflow-extraction")
        self.assert_selector_present("input#workflow-name")

    def test_extraction_creates_workflow(self):
        """Test that workflow extraction creates and opens workflow."""
        self.perform_upload(self.get_filename("1.fasta"))
        self.history_panel_wait_for_hid_ok(1)

        # Run a tool
        self.tool_open("cat1")
        self.tool_set_value("input1", "1.fasta")
        self.tool_form_execute()
        self.history_panel_wait_for_hid_ok(2)

        # Navigate to extraction
        self.navigate_to_extraction()

        # Should have the cat job selected
        self.wait_for_selector("input[type='checkbox']:checked")

        # Create workflow
        self.click_button("Create Workflow")

        # Should navigate to editor
        self.wait_for_selector(".workflow-editor", timeout=30)

    def navigate_to_extraction(self):
        """Navigate to the workflow extraction page."""
        history_id = self.current_history_id()
        self.navigate_to(f"/workflows/extract?history_id={history_id}")
```

---

## Migration Steps

1. **Phase 1**: Backend API
   - Create schema file with Pydantic models
   - Add endpoint to histories API
   - Add service method
   - Write and run backend tests

2. **Phase 2**: Vue Component
   - Create API client
   - Create Vue component
   - Add route
   - Write and run frontend tests

3. **Phase 3**: Integration
   - Update HistoryOptions.vue to use Vue routing
   - Test end-to-end flow
   - Run Selenium tests

4. **Phase 4**: Cleanup
   - Remove Mako template
   - Remove controller method
   - Update any remaining references
   - Final testing pass

---

## Unresolved Questions

1. **Large history performance**: Should API paginate jobs? Current Mako loads all at once. Consider lazy loading for histories with 100+ jobs.
   - *Review suggestion*: Add `limit` and `offset` query params; default to unpaginated for backwards compat.

2. **Input naming UX**: Current Mako has inline text inputs for input names. Should we use a modal instead for cleaner UX?

3. **Accessibility**: Current Mako has known accessibility issues (#17194). Vue component should use proper ARIA labels.
   - *Review suggestion*: Add `aria-label` to all checkboxes, use semantic HTML for table.

4. **Error states**: How to handle partial failures (some jobs extractable, some not)?
   - *Review suggestion*: Continue showing all jobs; disable rows with errors; show inline error messages.

5. **Collection type display**: Should we show collection types (list, paired, etc.) in the UI?

6. **URL back-compat**: Should `/workflow/build_from_current_history` redirect to `/workflows/extract`?
   - *Review suggestion*: Yes, add redirect in legacy controller before removal.

7. **FakeJob type imports**: Need to verify `FakeJob` and `DatasetCollectionCreationJob` are exported from `galaxy.workflow.extract` for `isinstance()` checks.

---

## Review Status

| Review Type | Status | Notes |
|-------------|--------|-------|
| Python Code Structure | ✅ Reviewed | Type annotations added, helper method extracted |
| FastAPI Conventions | ✅ Reviewed | CBV pattern documented, error responses added |
| Business Logic Organization | ✅ Reviewed | Service layer properly separated |
| Dependency Injection | ✅ Reviewed | Uses existing manager pattern |
| Test Coverage | ✅ Reviewed | Expanded from 4 to 15 tests, fixed base class |
| Frontend (Vitest) | ✅ Reviewed | Updated to Vitest patterns |

**Last Updated**: Code review findings incorporated into plan.
