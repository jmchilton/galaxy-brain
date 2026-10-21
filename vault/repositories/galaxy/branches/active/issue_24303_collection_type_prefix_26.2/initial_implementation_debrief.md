# Initial implementation debrief — #24303 `type_prefix` (+ replaces #24190)

Base `release_26.2` (`e2649e52818`). Head `32a1373b487` (12 commits, +2011/−33, 43 files). Pushed to `jmchilton/issue_24303_collection_type_prefix_26.2`.

## What landed

- **Spec/parser** — `<collection type_source="input" type_prefix="list"/>` (legacy `collection_type_prefix`), `ToolOutputCollectionStructure.collection_type_prefix`; requires `type_source`; static prefix may not contain `sample_sheet`/`record`; `from_dict` back-compat via `.get()`; XSD + 26.2 profile changelog; parser-only pydantic field; client API schema regenerated. Linter `OutputsCollectionTypePrefix` errors below profile 26.2 (load not gated, so unprofiled internal tools work).
- **Runtime** — one helper, `CollectionTypeDescriptionFactory.for_prefixed_collection_type`, used by `create_collection` (non-mapped) and `tool_output_to_structure` (mapped precompute). With a prefix, a `sample_sheet*` resolved type becomes `list*` (John's call after the Nest review); other invalid results → 400. `type_source` resolution itself untouched.
- **Workflow server** — `get_all_outputs` sends `collection_type_prefix`; subworkflow `_resolve_collection_type` applies it before map-over.
- **Editor** — `OutputCollectionTerminal` applies the prefix (sample_sheet normalized; invalid → ANY; unconnected stays ANY).
- **Nest** — bernt-matthias's #24190 commit cherry-picked (authorship kept). Nest 1.1.0 (`nest_collection_1.1.0.xml`): `list,list:paired`, `type_source` + `type_prefix="list"`, profile 26.2, no explicit Python type. 1.0.0 behavior kept (help corrected). Shared `NestTool` uses `get_collection()` so mapped jobs nest their own slice (pre-existing bug on 26.2 for both versions). No `Tool.output_collection_type()` hook.
- **Docs** — `collection_semantics.yml` "Output Collection Types" section (6 examples, test-linked); `.md` regenerated.

## Tests

Baseline (`tool_output_to_structure` units, Nest 1.0.0 API pins, editor type_source mapped). Parser/linter/model units; helper + structure units; test tool `collection_type_source_prefix.xml` (XML `<tests>`); API: prefix mapped, sample_sheet normalization, Nest 1.0.0 ×3 / 1.1.0 ×5; workflow API editor export ×2; framework workflows `collection_semantics_type_prefix{,_mapped}`, `collection_semantics_nest`; vitest terminals (4 prefix cases). Final: 430 Python unit, 210 vitest, each API/framework test run individually green.

## Decisions (John)

Base 26.2; replace #24190 here; Nest 1.1.0 + keep 1.0.0; cherry-pick for credit; `type_prefix` name; normalize sample_sheet; profile 26.2 lint gate; parser-only; resolution-order bug → separate issue.

## Behavior changes to flag in PR

- Unpinned `__NEST__` (tool form, API, workflow steps without `tool_version`) now resolves to 1.1.0: bare `paired` not accepted; `list:paired` nested directly (`list:list:paired`) rather than mapped over pairs. `harmonize_optional_collection.gxwf.yml` now runs 1.1.0 (same result on a flat list).
- Mapped Nest (both versions) now nests the slice, not its parent.
- 26.0/26.1 don't get the Nest fix (#24190 targeted 26.0).

## Queued issues (gx_issues/to_file)

- `type_source_direct_match_before_map_over.md` — resolution order + subworkflow over-prepend (confirmed).
- `mapped_output_over_sample_sheet_invalid_type.md` — `sample_sheet:list…` mapped outer types.
- `tool_api_collection_input_type_not_validated.md` — direct HDCA collection type unchecked.

## Other follow-ups

- `create_list_of_pairs_in_history(wait=True)` doesn't wait.
- Legacy `<output type="collection" collection_type_source=…>` already broken (lxml `None` attribute).
- 1.0.0 Nest XML `<tests>` may not run in CI (latest-version-only collection on some paths); 1.0.0 covered by API tests.
- What to do with #24190 — John.

## Process notes

Phases ran as subagents with a normal review after each (debriefs in `subagents/`). Parallel writers in one worktree lost unstaged edits once (pre-commit stash) — serialized after.
