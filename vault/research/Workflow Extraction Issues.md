---
type: research
subtype: issue-roundup
tags:
  - research/issue-roundup
  - galaxy/workflows
  - galaxy/api
status: draft
created: 2026-02-05
revised: 2026-02-07
revision: 2
ai_generated: true
---

# Workflow Extraction - Known Issues

Summary of open GitHub issues related to workflow extraction limitations in Galaxy.

## UI/UX Modernization

### [#17506](https://github.com/galaxyproject/galaxy/issues/17506) - Convert workflow extraction interface to Vue
**Status**: Open | **Labels**: enhancement, UI-UX, refactoring, backend

The `build_from_current_history` Mako template is the last non-data display Mako in Galaxy. Needs conversion to FastAPI + Vue.

**Discussion points**:
- Option A: Keep selection UI, convert to Vue
- Option B: Extract full workflow automatically, let users edit in workflow editor
- Concern about large histories generating "a lot of crap" without selection
- jmchilton: "extracting workflows from histories is pretty much the core idea of Galaxy"

---

## Copied Dataset Problems

### [#9161](https://github.com/galaxyproject/galaxy/issues/9161) - Extracting workflow from history with copied datasets breaks
**Status**: Open | **Labels**: bug, workflows

When datasets are copied from other histories:
- All connections are broken
- Includes tools from original history that weren't run in target history
- Copied datasets not treated as inputs (should be like uploads)

**Workaround**: Download and re-upload datasets instead of copying.

### [#21336](https://github.com/galaxyproject/galaxy/issues/21336) - Extract workflow from history misses connections
**Status**: Open (Nov 2025)

- Extracted workflow has 5 tools without any inputs
- May be related to job cache usage
- Reported on usegalaxy.eu (v25.0)

### [#13823](https://github.com/galaxyproject/galaxy/issues/13823) - Workflow extraction fails (in specific identified cases)
**Status**: Open | **Labels**: bug

Fails when:
1. Tool has multiple collection outputs (e.g., FastQC)
2. One output collection is copied to new history
3. Another tool runs on that copied collection
4. Extraction produces empty workflow

---

## Collection Extraction Problems

### [#21788](https://github.com/galaxyproject/galaxy/issues/21788) - Workflow extraction with empty collection produces empty workflow
**Status**: Open (Feb 2026)

Follow-up to #18484 (which fixed server crash but not underlying extraction).

- Empty collection filtering causes no jobs to run for downstream tools
- Job-based extraction finds nothing to trace
- Extracted workflow contains 0 steps instead of expected structure

**Test**: `test_empty_collection_map_over_extract_workflow`

### [#21789](https://github.com/galaxyproject/galaxy/issues/21789) - Workflow extraction fails to connect tools for dynamically-created nested collections
**Status**: Open (Feb 2026)

Related to #21722 (ID-based extraction for cross-history). This is same-history HID-reliance problem.

- Tool creates dynamic nested collection (no inputs)
- Downstream tool reduces/operates on it
- Extraction creates spurious input collection step
- Downstream tool misconnected to spurious input instead of upstream tool

**Test**: `test_subcollection_reduction`

---

## Tool-Specific Issues

### [#12590](https://github.com/galaxyproject/galaxy/issues/12590) - Expression tool disconnected when extracting workflow
**Status**: Open | **Labels**: bug, workflows, paper-cut

- Multiple root datasets cause label mix-ups
- "Compose text parameter value" left disconnected
- Input dataset labels assigned incorrectly

### [#14541](https://github.com/galaxyproject/galaxy/issues/14541) - Extract Workflow does not include Extract Dataset Tool
**Status**: Open | **Labels**: bug

- Extract Dataset tool missing from extracted workflows
- Creates duplicate input files instead of preserving tool chain

### [#12236](https://github.com/galaxyproject/galaxy/issues/12236) - Extracting workflows with Unzip Collection for Copied Collections is Broken
**Status**: Open | **Labels**: bug, workflows, dataset-collections

---

## Crashes

### [#14423](https://github.com/galaxyproject/galaxy/issues/14423) - build_from_current_history crashed with key error
**Status**: Open | **Labels**: bug, workflows

```
AttributeError: 'dict' object has no attribute 'hid'
```

- Crash in `extract.py:416` within `__cleanup_param_values`
- Occurs with collections and deferred datasets (DL)
- Expected HDA object, received dict with `{'values': [{'src': 'hda', 'id': '...'}]}`

### [#5189](https://github.com/galaxyproject/galaxy/issues/5189) - workflow extraction failed
**Status**: Open (2018) | **Labels**: bug

### [#6126](https://github.com/galaxyproject/galaxy/issues/6126) - cannot extract workflow with history that contains 'quast' tool
**Status**: Open | **Labels**: bug, workflows

---

## Feature Requests

