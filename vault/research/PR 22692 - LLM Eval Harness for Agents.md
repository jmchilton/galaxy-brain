---
type: research
subtype: pr
tags:
  - research/pr
  - galaxy/api
  - galaxy/testing
  - galaxy/agents
github_pr: 22692
github_repo: galaxyproject/galaxy
status: draft
created: 2026-06-03
revised: 2026-06-03
revision: 1
ai_generated: true
summary: "Real-LLM eval harness scores Galaxy agents across models with baseline diffing plus router file-source awareness via fast-path and MCP tools"
sources:
  - "https://github.com/galaxyproject/galaxy/pull/22692"
related_notes:
  - "[[PR 21434 - AI Agent Framework and ChatGXY]]"
  - "[[PR 21942 - Shared Agent Operations and MCP Server]]"
  - "[[PR 22070 - Static YAML Agent Backend for Deterministic Testing]]"
  - "[[PR 21692 - Standardize Agent API Schemas]]"
  - "[[Component - Agents Backend]]"
  - "[[Component - Agents UX]]"
---

# PR #22692 Research: LLM Eval Harness for Agents

## PR Overview

| Field | Value |
|-------|-------|
| Author | dannon |
| State | MERGED |
| Created | 2026-05-14 |
| Merged | 2026-05-21 |
| Merge SHA | `1f1eb3eaf1` |
| Verified against `origin/dev` | `3eba535f3b` |
| Labels | kind/enhancement, area/testing, area/API |
| Branch | `dannon/agent-evals-harness` |

Builds directly on [[PR 21942 - Shared Agent Operations and MCP Server]] (extends `AgentOperationsManager` + the in-process MCP server) and the agent fleet from [[PR 21434 - AI Agent Framework and ChatGXY]]. Complements [[PR 22070 - Static YAML Agent Backend for Deterministic Testing]] — static backend tests the plumbing deterministically; this harness measures real-LLM behavior. Explicitly does **not** supersede tcollins2011's pytest+HTML-dashboard eval work in `dannon/galaxy#64`; rubrics and pricing here are adapted from it.

## Summary

Adds an on-demand (not-CI) real-LLM evaluation harness under `test/evals/` that runs curated datasets against the agents in `lib/galaxy/agents/`, scores each model with deterministic + LLM-as-judge evaluators, and emits a markdown comparison table with baseline diffing. Built on `pydantic-evals`; ships two runners sharing dataset/evaluator/report code — a fast mocked-`trans` CLI (`run_evals.py`) and a live-Galaxy pytest runner (`test/integration/test_live_evals.py`). The harness is deliberately excluded from CI: real LLMs are slow, flaky, and cost money — it's a tool for picking default models and iterating on prompts with measurement instead of vibes. The PR also lands an agent-fleet change that fell out of the GCC2026 demo work: `list_file_source_templates` / `list_user_file_sources` on `AgentOperationsManager`, exposed both as router fast-path tools and as MCP tools, plus a router-prompt section teaching the file-source configure-then-export flow — so "How do I upload this to Omero?" stops being refused as out-of-scope.

## Architecture

### Eval harness layout — `test/evals/` (all NEW, 19 tracked files)

Run as `python -m evals.run_evals` **from the `test/` directory** (`cd test` first) — the package imports as `evals` relative to that CWD; from repo root it is physically `test/evals/`. See Cross-checks. Layout per `README.md`:

