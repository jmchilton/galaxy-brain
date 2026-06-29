---
type: project
title: "History Markdown Use Cases"
tags:
  - project
  - galaxy/client
  - galaxy/api
  - galaxy/workflows
status: draft
created: 2026-06-12
revised: 2026-06-19
revision: 2
ai_generated: true
summary: "Galaxy Notebooks paper use cases: UC1–UC3 worked with extracted workflows; UC4–UC7 newly seeded as interview inputs from an IWC review."
---

This document is tracking our effort to build three really nice use cases for Galaxy Notebooks and extracting workflows from them.

The worktree we're working out of is at /Users/jxc755/projects/worktrees/galaxy/branch/history_pages

Information on MCP Servers within Galaxy can be found here - we generally want to leverage the MCP to perform the interactive analysis in the early steps of this workflow development: "/Users/jxc755/projects/repositories/galaxy-brain/vault/research/PR 21942 - Shared Agent Operations and MCP Server.md"  The MCP for the notebooks is merged from this worktree (no PR yet) /Users/jxc755/projects/worktrees/galaxy/branch/mcp_notebooks.

Information about the underlying Galaxy Notebooks work can be found here:  "/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/history_markdown/HISTORY_MARKDOWN_ARCHITECTURE.md"

Our worktree has https://github.com/galaxyproject/galaxy/pull/22860 merged in which is not in dev yet - which adds workflow extraction to history notebooks - probably don't load that PR unless needed - information about workflow extraction from notebooks in that PR is outlined extensively in "/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/history_markdown/EXTRACT_NOTEBOOK_PR.md".

Uses Cases:
-  Galaxy Notebooks demo: MRSA mobile AMR context across isolates https://github.com/jmchilton/galaxy-brain/issues/12
- Galaxy Notebooks demo: TAL1 peaks to candidate regulated genes  https://github.com/jmchilton/galaxy-brain/issues/13
- Galaxy Notebooks demo: differential ATAC-seq accessibility https://github.com/jmchilton/galaxy-brain/issues/14 

Newly seeded from IWC review (interview inputs only; no notebook/extraction yet):
- UC4 — Galaxy Notebooks demo: HyPhy molecular-selection landscape across Dengue CDS genes https://github.com/jmchilton/galaxy-brain/issues/27
- UC5 — Galaxy Notebooks demo: per-object morphometric cohort analysis of IHC-stained tissue (control vs drug-treated) https://github.com/jmchilton/galaxy-brain/issues/28
- UC6 — Galaxy Notebooks demo: cell-type-resolved pseudobulk differential expression (COVID-19) https://github.com/jmchilton/galaxy-brain/issues/29
- UC7 — Galaxy Notebooks demo: molecular-formula assignment and van Krevelen chemical-space characterization (FT-MS) https://github.com/jmchilton/galaxy-brain/issues/30

## Local environment (for agents working in this worktree)

A local Galaxy is configured on this machine with the use-case tools installed, Docker/BioContainers wired up, and the notebooks MCP enabled. Full story + snags in `SETUP_DEBRIEF.md` (read it before re-doing any of this). Key operational facts:

**Start Galaxy** (port 8080; do NOT use `GALAXY_RUN_WITH_TEST_TOOLS` — it hides installed shed tools):
```bash
cd /Users/jxc755/projects/worktrees/galaxy/branch/history_pages
source .venv/bin/activate
export PYTHONPATH="$(pwd)/lib"
NO_PROXY=* GALAXY_SKIP_CLIENT_BUILD=1 sh run.sh --skip-wheels > /tmp/galaxy_history_pages.log 2>&1
# ready when: curl -s http://localhost:8080/api/version  shows version_major
```
Stop: `.venv/bin/galaxyctl shutdown ; pkill -f 'gunicorn galaxy.webapps' ; pkill -f 'celery --app galaxy.celery'`.
If startup errors with `OutdatedDatabaseError`, run `sh manage_db.sh upgrade` first.

**Admin API key** (needed for the MCP and any API/ephemeris work):
```bash
sqlite3 database/universe.sqlite "select key from api_keys where user_id=1 order by create_time desc limit 1;"
```

**Use the MCP for the interactive analysis steps.** It's registered in Claude Code as `galaxy-notebooks` (tools `mcp__galaxy-notebooks__*`) and mounted at `http://localhost:8080/api/mcp`. Galaxy must be running. Every MCP tool takes an `api_key` argument (per-tool auth — no header); pass the admin key above on each call. Start a session with `connect(api_key)`, then drive analysis with `search_tools` / `get_tool_details` / `run_tool` and build the notebook with `create_page` / `update_page` / `get_page`. Workflow + IWC ops are also exposed (`invoke_workflow`, `import_workflow_from_iwc`, etc.). If the `mcp__galaxy-notebooks__*` tools aren't loaded in a fresh session, the server is registered but Claude Code only loads MCP servers at session start — reload/restart.

**Tools + containers.** The 18 use-case repos (sections *MRSA Mobile AMR*, *TAL1 Candidate Genes*, *Differential ATAC-seq*) are installed; their 24 BioContainer images are pre-pulled and run in Docker (`docker_enabled` job env + `enable_mulled_containers`, `conda_auto_install: false`). To add more tools, edit/add a `*-tools.yml` and run `shed-tools install -g http://localhost:8080 -a <KEY> -t <yaml> --skip-install-resolver-dependencies` (ephemeris is installed isolated via `uv tool`; do NOT pip-install it into Galaxy's `.venv`). Note: Apple Silicon runs amd64 containers under emulation — correct but slow for heavy tools.
</content>