### [#6714](https://github.com/galaxyproject/galaxy/issues/6714) - Option of applying dataset annotations to extracted workflow
**Status**: Open | **Labels**: feature-request

### [#7003](https://github.com/galaxyproject/galaxy/issues/7003) - Feature: Extract workflow also to include queued jobs
**Status**: Open | **Labels**: feature-request, workflows

Include jobs that are queued but not yet completed in extraction.

### [#17194](https://github.com/galaxyproject/galaxy/issues/17194) - Set a label for checkboxes in workflow extraction view
**Status**: Open | **Labels**: UI-UX, feature-request, paper-cut, accessibility

---

## Related Closed Issues

- **#18484** - Workflow extraction from history with empty collection will fail (Partially fixed - server crash resolved, but extraction still produces 0 steps; see #21788)
- **#11059** - Workflow extraction fails for list:paired inputs copied from another history (Fixed)
- **#19524** - Extract workflow from purged history does not work (Fixed)

---

## Common Patterns

1. **Copied datasets** are a major source of extraction failures
2. **Multi-output tools** with collections cause issues
3. **Expression tools** and parameter-based tools often disconnect
4. **Deferred/DL datasets** can cause crashes
5. **Legacy Mako UI** limits modern UX improvements
6. **Empty collections** cause no jobs to run, breaking job-based extraction
7. **Dynamic collections** with HID-based tracing create spurious inputs

---

## Analysis: Relationship to Fundamental Model Limitations

The current extraction architecture relies on tracing HDAs/HDCAs back to their creating jobs. When this tracing fails (no job exists, job in wrong history, etc.), extraction breaks. See `WORKFLOW_EXTRACTION_LIMITATIONS.md` for detailed evidence.

### Issues Likely Caused by Model Limitations

| Issue | Problem | Why Job-Based Extraction Fails |
|-------|---------|--------------------------------|
| **#9161** | Copied datasets break extraction | `creating_job_associations` points to job in original history, causing wrong HIDs and foreign jobs pulled in |
| **#21336** | Missing connections | Job cache causes associations to point to cached jobs in different history contexts |
| **#13823** | Multi-output copied collection fails | Partial copy of collection outputs breaks job tracing chain |
| **#14541** | Extract Dataset tool missing | Association chain incomplete for `__EXTRACT_DATASET__` tool |
| **#7003** | Queued jobs not included | `JobParameter` records may not be available until job completes |
| **#21788** | Empty collection produces empty workflow | No jobs run for empty collections, nothing to trace |
| **#21789** | Dynamic nested collection misconnected | HID-based tracing fails for dynamically-created collections |

### Issues Possibly Related to Model Limitations

| Issue | Problem | Possible Model Relationship |
|-------|---------|----------------------------|
| **#12590** | Expression tool disconnected | Parameter-based inputs handled differently than dataset inputs in job associations |
| **#12236** | Unzip Collection with copied collections | Variant of copied collection problem |
| **#14423** | Key error crash with deferred datasets | Object reconstruction failure when tracing job parameters |

### Issues Unrelated to Model Limitations

| Issue | Problem | Actual Cause |
|-------|---------|--------------|
| **#17506** | Convert to Vue | UI framework modernization |
| **#17194** | Checkbox labels | UI accessibility |
| **#6714** | Dataset annotations | Metadata feature request |
| **#5189** | Extraction failed (2018) | Insufficient information |
| **#6126** | QUAST tool fails | Tool-specific compatibility |

---

## Key Insight: The Copied Dataset Problem

The **copied dataset problem** is the most prevalent root cause, affecting 3+ open issues (#9161, #13823, #12236, possibly #21336).

**Why it happens**:
1. User copies dataset/collection from History A to History B
2. The copied item's `creating_job_associations` still points to the job in History A
3. When extracting from History B:
   - Extraction follows the association to History A's job
   - That job's inputs/outputs reference HIDs in History A
   - HID mismatches cause broken connections
   - Jobs from History A incorrectly appear in extracted workflow

**Current workaround**: Download and re-upload datasets instead of copying.

---

## Proposed Solution: ToolRequest-Based Extraction

The `ToolRequest` model (already exists in codebase) would fix all "Likely" issues because:

1. **Created at request time** - before job cache lookup, before jobs queue
2. **Captures current history context** - not dependent on where data originated
3. **Stores original request dict** - parameters available regardless of job state
4. **Links to output collections** - via `ToolRequestImplicitCollectionAssociation`

Existing TODO comments confirm this is the intended solution:
- `extract.py:323`: "TODO track this via tool request model"
- `test_workflow_extraction.py:235`: "TODO: after adding request models we should be able to recover implicit collection job requests" (relates to #21788)
- `test_workflow_extraction.py:305`: "TODO: refactor workflow extraction to not rely on HID" (relates to #21789)
