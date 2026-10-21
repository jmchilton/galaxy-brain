# Implementation debrief: #24303 `type_prefix` (replaces #24190)

**STATUS: READY.** Base `release_26.2` (`e2649e52818`). Head `e0239d8d74b`: 15 commits, 44 files, +2210/−84, pushed to `jmchilton/issue_24303_collection_type_prefix_26.2`. Re-scoped once. Hardened twice: round 1 is in [earlier_drafts/1/](earlier_drafts/1/), round 2 is the current set. Original scope is kept as `_alt_original_scope`; see [alts/original_scope.md](alts/original_scope.md).

## What it does

- **Tool spec.** `<collection type_source="input" type_prefix="list"/>` gives an output type of `prefix:resolved`. `type_prefix` requires `type_source`, and the prefix itself may not contain `sample_sheet` or `record`. A linter requires profile 26.2. YAML accepts both `type_prefix` and `collection_type_prefix`. Also covered: XSD, the parser-only pydantic field, and the regenerated client schema. The legacy `<output type="collection">` form does not take the prefix, because that form has failed to load since 20.09.
- **Runtime.** One helper, `CollectionTypeDescriptionFactory.for_prefixed_collection_type`, serves both non-mapped `create_collection` and mapped `tool_output_to_structure`. With a prefix, `sample_sheet*` is treated as `list*`; any other invalid result returns a 400.
- **Workflow server.** `get_all_outputs` sends the prefix. Subworkflow editor export now resolves the per-job slice of the `type_source` input, so it no longer prepends map-over twice. That fix also applies to plain `type_source`, and helpers extracted ahead of it in a refactor commit.
- **Editor.** A pure `prefixedCollectionType` helper mirrors the server. Unconnected outputs and invalid prefixed results show as ANY.
- **Nest.**
  - Matthias Bernt's #24190 commit is cherry-picked as the first Nest commit.
  - New `nest_collection_1.1.0.xml` accepts `list,list:paired` and declares `type_source` + `type_prefix="list"`, profile 26.2.
  - The 1.0.0 behaviour is unchanged; only its help text is corrected.
  - Both versions now nest the mapped slice, not its parent. That was a bug on 26.2 already.
- **Docs.** `collection_semantics` gains an "Output Collection Types" section with six examples, each linked to tests.

## Tests

- Baseline commit first, verified standalone.
- Parser/linter/model, helper/structure and workflow-module units: about 600 pass.
- Vitest: 209 pass.
- API, each run alone and green: the prefix tool (mapped, sample_sheet), Nest 1.0.0 ×3, Nest 1.1.0 ×5, subworkflow/editor export ×4.
- Framework workflows: type_prefix ×2, nest ×1.
- Selenium `test_type_prefix_output_indicator`: red on the old editor, green now.
- Screenshots: 4, see [screenshot_debrief.md](screenshot_debrief.md).

## Hardening (round 2)

- [Test challenges](test_challenges_debrief.md): re-scope tests made red-to-green, and duplicates dropped.
- [Codex](codex_review.md): two findings, both covered by #24308 (deferred).
- [Thermo-nuclear](thermo_nuclear_review.md): client helper unified; a NestTool simplification was reverted because it broke a test.
- [Baseline refactor](baseline_refactor.md): helper extraction split into its own commit.
- [Scope evaluation](scope_evaluation.md): **keep**.
- [E2E polish](polish_e2e_tests_debrief.md).

## Decisions (John)

- Base 26.2, and this branch replaces #24190.
- Nest 1.1.0 is added and 1.0.0 kept. Bernt's commit is cherry-picked.
- Name `type_prefix`. `sample_sheet` is normalized (this reversed the earlier "error" choice). The profile-26.2 gate is a linter check only. The field is parser-only.
- The resolution-order bug goes to a separate issue, now filed as #24308.

## Behaviour changes to flag in the PR

- An unpinned `__NEST__` now means 1.1.0. Bare `paired` is not accepted, and a `list:paired` input is nested directly to `list:list:paired` rather than mapped over its pairs.
- Admins with a custom `tool_conf.xml` must add `nest_collection_1.1.0.xml`, the same as the `filter_*_1.1.0` tools.
- 26.0 and 26.1 don't get the Nest fix.
- Subworkflow editor export in `get_step_map_over` changed: `paired` into a `paired_or_unpaired` input and `sample_sheet` into a `list` input are now direct connections, and `list:paired` into a `paired_or_unpaired` input now maps over `list`.

## Follow-ups and issues

- Filed: #24308, `type_source` resolution order. Runtime and editor still use the declared type, not the concrete one; Codex reproduced this with the prefix.
- Queued in `gx_issues/to_file`:
  - mapped outputs over a `sample_sheet` input get an invalid outer type;
  - the tool API doesn't validate the collection type of a directly passed HDCA;
  - legacy `<output type="collection">` should be rejected with a clear error.
- Nest 1.1.0 rejects a directly passed `paired` only by accident, through the output builder; the API validation issue would fix it properly.
- `create_list_of_pairs_in_history(wait=True)` doesn't wait.
- 1.0.0 Nest XML `<tests>` may not run in CI; its behaviour is covered by API tests.
- John to decide: what happens to #24190, and how to split the PR (options A–E in the scope evaluation).
