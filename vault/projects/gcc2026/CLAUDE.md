# GCC2026 Abstract & Talk Prep

## Goal

Preparing a conference presentation for GCC2026. The talk argues that Galaxy's existing reproducibility infrastructure (workflows, versioned artifacts, rich metadata) is exactly what's needed to keep agent-assisted science reproducible -- and demonstrates this through History Notebooks, a new Galaxy feature.

The abstract centers on: "Achieving Reproducibility in the Age of Agents." The talk demonstrates this through two features: History Notebooks and Workflow State Validation.

## Files

- `ABSTRACT.md` -- Conference abstract under construction. The final deliverable.
- `HISTORY_NOTEBOOKS_EXECUTIVE_SUMMARY.md` -- 1-page executive summary covering the History Notebooks feature: what was built, what it means, and how it connects to the abstract's thesis. Covers three usage modes (human solo, human+agent in UI, external agent via API).
- `WORKFLOW_STATE_EXECUTIVE_SUMMARY.md` -- 1-page executive summary covering the Workflow State Validation work: per-tool parameter validation against ToolShed schemas, format conversion, CLI toolkit. Includes fact-checked competitive analysis (Nextflow, Snakemake, WDL).
- `HISTORY NOTEBOOK DISCUSSION.md` -- Slack conversation between jmchilton and nekrut (boss) + Marius van den Beek discussing the feature vision, naming (Notebooks vs Pages vs Reports), and excitement about testing.
- `PATHS.md` -- Empty/stub.

## Key References Outside This Directory

### History Notebooks
- `vault/projects/history_markdown/HISTORY_MARKDOWN_ARCHITECTURE.md` -- Detailed architecture doc for the History Notebooks implementation.
- galaxyproject/galaxy#21475 -- The GitHub issue with the original proposal and full implementation plan.
- Implementation branch: `~/projects/worktrees/galaxy/branch/history_pages`

### Workflow State Validation
- `vault/projects/workflow_state/CURRENT_STATE.md` -- Detailed implementation state (modules, CLI tools, test coverage, deliverable status).
- `vault/projects/workflow_state/PROBLEM_AND_GOAL.md` -- Problem statement, goals, and deliverable definitions.
- `vault/projects/workflow_state/VSCODE_EXTENSION_PLAN.md` -- VS Code extension plan (IDE integration via JSON Schema).
- Implementation branch: `wf_tool_state`

## Naming

The feature is called "History Notebooks" in user-facing language. On the backend, these are Galaxy Pages with a `history_id` FK. Standalone pages are branded "Reports" in the UI. All share one model, one editor, one API. The naming was consolidated into a single file for easy bikeshedding (per the Slack discussion).
