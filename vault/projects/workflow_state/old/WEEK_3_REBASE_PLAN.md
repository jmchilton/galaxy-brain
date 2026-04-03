# Week 3 Rebase Plan

69 commits from `25e2c0200616` → `b315096750` (HEAD).
Goal: squash down to ~12-15 logical commits.

---

## Group 1: Formatting + artifact test baseline (commits 1-5)
**Squash into 1 commit.**

| # | Hash | Message |
|---|------|---------|
| 1 | `71cb0492a9` | Formatting... |
| 2 | `aaa999c521` | Formatting. |
| 3 | `ff4c8cc43d` | Formatting. |
| 4 | `bd3cc7f5eb` | Rebase into artifact gaps. |
| 5 | `48022a0720` | Add connection-only section test, structured BenignArtifact catalog. |

**Message hint:** Start with "Add connection-only section test + BenignArtifact catalog". Formatting is just cleanup, don't need to mention.

---

## Group 2: gxformat2 normalized model migration (commits 6-14)
**Squash into 1 commit.** All of this is migrating validation, roundtrip, and export_format2 from raw dicts to gxformat2 NormalizedNativeWorkflow/NormalizedFormat2 models.

| #   | Hash         | Message                                                                           |
| --- | ------------ | --------------------------------------------------------------------------------- |
| 6   | `dcf32131c6` | Migrate validation to gxformat2 normalized models, bump dep.                      |
| 7   | `52d29f899e` | Replace deprecated gxformat2 shims with to_format2/to_native + ConversionOptions. |
| 8   | `826afe8f28` | Remove class_ hack and ensure_export_defaults, pass model to to_native.           |
| 9   | `9e753b4b65` | Retype roundtrip comparison to use NormalizedNativeWorkflow models.               |
| 10  | `2285cafea7` | Remove dead compare_connections.                                                  |
| 11  | `1816cb29f2` | Rework export_format2 to use NormalizedFormat2 models throughout.                 |
| 12  | `dc5468b20b` | Use ensure_native + convenience properties, drop str(type_) casts.                |
| 13  | `d151393f25` | Replace _replace_states with callback-based export via to_format2.                |
| 14  | `c6165394a9` | Use to_dict(), drop connection list wrapping.                                     |

**Message hint:** Start with "Migrate workflow_state to gxformat2 normalized models". Mention bumping dep, dropping deprecated shims, callback-based export rewrite. The dead code removal (compare_connections, class_ hack) follows naturally.

---

## Group 3: CLI dedup + ToolCacheOptions extraction + typed model migration (commits 15-20)
**Squash into 1 commit.** Shared CLI infra, ToolCacheOptions base model, roundtrip/validation typed models, shared utils.

| #   | Hash         | Message                                                             |
| --- | ------------ | ------------------------------------------------------------------- |
| 15  | `cfef709f03` | Extract ToolCacheOptions base model and setup_tool_info helper.     |
| 16  | `5227770a1b` | Migrate roundtrip_native_workflow/step to typed models.             |
| 17  | `e9588a8af3` | Deduplicate CLI scripts with build_base_parser + cli_main helpers.  |
| 18  | `07e1e1afb4` | Migrate validation_native + convert to accept NormalizedNativeStep. |
| 19  | `8ec1fc7f93` | Extract shared utils, fix validate_workflow_native type hint.       |
| 20  | `eb1f9e69f6` | Consolidate workflow_state helpers, fix convert/roundtrip bugs.     |

**Message hint:** Start with "Extract shared CLI infra and migrate to typed models". Mention ToolCacheOptions, build_base_parser, NormalizedNativeStep acceptance, _util extraction.


  Model migration work (should fold into Group 2 or be its own "model migration continued"):
  - 90e49e43c6 — Migrate roundtrip_native_workflow/step to typed models
  - c2d27f3bc9 — Migrate validation_native + convert to accept NormalizedNativeStep
  - 9ed28a1010 — Extract shared utils, fix validate_workflow_native type hint

  CLI dedup (separate concern):
  - 1d1ce19b4b — Extract ToolCacheOptions base model and setup_tool_info helper
  - 302fd49583 — Deduplicate CLI scripts with build_base_parser + cli_main helpers

  Consolidation (bugs/cleanup from the above):
  - 9d1560eb29 — Consolidate workflow_state helpers, fix convert/roundtrip bugs


