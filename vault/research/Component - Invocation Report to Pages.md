---
type: research
subtype: component
tags:
  - research/component
  - galaxy/workflows
  - galaxy/client
  - galaxy/api
status: draft
created: 2026-02-11
revised: 2026-02-11
revision: 1
ai_generated: true
component: Invocation Report to Pages
github_repo: galaxyproject/galaxy
---
# Workflow Invocation Reports to Pages: Architecture Overview

## Summary

Galaxy allows users to convert workflow invocation reports into Pages. This document traces the full pipeline from user action through markdown transformation to Page storage, with particular focus on the ID encoding/decoding lifecycle.

## User Entry Point

A user viewing an invocation report clicks "Edit" (`client/src/components/Workflow/InvocationReport.vue:66`), which navigates to:

```
/pages/create?invocation_id={encoded_id}
```

The router (`client/src/entry/analysis/router.js:522-527`) passes `invocation_id` as a prop to `PageForm`.

## Frontend Flow

**`client/src/components/PageDisplay/PageForm.vue:48-137`**

When `invocationId` is provided, PageForm fetches the invocation report:

```
GET /api/invocations/{invocation_id}/report
```

The response includes an `invocation_markdown` field containing Galaxy-flavored markdown with **encoded** IDs. The form pre-fills title, slug, and content. On submit, it POSTs to `/api/pages` with the `invocation_markdown` as `content`.

## Backend Report Generation

The report generation pipeline involves three sequential transformations of the markdown.

### Step 1: Populate Invocation Context

**`lib/galaxy/managers/markdown_util.py:997-1048`** — `populate_invocation_markdown()`

Converts abstract workflow markdown into invocation-specific markdown by injecting the invocation ID:

- `output=name` → `invocation_id={id}, output=name`
- `input=name` → `invocation_id={id}, input=name`
- `step=name` → `invocation_id={id}, step=name`

ID format at this stage: **decoded numeric** (from `invocation.id`).

### Step 2: Resolve Abstract References

**`lib/galaxy/managers/markdown_util.py:1051-1186`** — `resolve_invocation_markdown()`

Replaces abstract workflow references with actual executed object IDs:

- `output=name` → `history_dataset_id={actual_dataset_id}`
- `input=name` → `history_dataset_id={actual_input_id}`
- `step=name` → `job_id={actual_job_id}`
- `invocation_outputs(...)` → expanded into individual `history_dataset_display` directives

ID format at this stage: **decoded numeric** (from resolved DB objects).

### Step 3: Encode for Export

**`lib/galaxy/managers/markdown_util.py:651-669`** — `ready_galaxy_markdown_for_export()`

Converts decoded numeric IDs to encoded IDs for external consumption. Also populates extra rendering metadata (dataset names, types, peek data).

ID format at this stage: **encoded** (via `trans.security.encode_id()`).

### Call Chain

```
API: GET /api/invocations/{id}/report
  → services/invocations.py:161  show_invocation_report()
    → managers/workflows.py:430  get_invocation_report()
      → workflow/reports/__init__.py:7  generate_report()
        → workflow/reports/generators/__init__.py:38  generate_report_json()
          → _generate_internal_markdown()        [decoded IDs]
            → populate_invocation_markdown()      [decoded IDs]
            → resolve_invocation_markdown()       [decoded IDs]
          → ready_galaxy_markdown_for_export()    [encoded IDs]
        → returns { invocation_markdown: "..." }  [encoded IDs]
```

## Page Creation

### Frontend Submission

PageForm POSTs to `/api/pages` with:
```json
{
    "title": "...",
    "slug": "...",
    "content_format": "markdown",
    "content": "<invocation_markdown with encoded IDs>"
}
```

### Backend Page Creation

**`lib/galaxy/managers/pages.py:251-289`** — `create_page()`

Two code paths exist:

1. **With `invocation_id` in payload** (server-side generation): Fetches the invocation report directly, extracts the markdown content. This path exists but the current frontend flow uses the client-side approach instead (fetches report first, sends content).

2. **With `content` in payload** (client-side content): Uses the content as-is, passes through `rewrite_content_for_import()`.

Both paths converge at:

**`lib/galaxy/managers/pages.py:348-366`** — `rewrite_content_for_import()`

For markdown content, calls `ready_galaxy_markdown_for_import()` which converts **encoded IDs → decoded numeric IDs** for database storage.

**`lib/galaxy/managers/markdown_util.py:112-139`** — `ready_galaxy_markdown_for_import()`

Pattern: `ENCODED_ID_PATTERN = r"(history_dataset_id|history_dataset_collection_id|...)=([a-z0-9]+)"`

Applies `trans.security.decode_id()` to each matched ID.

## Page Display

When a Page is displayed, `rewrite_content_for_export()` (`pages.py:368-385`) calls `ready_galaxy_markdown_for_export()` to:

- Re-encode IDs for external links
- Populate rendering metadata (dataset names, types, peek content)
- Expand embedded directives

## ID Format Lifecycle

| Stage | Location | ID Format | Example |
|-------|----------|-----------|---------|
| Invocation in DB | `model.WorkflowInvocation` | Decoded numeric | `id=12345` |
| populate_invocation_markdown | markdown_util.py:1034 | Decoded | `invocation_id=12345` |
| resolve_invocation_markdown | markdown_util.py:1179 | Decoded | `history_dataset_id=5678` |
| ready_galaxy_markdown_for_export | markdown_util.py:668 | Encoded | `history_dataset_id=abc456` |
| API response to frontend | workflows.py:1559 | Encoded | `invocation_markdown: "..."` |
| Frontend POST to /api/pages | PageForm.vue:106 | Encoded | Payload content |
| ready_galaxy_markdown_for_import | markdown_util.py:124 | Decoded | `history_dataset_id=5678` |
| Stored in PageRevision.content | pages.py:282 | Decoded | DB storage |
| Page display (export) | pages.py:377 | Encoded | `ready_galaxy_markdown_for_export()` |

The full cycle is: **decoded → encoded → (frontend) → encoded → decoded → (stored) → encoded → (displayed)**.

## Key Regex Patterns

**`lib/galaxy/managers/markdown_util.py:68-92`**

```python
UNENCODED_ID_PATTERN = re.compile(
    r"(history_id|workflow_id|history_dataset_id|history_dataset_collection_id|"
    r"job_id|implicit_collection_jobs_id|invocation_id)=([\d]+)"
)

ENCODED_ID_PATTERN = re.compile(
    r"(history_id|workflow_id|history_dataset_id|history_dataset_collection_id|"
    r"job_id|implicit_collection_jobs_id|invocation_id)=([a-z0-9]+)"
)
```

These patterns drive the import/export transformations and define which directive arguments are treated as IDs.

## File Reference

| Purpose | File | Lines |
|---------|------|-------|
| Frontend trigger | `client/src/components/Workflow/InvocationReport.vue` | 49-71 |
| Frontend route | `client/src/entry/analysis/router.js` | 522-527 |
| Frontend form | `client/src/components/PageDisplay/PageForm.vue` | 48-137 |
| Report API endpoint | `lib/galaxy/webapps/galaxy/api/workflows.py` | 1554-1577 |
| Report service | `lib/galaxy/webapps/galaxy/services/invocations.py` | 161-163 |
| Report generation | `lib/galaxy/managers/workflows.py` | 430-449 |
| Report plugin | `lib/galaxy/workflow/reports/__init__.py` | 7-18 |
| Markdown generator | `lib/galaxy/workflow/reports/generators/__init__.py` | 38-78 |
| Populate invocation | `lib/galaxy/managers/markdown_util.py` | 997-1048 |
| Resolve invocation | `lib/galaxy/managers/markdown_util.py` | 1051-1186 |
| Export markdown | `lib/galaxy/managers/markdown_util.py` | 651-669 |
| Import markdown | `lib/galaxy/managers/markdown_util.py` | 112-139 |
| Page creation | `lib/galaxy/managers/pages.py` | 251-289 |
| Content import | `lib/galaxy/managers/pages.py` | 348-366 |
| Content export | `lib/galaxy/managers/pages.py` | 368-385 |
| ID patterns | `lib/galaxy/managers/markdown_util.py` | 68-92 |
