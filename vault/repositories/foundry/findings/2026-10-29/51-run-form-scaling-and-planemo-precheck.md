# A 385-step workflow's run form takes minutes and ~6-11 GB in one Galaxy worker, and planemo master builds it (with retries) only to read replacement parameters

- Target: galaxyproject/planemo (master pre-check from PR #1755 / issue #1750; high confidence, cheap fix) and galaxyproject/galaxy (`_workflow_to_dict_run` / invocation cost; cause of the memory not identified). Foundry tracking needed: yes, label `upstream/planemo`; a run-environment note for large builds.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-viralrecon-v0-2026-10-31, phase 10 attempts 2, 5, 6, 7, 8 and phase 11 (static debug, `workflow-debug-report.md` §2-6), planemo master 2a815808, Galaxy release_26.1, 2026-11-01. Ledger `planemo-replacement-param-precheck-builds-full-run-form` (major). Attempts 2 and 8 ended when host memory fell below the agent harness's guard (no kernel OOM).
- Existing issues/PRs: planemo #1750 (closed) / PR #1755 (merged 2026-10-29) introduced the check. Galaxy: none current (#3893, 2017, run-form load time, closed).

## Symptom
Illumina workflow: 328 format2 steps (385 native), 29 embedded user tools, one text hub with 209 output connections. `GET /api/workflows/<id>/download?style=run&history_id=...` exceeded gunicorn's 300 s timeout twice (WORKER TIMEOUT → SIGKILL); bioblend retried, the third try returned in ~80 s; the invocation POST then grew the worker by ~5.5 GB. Attempt 5: style=run 134 s, worker RSS 11.5 GB. 0 invocations in attempt 2. The 139-step Nanopore workflow was fine.

## Root cause
**planemo (high):** before every workflow invocation, `_replacement_params_for_invocation` (`planemo/galaxy/activity.py:128-145`, called at `:357`) fetches the full run form only to read each step's `replacement_parameters`. Any exception is caught and the invocation proceeds, but bioblend's own retry loop re-sends the GET after each worker kill, so the server built the form three times. planemo already has the workflow source locally (format2 or native) and could find undeclared `${...}` names there, or ask Galaxy for a cheaper representation.
**Galaxy (cost confirmed, memory cause unknown):** `_workflow_to_dict_run` (`lib/galaxy/managers/workflows.py:1149-1260`) runs `inject_all` + `compute_runtime_state` for every step, then for every top-level tool step `toolbox.get_tool(...)` and `tool.to_json(..., USE_HISTORY, history)`. Uncached per call: `Tool.help_html` re-renders RST with docutils (`tools/__init__.py:2113-2122`, via `render_help` in `to_json`); `dynamic_tool_to_tool` (`:686-715`) rebuilds a `Tool` from the stored YAML on every lookup, and module init, runtime state and the run form each look up again (~3 builds × 29 user tools per request). These explain CPU minutes. Nothing read statically explains ~6 GB within 25 s of worker boot; it needs a profile (py-spy dump, memray/tracemalloc) of one request. Candidates the debug report lists: per-step copies of a 104 MB CSV's metadata (`freyja_barcodes`, thousands of `column_names`), joined-load row sets (~50 MB, ruled out as dominant).

## Evidence
`workflow-debug-report.md` §2 (memory timeline, `planemo.log` line refs), §4 (code path); attempt summaries in `run-summary.md`. Code: planemo master 2a815808 `activity.py`; `git show release_26.1:lib/galaxy/managers/workflows.py`.
- Attempt 9 (Illumina `test` alone, quiet host): the run-form GET returned, then the invocation POST itself hit the 300 s worker timeout (1.58 GB free at worst; 161 sqlite "database is locked" errors meanwhile). So the invocation request is also too heavy here, not only the pre-check; sqlite contention in planemo's managed Galaxy may contribute.

## Proposed fix
1. planemo: compute informal replacement parameters from the local workflow document (or from `style=editor`/`instance` download without a history), never `style=run`; make the pre-check a single attempt (no bioblend retry) and add a flag to skip it.
2. Galaxy: profile `download?style=run` and invocation submission on a large workflow before filing anything about memory. Cheap CPU wins regardless: memoize `help_html` (pure in `raw_help`), cache `dynamic_tool_to_tool` per (id, update_time) at least per request.
3. Foundry/harness: large builds (> ~250 steps) run one workflow per planemo Galaxy with ≥ 12 GB free; record worker RSS. Do not split the workflow just to fit (coordinator rule).

## Draft issue
**planemo — Title:** Replacement-parameter pre-check fetches the full run form (`style=run`) and is retried by bioblend; very slow on large workflows

Since #1755, `_replacement_params_for_invocation` (`galaxy/activity.py`) GETs `/api/workflows/<id>/download?style=run&history_id=...` before every invocation to read `replacement_parameters`. On Galaxy 26.1 that builds the whole run form (`tool.to_json` per tool step). For a 385-step workflow it exceeded gunicorn's 300 s timeout twice; bioblend retried after each worker SIGKILL, so the optional check ran three times (~6-9 GB worker RSS each) before the real invocation. Suggest deriving undeclared `${...}` names from the local workflow source (planemo already parses it), or using a lighter download without a history; make it single-attempt and skippable (`--no_check_replacement_params`).

**Foundry tracking comment** (label `upstream/planemo`):
> Tracking galaxyproject/planemo#NNNN: "Replacement-parameter pre-check fetches the full run form and is retried by bioblend". On the viralrecon wb2g build (385 native steps) it cost 2 of 8 planemo attempts on a 14 GB host. Until fixed, large builds need one workflow per planemo Galaxy and ≥ 12 GB free memory.