---

## Group 4: Docs (commit 21)
**Keep as-is** — standalone docs commit is clean.

| # | Hash | Message |
|---|------|---------|
| 21 | `ed372f312d` | Workflow CLI Docs. |

---

## Group 5: Roundtrip reporting — Pydantic models + report output (commits 22-26)
**Squash into 1 commit.** Roundtrip went from dataclasses → Pydantic, gained step ID mapping, stale key data, report-json/markdown output. #26 is the polish of #25.

| #   | Hash         | Message                                                                          |
| --- | ------------ | -------------------------------------------------------------------------------- |
| 22  | `393d947339` | Migrate connection_graph.py to NormalizedNativeWorkflow Pydantic models.         |
| 23  | `6cbc40c119` | Convert roundtrip dataclasses to Pydantic models.                                |
| 24  | `9d26a17499` | Surface step ID mapping, stale key data, and original dict in roundtrip results. |
| 25  | `780c46d9a6` | Add --report-json and --report-markdown to roundtrip validate CLI.               |
| 26  | `e7519ae012` | Polish roundtrip report models: fix serialization, typing, and code quality.     |

**Message hint:** Start with "Rework roundtrip to Pydantic models with structured report output". Mention connection_graph migration, --report-json/--report-markdown, step ID mapping. Serialization fixes from the polish commit are just "the rest of the work".

---

## Group 6: Agent cleanup + extract_all_tools replacement + walker extraction (commits 27-33)
**Squash into 1 commit.** Agent did work, got manually reviewed, restored accidentally removed code, replaced extract_all_tools, extracted walk_format2_state.

| #   | Hash         | Message                                                                       |
| --- | ------------ | ----------------------------------------------------------------------------- |
| 27  | `a7f47e9a20` | Migrate clean.py reading path to NormalizedNativeStep, fix gxformat2 imports. |
| 28  | `2b13d6b4c7` | Use connected_paths for membership checks in validation + convert.            |
| 29  | `12864d3fe7` | Manual review of the agent work.                                              |
| 30  | `1bf2018dde` | Restore CombinedGetToolInfo accidentally removed in cf9884f92e.               |
| 31  | `175d38afdf` | Replace extract_all_tools with gxformat2 ensure_native + unique_tools.        |
| 32  | `2394ae5c75` | Extract walk_format2_state from convert.py inline traversal.                  |
| 33  | `d45b2929d4` | Add comment about json encoding...                                            |

**Message hint:** Start with "Extract walk_format2_state, replace extract_all_tools, migrate clean.py". Mention connected_paths, CombinedGetToolInfo restore.







---

