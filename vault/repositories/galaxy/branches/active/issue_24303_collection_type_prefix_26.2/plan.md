# Plan — #24303 `type_prefix` (base `release_26.2`)

Goal: a tool can declare `<collection type_source="input" type_prefix="list"/>`; parser, tool runtime (non-mapped + mapped precompute), workflow server, workflow editor all see `prefix:resolved`. Documented in `collection_semantics`. See [research](research.md).

Sequential phases, each by a subagent, normal review between. Red-to-green inside each phase.

## Scope boundaries

- **Nest not touched by default.** On 26.2 Nest is `list,paired` → fixed `list:list` and wraps pair members; the prefix would change bare-`paired` (`list:list` → `list:paired`) and mapped `list:paired` outputs. The real Nest fix is #24190 + `pr_24190_review_0` (26.0, unmerged). Phase 7 is contingent.
- **No change to `type_source` resolution order.** "Direct match before map-over" changes every `type_source` DB-op tool (filter_*, relabel, sort, tag, merge…). The prefix applies to whatever each path resolves today. Divergences recorded as follow-ups.
- One shared helper applies + validates the prefix; no new type algebra (`CollectionTypeDescription.multiply()` server, `.append()` client).

## Phases

1. **Baseline tests** (commit "Baseline tests …", passes on base):
   - unit test of `tool_output_to_structure` with `type_source` (none exists);
   - client `terminals.test.ts` coverage for unprefixed `type_source` if gaps beyond "resolves collection type source".
2. **Parser / spec**
   - `ToolOutputCollectionStructure.collection_type_prefix`; error unless `type_source` set; value checked with tool_util `_check_collection_type`; `to_dict`, `from_dict` via `.get()` (pre-upgrade job metadata), `to_model`.
   - XML parser (+ legacy `<output type="collection">` remap), YAML parser (both spellings).
   - XSD attribute + docs next to `type_source` (both `OutputCollection` and legacy `Output` forms); 26.2 profile changelog.
   - Pydantic: parser-only field on `ToolOutputCollection` (like `collection_type_from_rules`) unless exposed to user tools; `make update-client-api-schema`.
   - Profile gate: third-party tools need `profile >= 26.2` (mirror `structured_like` 26.0 gating); linter for prefix-without-type_source.
   - Parser unit tests in `test/unit/tool_util/test_parsing.py`, linter tests.
3. **Tool runtime**
   - Apply prefix in `create_collection` (`tools/actions/__init__.py:1220-1238`) and `tool_output_to_structure` (`structure.py:214-217`) via the shared helper; validate result (`list:sample_sheet` → clear error, not a broken collection).
   - New test tool `collection_type_source_prefix.xml` (clone of `collection_type_source_map_over.xml`, input `list,paired`, 2-level `identifier_0/identifier_1` discovery), registered in `sample_tool_conf.xml`. Cases: `list`→`list:list`, `paired`→`list:paired`, mapped `list:paired` input → `list:list:paired` outer.
   - API tests in `lib/galaxy_test/api/test_tools.py` (one at a time).
4. **Workflow server**
   - `get_all_outputs` sends `collection_type_prefix`; `managers/workflows.py` `_resolve_collection_type` applies prefix before prepending map-over.
   - Extend `test_export_editor_collection_type_source` + subworkflow variant in `test_workflows.py`.
5. **Workflow editor client**
   - `CollectionOutput` type, `terminalFactory`, `OutputCollectionTerminal` → `new CollectionTypeDescription(prefix).append(resolved)` (unconnected stays ANY).
   - Fixture step in `parameter_steps.json`; vitest cases: direct `list:paired`, mapped `list:list:paired` + downstream map-over, unconnected. `pnpm install` first; node 22.20.0.
6. **collection_semantics**
   - New "Output Collection Types" section before "Type Compatibility Algebra": plain `type_source`, then `type_prefix`, extra outer levels → map-over. Examples use the test tool; `tests:` link the API test, tool id, framework workflow test (`collection_semantics_type_prefix*.gxwf.yml`), and exact `it()` names.
   - Regenerate `doc/source/dev/collection_semantics.md`; run `test/unit/data/model/test_collection_semantics.py`.
7. **Nest (contingent on decision)** — see questions.

Then the hardening process (`GX_PROCESS_HARDEN_BRANCH.md`) and hand-off.

## Unresolved questions

- Nest here? (a) skip, follow-up after #24190 merges forward; (b) stack on #24190/review branch; (c) adopt on 26.2 with new Nest version.
- Attribute name: `type_prefix` OK?
- Fix `type_source` direct-vs-map-over order here or separate issue?
- sample_sheet input + prefix: error, or normalize to `list:` first?
- Profile-gate third-party use at 26.2 — ok on a release branch?
- Expose prefix to YAML user-defined tools (pydantic `UserTool…`) or parser-only?