- `__init__.py` — package docstring.
- `datasets/` — one module per dataset; `__init__.py` re-exports seven `*_dataset()` builders.
- `evaluators.py` — custom scorers.
- `judge.py` — builds an `OpenAIChatModel` for LLM-as-judge.
- `specs.py` — `SPECS` registry mapping dataset name → `build_*` (task + evaluators).
- `tasks.py` — wraps agents as pydantic-evals task callables.
- `run_evals.py` — the CLI (+722 lines, largest file in the PR).
- `pricing.py` — per-million-token cost table (adapted from PR #64 `eval_utils.py`).
- `models.yaml.sample` — sample model config; real `models.yaml` is gitignored.
- `results/.gitkeep` — placeholder; `results/*` gitignored.
- `seed_staining_quantification_history.py` — seeds a demo history for the live runner.

### `run_evals.py` CLI

- Module docstring (lines 1–18) documents invocation `cd test; python -m evals.run_evals`. Reads `evals/models.yaml`, falling back to `evals/models.yaml.sample`.
- Relative package imports (lines 44–47): `from .judge import build_judge_model`, `from .pricing import model_cost`, `from .specs import SPECS`, `from .tasks import make_deps`.
- `parse_args()` (line 517) flags: `--models`, `--datasets` (default = all `SPECS.keys()`), `--judge-model` (default `gpt-oss-120b`), `--model-config`, `--include-galaxy-required`, `--only`, `--max-concurrency` (default 4), `--repeat` (default 1), `--results-dir` (default `evals/results`), `--no-write`, `--baseline`.
- `run_eval_suite()` (line 581) is pure runtime — no argparse / file IO — so both the CLI and the live pytest runner call it with different `deps_factory` callables.
- Pass thresholds: `1.0` for deterministic scorers, `0.7` for `LLMJudge` (lines 224, 292, 345).
- Output path `results_dir / f"{stamp}-{slug}-{_git_sha()}.md"` (line 657); `_git_sha()` at line 75; report footer stamps the SHA (line 402). Baselines are saved outside the repo with the SHA in the filename, so any baseline pairs back to the commit it was generated from. Writes both `.md` and a JSON sidecar.

### Datasets — `test/evals/datasets/`

Seven datasets, all registered in `SPECS` (specs.py lines 169–177):

- **routing.py** — `(query, expected handoff target)` cases for `QueryRouterAgent`; deterministic `HandoffMatch`. Docstring records it was seeded from the `TEST_QUERIES` formerly in `test_agents.py` (the `TestAgentConsistencyLiveLLM` class — see Tests).
- **error_analysis.py** — prose failure descriptions for `ErrorAnalysisAgent`; `MustMention` keyword check + per-case `LLMJudge`.
- **tool_recommendation.py** — "what tool for X?" for `ToolRecommendationAgent`; `MustMentionAny` + optional `LLMJudge`. Runs without a live toolbox, so it measures model prior knowledge, not grounded search.
- **router_tool_use.py** — inventory/availability queries that should trigger router fast-path tool calls; deterministic `ToolCallMatch` (OR-semantics over `expected_tool_calls`). First case `neoform_what_tools_installed` is the explicit regression target for #21661 (router answered "what tools are installed?" with an essay instead of calling `search_tools`).
- **bioinformatics_workflows.py** — analysis-shaped questions, `LLMJudge`-only; rubrics adapted from PR #64 `test_bioinformatics_workflows.py`.
- **orchestrator_planning.py** — compound queries; `OrchestratorPlanIncludes` against `agents_used`. Adapted from PR #64 `test_agent_routing.py`.
- **staining_quantification.py** — end-to-end bioimaging use case (brightfield RGB, color deconvolution, per-ROI quant, Omero export); per-case `LLMJudge` rubrics. This is the GCC2026 "Live26" demo content the body alludes to; some cases carry `requires_galaxy=True` and are off by default. Contains the `omero_upload_guidance` case (line 90), also present in routing.py (line 201).

### Evaluators — `evaluators.py`

Custom `pydantic_evals` `Evaluator` subclasses: `HandoffMatch` (line 20, exact route match), `MustMention` (line 28, all keywords), `MustMentionAny` (line 44, any keyword), `OrchestratorPlanIncludes` (line 60, requires `agent_type == 'orchestrator'` AND a non-empty `agents_used ∩ expected_agents_any`), `ToolCallMatch` (line 83, any expected tool name appears in `output['tool_calls']`). `LLMJudge` is the pydantic-evals built-in, used directly in dataset modules.

### Judge / pricing / tasks

- `judge.py` — `build_judge_model(model_name, base_url, api_key) -> OpenAIChatModel` (line 11) wraps an `OpenAIProvider` so the judge calls the same proxy as the agents under test.
- `pricing.py` — `_PRICING` dict (input/output $/M tokens) across Anthropic/OpenAI/Google/local/SambaNova; `model_cost()` returns cost, unknown/local → $0.
- `tasks.py` — `make_deps()` (line 66) builds `GalaxyAgentDependencies` from a `MagicMock` trans/config. It special-cases the `FileSourceInstancesManager` (`_app_getitem`, line 109) so the new file-source fast-path tools don't crash under mocked deps — returns empty summaries / index. `make_live_deps()` (line 123) builds deps from a real `trans` for the integration runner. Task factories wrap each agent: `make_router_task`, `make_router_content_task`, `make_error_analysis_task`, `make_tool_recommendation_task`, `make_orchestrator_plan_task` (reads `orchestrator._get_agent_plan`), `make_router_inspect_task` (bypasses `process()`, reads raw tool calls via `_extract_tool_calls`).

### Agent-operations file-source methods — `lib/galaxy/agents/operations.py`

`class AgentOperationsManager` (line 58):

- `list_file_source_templates(self) -> dict[str, Any]` — **line 1035**. Reads `self.file_source_instances_manager.summaries`, dumps each non-hidden template (`model_dump(mode="json")`), returns `{"templates": [...], "count": n}`.
- `list_user_file_sources(self) -> dict[str, Any]` — **line 1050**. Raises `ValueError("User must be authenticated")` if no `trans.user`; else `file_source_instances_manager.index(self.trans)`, returns `{"file_sources": [...], "count": n}`.
- Backing property `file_source_instances_manager` (line 168) lazily imports `galaxy.managers.file_source_instances.FileSourceInstancesManager` and resolves via `self.app[...]`.

### Router fast-path additions — `lib/galaxy/agents/router.py`

Two new `@agent.tool`s registered in `_register_fast_path_tools()` (line 89), each running the ops method off-thread via `anyio.to_thread.run_sync`: `list_file_source_templates` (line 198) and `list_user_file_sources` (line 212). HEAD has 10 `@agent.tool` decorators (8 pre-existing browsing tools + these 2).

### Router prompt — `lib/galaxy/agents/prompts/router.md`

- Scope bullet (line 14) for remote data repositories Galaxy integrates as file sources (Omero, Dropbox, S3, Zenodo, Invenio, Google Drive…).
- Fast-path tool entries for the two new tools (lines 56–57).
- New "Remote data repositories (file sources)" subsection (lines 59–67) explaining the plugin-template-then-instance model and a 3-step configure-then-export flow.
- Two "Important Distinctions" lines (159–160) routing Omero/Dropbox/S3 upload questions to direct answers via the new tools.

### MCP tool exposure — `lib/galaxy/webapps/galaxy/api/mcp.py`

`@mcp.tool() def list_file_source_templates(...)` (line 1031) and `@mcp.tool() def list_user_file_sources(...)` (line 1043), each wrapping the corresponding ops-manager method under `_mcp_error_handler`.

### `.gitignore`

Adds `test/evals/models.yaml` and `test/evals/results/*` with a `!test/evals/results/.gitkeep` negation.

## Tests

### Added (present at HEAD)

- **`test/unit/app/managers/test_AgentOperationsManager.py`** (+65) — three net-new file-source tests: `test_list_file_source_templates_filters_hidden` (line 320, hidden templates excluded), `test_list_user_file_sources` (line 352, index→dump→count→fields), `test_list_user_file_sources_requires_user` (line 378, `ValueError` when no user).
- **`test/integration/test_live_evals.py`** (+179) — live-Galaxy runner wrapping `evals.run_evals`; seeds a staining history, runs `requires_galaxy=True` cases, writes a report. Gated by `GALAXY_TEST_ENABLE_LIVE_LLM` / `GALAXY_TEST_LIVE_EVALS`.
- The seven eval datasets are themselves the bulk of the new behavioral surface but run on-demand, **not** in CI.

### Modified — `test/unit/app/test_agents.py` (+11 / −78)

The 78 deletions removed two groups: (1) the model-capability-table tests (`test_supports_structured_output_capability_table_match` and siblings, plus their `_capability_for_model` / `_load_model_capabilities` imports), and (2) the entire `TestAgentConsistencyLiveLLM` class — the hardcoded query→route consistency tests the new `routing` dataset was meant to replace. The class docstring was rewritten from "three classes" to "two classes" and pointed readers at `evals/`.

**The deletions did not durably stick** (see Cross-checks): both groups are present again at the verified SHA.

## Cross-checks vs PR body

- **Body says `evals/` + `python -m evals.run_evals`; files live at `test/evals/`.** NOT a contradiction. The README (lines 98–107) and `run_evals.py` docstring (lines 3–7) both instruct `cd test` first, after which the package imports as `evals` and the relative imports resolve; defaults `evals/models.yaml` and `evals/results` are relative to `test/`. ⚠️ Flag for readers: you must `cd test` — running from repo root fails.
- **`list_file_source_templates` / `list_user_file_sources` on `AgentOperationsManager`?** YES — operations.py lines 1035 and 1050. ✓
- **Exposed as router fast-path tools?** YES — router.py lines 198 and 212. ✓
- **Exposed as MCP tools?** YES — mcp.py lines 1031 and 1043. ✓
- **Router prompt teaches configure-then-export flow?** YES — router.md lines 59–67. ✓
- **#21661 regression case present in `router_tool_use.py`?** YES — `neoform_what_tools_installed`, `expected_tool_calls=["search_tools","get_server_info"]`, docstring cites the issue comment. ✓
- **"live26_demo" dataset / "live26_omero_upload_guidance" case.** ⚠️ FALSE as named: there is **no** `live26_demo` dataset and **no** `live26_omero_upload_guidance` case in the shipped code. The content shipped as the `staining_quantification` dataset with a case named `omero_upload_guidance` (no `live26_` prefix). The body's "live26" naming is descriptive/aspirational, not a shipped identifier.
- **"red until IWC reintroduction lands."** The body said several demo cases stay red until the IWC and GTN branches merge. The IWC ops have since landed in `operations.py` / `mcp.py` (see Changes since merge), but the entire `test/evals/` tree is untouched since the merge — so no case was re-graded in-repo. Whether the red cases ever went green is not recorded here.
- **Provenance to PR #64** — confirmed in file headers (`pricing.py`, `bioinformatics_workflows.py`, `orchestrator_planning.py`). ✓
- **"86 passed, 4 skipped locally"** — not independently runnable here (needs a live LLM); not contradicted.

## Unresolved questions

- The PR deleted the capability-table tests and `TestAgentConsistencyLiveLLM`, but both are back at HEAD — capability tests were already restored in the merge commit itself (merge with dev kept them), and `TestAgentConsistencyLiveLLM` was re-added by post-merge commit `948dd067` ("producer/critic reflection loops"). Was the re-addition intentional, or an accidental merge revert? The `routing` dataset and the class it was meant to replace now coexist.
- Harness is explicitly not-CI; nothing imports `evals` in CI, so `SPECS` / `tasks.py` / dataset modules can drift out of sync with the agents undetected. Should there be a CI import-smoke test?
- `tasks.make_deps` dispatches the `FileSourceInstancesManager` mock by `__name__` string match — brittle if the manager class is renamed.
- The body promised demo cases go green once IWC/GTN land; IWC landed but the eval tree is untouched. Where, if anywhere, were the red cases verified green?
- `tool_recommendation` runs without a live toolbox, so it scores model prior knowledge rather than grounded search — is that the intended signal, or a coverage gap vs production behavior?

## Changes since merge

Per-file `git log 1f1eb3e..origin/dev`:

- **`test/evals/` (entire tree)** — UNTOUCHED since merge. The harness as shipped == HEAD.
- **`lib/galaxy/agents/operations.py`** — substantial IWC follow-up, none touching the file-source methods: `ec647adb` (`search_iwc_workflows`), `499a5c14` (`get_iwc_workflow_details`), `857912f1` (`recommend_iwc_workflows`), `a93fcfa8` (`import_workflow_from_iwc` op+MCP), `a59bbefa`, `8740c102`, `1cd60568`, `56e09000`, `ded3e326`, `90c8911a`. The "IWC reintroduction" branch the body said was still pending has since landed.
- **`lib/galaxy/webapps/galaxy/api/mcp.py`** — same IWC follow-ups; file-source MCP tools unchanged.
- **`lib/galaxy/agents/router.py`** — `d4859b8d` (propagate ChatGXY entity context through router); fast-path file-source tools unchanged.
- **`lib/galaxy/agents/prompts/router.md`** — `1d922c22` (@mention support for datasets/histories).
- **`test/unit/app/test_agents.py`** — `948dd067` re-added `TestAgentConsistencyLiveLLM` (now line 1730); the capability-table tests were already restored at merge time.
- `test/integration/test_live_evals.py`, `test/unit/app/managers/test_AgentOperationsManager.py`, and the dataset modules — no follow-up commits.

### File path migration

No touched file has been renamed/removed/relocated since the merge. The only path nuance is the `evals/` vs `test/evals/` working-directory convention (above), not an actual move.

## Related

- [[PR 21942 - Shared Agent Operations and MCP Server]] — introduced `AgentOperationsManager` + the in-process MCP server; this PR adds the two file-source methods and MCP tools directly on top.
- [[PR 21434 - AI Agent Framework and ChatGXY]] — defines the pydantic-ai multi-agent fleet (router, error analysis, tool recommendation, orchestrator) that the harness evaluates.
- [[PR 22070 - Static YAML Agent Backend for Deterministic Testing]] — the deterministic counterpart; static backend tests plumbing in CI, this harness measures real-LLM quality out of CI.
- [[PR 21692 - Standardize Agent API Schemas]] — establishes the `AgentResponse` shape (`agent_type`, `content`, `metadata`) the eval tasks read.
- [[Component - Agents Backend]] — backend agent architecture; the system under evaluation.
- [[Component - Agents UX]] — ChatGXY/GalaxyWizard surfaces whose routing decisions this harness scores.