## Group 7: Connected value injection + state_merge + legacy encoding/parameters (commits 34-44)
**Squash into 1 commit.** This is the big "make connected values and legacy encoding work correctly" block. Note: d125503aac (#41) is a subset of df2d3e1576 (#34) — same topic, just partial first attempt. 11ff6c5bba (#42) is legacy_encoding.py which evolved into legacy_parameters.py (#35) + precheck.py (#44).

| # | Hash | Message |
|---|------|---------|
| 34 | `df2d3e1576` | Make _inject_connected_value tool-aware to disambiguate repeat indices. |
| 35 | `6693267efe` | Add classified replacement parameter detection (legacy_parameters.py). |
| 36 | `6af1a7c7a9` | Unify ConnectedValue injection into shared _state_merge.py. |
| 37 | `c2aaca51aa` | Make clean_stale_state take NormalizedNativeWorkflow. |
| 38 | `c15499ecb7` | Skip pydantic validators for optional text params with None/empty values. |
| 39 | `69ae5f95f2` | Fix optional text default_value handling across input formats. |
| 40 | `9abdf9cd27` | Make workflow_step model fields optional — connected params are absent from state. |
| 41 | `d125503aac` | Make _inject_connected_value tool-aware (partial, superseded by #34). |
| 42 | `11ff6c5bba` | Add legacy parameter encoding detection (legacy_encoding.py). |
| 43 | `e9977359a4` | Don't recursively try to deal with encoding stuff. |
| 44 | `93b72fb869` | Add uniform workflow prechecking for legacy encoding (precheck.py). |

**Message hint:** Start with "Add state_merge, legacy parameter detection, and workflow prechecking". Mention: tool-aware connected value injection for repeat disambiguation, optional model fields for connected params, optional text pydantic validator fixes (these are in tool_util_models so worth calling out), precheck.py as unified gate. legacy_encoding.py → legacy_parameters.py evolution doesn't need explaining, just mention the final form.


  Group A: Walker extraction + connected value injection (commits 5, 4, 1)
  - 115f39eaa0 — Extract walk_format2_state from convert.py
  - da53253847 — Make _inject_connected_value tool-aware (the big one, walker + convert)
  - 66fe89afab — Same topic (the 5-line follow-up)

  These are all about the _walker.py / convert.py refactor — pulling traversal logic out of convert and
  making connected value injection understand repeat indices.

  Group B: State merge + legacy parameters (commits 3, 2)
  - e37f0dc082 — Add legacy_parameters.py (classified replacement param detection)
  - 88dfc8e462 — Unify ConnectedValue injection into _state_merge.py

---

## Group 8: export_format2 rework + format2 validation unification (commits 45-47)
**Squash into 1 commit.**

| # | Hash | Message |
|---|------|---------|
| 45 | `e24329db9d` | Rework export_format2 to use NormalizedNativeWorkflow + precheck. |
| 46 | `a50e57f1e3` | Unify format2 validation into shared validate_format2_state(). |
| 47 | `35d8f844f8` | Fix remaining model gaps, remove ConnectedValue error catch. |

**Message hint:** Start with "Rework export_format2 with precheck + unified format2 validation". Mention model gap fixes in parameters.py.

---

## Group 9: CLI rename + convergence (commits 48-54)
**Squash into 1 commit.** Rename galaxy-workflow-* → gxwf-*, add gxwf-to-native-stateful, gxwf-lint-stateful, converge options, docs + integration tests.

| # | Hash | Message |
|---|------|---------|
| 48 | `682cc05d65` | Rename galaxy-workflow-* CLIs to gxwf-* namespace. |
| 49 | `48cad3b152` | Converge gxwf-to-format2 and gxwf-to-format2-stateful CLI options. |
| 50 | `ccd8f5b7df` | Remove --diff from gxwf-to-format2-stateful. |
| 51 | `7173f7197e` | Fix test_tool_cache: use NormalizedNativeWorkflow.unique_tools. |
| 52 | `dfc2b61a78` | Implement gxwf-to-native-stateful CLI (Step 2). |
| 53 | `23bc87deb3` | Implement gxwf-lint-stateful CLI (Step 3). |
| 54 | `eee9788c3d` | Add docs and integration tests for new CLI commands (Step 5). |

**Message hint:** Start with "Rename CLIs to gxwf-* namespace, add to-native-stateful + lint-stateful". Mention option convergence, --diff removal, integration test coverage.






Unify workflow CLI naming and coverage with gxformat2.

The galaxy-tool-util workflow CLIs (galaxy-workflow-*) lived in a
separate namespace from gxformat2's structural CLIs (gxwf-*). They
should feel like one toolkit — gxformat2 handles structural operations,
galaxy-tool-util adds schema-aware variants via callback slots.

Rename galaxy-workflow-* → gxwf-* (state-validate, state-clean,
roundtrip-validate, to-format2-stateful). Add two new CLIs completing
the stateful layer:
- gxwf-to-native-stateful: format2→native with schema-aware encoding
  via state_encode_to_native callback
- gxwf-lint-stateful: structural lint (delegating to gxformat2) +
  tool state validation in a two-phase pipeline

Converge gxwf-to-format2-stateful options with gxwf-to-format2
(--compact, --json, -o, stdout default), remove --diff. Add wf_tooling
developer docs, IWC sweep integration tests for new commands.








---

## Group 10: JSON Schema validation — all 4 phases (commits 55-63)
**Squash into 1-2 commits.** Could keep as 1 (all of JSON Schema work) or split into "export infra" (55-56) and "validation + integration" (57-63). Recommend 1 since it's all one feature.

| # | Hash | Message |
|---|------|---------|
| 55 | `b76c58babf` | Add galaxy-tool-cache schema subcommand for JSON Schema export. |
| 56 | `1998e2a663` | Add structural-schema subcommand, Phase 1 JSON Schema export tests. |
| 57 | `a00452e7e1` | Add two-level JSON Schema validation module, Phase 2 structural tests. |
| 58 | `a017daa005` | Fix schema dir layout to use subdirectories, add invalid step type test. |
| 59 | `8b871ff136` | Type get_tool_info as GetToolInfo, fix test imports and assertion. |
| 60 | `1214aea8bd` | Add Phase 3 per-step tool state JSON Schema validation tests. |
| 61 | `b754cb20c8` | Add --mode json-schema to gxwf-state-validate, Phase 4 integration tests. |
| 62 | `08250d1150` | Fix review items: directory mode, imports, extra-key and strict tests. |
| 63 | `033a3a11d5` | Extract shared test helpers, add subworkflow/schema-dir/connections fixes. |

**Message hint:** Start with "Add JSON Schema validation: export, structural checks, per-step validation, --mode json-schema". Mention two-level validation module (validation_json_schema.py), schema subcommand on tool-cache CLI, 4-phase test suite. Polish items (dir layout fix, test helpers extraction) are just part of the work.

---

## Group 11: Final polish + unification (commits 64-69)
**Squash into 1 commit.** Import cleanup, select_which_when unification, __current_case__ removal, LeafCallback type, CLI common extraction, unified validation pipeline.

| # | Hash | Message |
|---|------|---------|
| 64 | `5fa103a9d2` | Move deferred imports to module level, capture format2 state in StepResult. |
| 65 | `09100ee1c0` | Replace __current_case__ usage with _select_which_when_native() walker. |
| 66 | `d12e899499` | Resolve 5 TODOs: type alias, computed property, YAML loader, docstrings. |
| 67 | `6ad86966c7` | Add LeafCallback type, unify select_which_when_format2 with native. |
| 68 | `c7ea55d55d` | Extract add_report_args() into _cli_common, dedup across 3 scripts. |
| 69 | `b315096750` | Unify state + connection validation into single pipeline. |

**Message hint:** Start with "Unify state + connection validation pipeline, replace __current_case__ with walker". Mention LeafCallback type, _cli_common extraction, format2 state in StepResult. TODO cleanup doesn't need mention.

---

## Summary

| Group | Commits | Resulting commit |
|-------|---------|-----------------|
| 1. Formatting + artifact baseline | 1-5 | 1 |
| 2. gxformat2 model migration | 6-14 | 1 |
| 3. CLI infra + typed models | 15-20 | 1 |
| 4. Docs | 21 | 1 (keep) |
| 5. Roundtrip reporting | 22-26 | 1 |
| 6. Agent cleanup + walker extraction | 27-33 | 1 |
| 7. State merge + legacy params + precheck | 34-44 | 1 |
| 8. export_format2 rework | 45-47 | 1 |
| 9. CLI rename + convergence | 48-54 | 1 |
| 10. JSON Schema validation | 55-63 | 1 |
| 11. Final unification | 64-69 | 1 |
| **Total** | **69** | **~11** |

## Execution Strategy

Since `git rebase -i` is off-limits (interactive tool config issue), we should do this with sequential `git reset --soft` operations on a fresh branch:

1. Create new branch from `25e2c0200616`
2. Cherry-pick each group's range, then `git reset --soft` to squash
3. Commit with the composed message
4. Repeat for each group in order
5. Verify final tree matches current HEAD's tree exactly (`git diff` should be empty)

Alternatively, simpler: `git reset --soft` from HEAD back to each group boundary, commit, repeat working backwards. But forward is safer for conflict-free results.
