# #210 research: TS consumers, data flow, datatype snapshot placement

Base: `galaxy-tool-util-ts` `origin/main` `a0476900` (2026-10-27). Paths are relative to the repo root unless noted otherwise. Read-only research.

## TL;DR

- The cross-check lives in `schema`, which has zero internal deps, and `connection-validation` depends on `schema`. So `checkTestsAgainstWorkflow` can't call the resolver. Keep it data-driven: add optional fields to `WorkflowInput`/`WorkflowOutput`, inject a subtype predicate, and let the CLI compose (connection resolver → enriched shape → check).
- Don't build on the snake_case connection report. `resolved_outputs.collection_type` maps both the dataset case and the unknown case to `null`. Use `buildWorkflowGraph` + `validateConnectionGraph` and its `StepOutputTypeMap` directly.
- Nothing tracks datatypes today. Connection validation is collection-only, PJAs are never read, and input-step `format` is dropped.
- Galaxy checks output `ftype` by exact `file_ext` equality, not by subtype. Subtype reasoning applies only to input `filetype` vs the declared `format`.
- Recommended placement: put the snapshot in `@galaxy-tool-util/workflow-graph` behind a new subpath export (not re-exported from the index), generated as a `.generated.ts` + `.sha256` + a `verify-*` target. A new package is viable but costs npm stub publish plus trusted-publishing setup and gains nothing on versioning (all packages are linked).
- Zero-false-positive corpus: Galaxy's 53 `lib/galaxy_test/workflow/*.gxwf.yml` + `*.gxwf-tests.yml` pairs. It already contains the two traps below: `sample_sheet:paired` fed to a `list:paired` input, and a `ChangeDatatypeAction` output asserting `ftype: txt`.

## 1. Cross-check pipeline today

`packages/schema/src/test-format/cross-check/`:

- `types.ts:26-32` defines `WorkflowInput {name, doc?, type, default?, optional?}`.
  - **No `format`, no `collection_type`.**
- `types.ts:34-39` defines `WorkflowOutput {name, doc?, uuid?, type?}`.
  - `type?` was added in `fe80b5fe` ("for plugin alignment"). Extractors leave it unset, and nothing reads it in `check.ts`.
- `extract.ts:11-25` is the format dispatcher, via `resolveFormat`.
- `extract-format2.ts:13-31` (`parseInputEntry`) works on the raw dict. It keeps `type`/`doc`/`optional`/`default` and **drops `format` and `collection_type`**.
  - It bypasses `normalizedFormat2` alias handling.
  - `NormalizedFormat2InputSchema` (`workflow/normalized/format2.ts:50-63`) already has `format: string[]` and `collection_type`.
- `extract-format2.ts:62-68`: outputs keep only `name`/`doc`. **`outputSource` is dropped.**
- `extract-native.ts:16-21` sets `data_input` → `"data"` and `data_collection_input` → `"collection"`.
  - **`tool_state.format` and `tool_state.collection_type` are dropped** (`:41-62`).
- `extract-native.ts:64-83`: outputs take `label ?? output_name` plus `uuid`. **The step id and `output_name` are dropped**, so nothing can be resolved later.
- `type-compat.ts:16-36`: `isCompatibleType` maps `data`/`collection` to "compatible", so `class: Collection` on a `data` input passes silently.
  - The comment says "the strict structural check lives in the JSON Schema layer", but the schema has no workflow knowledge.
- `check.ts:37-102` emits only `workflow_input_undefined`, `workflow_input_type`, `workflow_input_required` and `workflow_output_undefined`.
  - The output loop (`:89-98`) never reads the assertion value.
- Diagnostic shape: `TestFormatDiagnostic {path, message, keyword, params}` (`test-format/validate.ts:20-25`).
  - **No severity.** The CLI's `valid` means zero diagnostics, so issue item 3's "warning" needs a contract change (a `severity` field or a separate `warnings[]`).

CLI wiring (`packages/cli`):

- `src/commands/validate-tests.ts:34-47` has `loadWorkflowShape`. `:78-91` appends `checkTestsAgainstWorkflow` and maps load failures to `workflow_load_error`.
- `src/commands/validate-tests-tree.ts:89-102` is a **duplicate** of `loadWorkflowShape`. `:155-170` uses `--auto-workflow` sibling pairing.
- `spec/gxwf.json:81-99` (validate-tests) offers only `--json` and `--workflow`. `:662-680` (tree) offers only `--json` and `--auto-workflow`.
  - **There are no `--cache-dir`, `--offline` or `--galaxy-url` flags**, unlike `validate` (`:45-55`).
- Exported for library use from `src/index.ts:21-28`.

Other consumers:

- **galaxy-workflows-vscode** (`origin/main` `60d99c9`, pins `@galaxy-tool-util/schema` 1.9.0):
  - `server/packages/server-common/src/languageTypes.ts:2-10` imports only the `WorkflowInput`/`WorkflowOutput`/`WorkflowDataType` **types**.
  - The plugin reimplements the rules itself in `workflow-tests-language-service/src/validation/rules/WorkflowInputsValidationRule.ts` and `WorkflowOutputsValidationRule.ts`. Its messages are the same text with `"` instead of `'`.
  - Its AST extractors build the DTO literals: `gx-workflow-ls-format2/src/gxFormat2WorkflowDocument.ts:65-100` and `gx-workflow-ls-native/src/nativeWorkflowDocument.ts`.
  - It never calls `checkTestsAgainstWorkflow`, so new DTO fields **must be optional** or the plugin build breaks on upgrade.
  - There's no datatype code in the plugin on any branch. It has a web-extension bundle (`package.json:42` `browser`, esbuild).
- **gxwf-web (TS), gxwf-client, gxwf-ui**: no use of validate-tests or cross-check. gxwf-ui uses `connection-validation` only for edge annotations (`src/composables/useClientEdgeAnnotations.ts:10`).
- **gxwf-web (Python, `~/projects/repositories/gxwf-web`)**: no validate-tests or cross-check.
- **gxformat2 Python** (`galaxyproject/main` `2602e0c`, `jmchilton/main` `1653d5f`): no tests-file cross-check. No keyword fixtures to keep aligned.
- **Closest Python parallel is planemo**, `planemo/workflow_lint.py` (`origin/master`):
  - `_lint_case` (`:266-312`) covers unknown input (warn), required input (error) and unknown output (error).
  - `_tst_input_valid` (`:370-392`) only checks that File paths exist.
  - It has **no kind, collection or datatype checks** and no shared keywords. Nothing to align except the semantics.

## 2. Connection validation: what's reusable

- Graph: `connection-validation/src/graph-builder.ts:42-48` `buildWorkflowGraph(workflow, getToolInfo)`.
  - Accepts format2 (via `toNative`) or native (`:50-60`).
- Input steps (`:111-144`):
  - `data_input` → output `{type:"data"}`. **Ignores `tool_state.format`.**
  - `data_collection_input` → `collectionType` (default `list`).
- Tool steps (`:146-181`): `resolveForStep` handles inline UDTs (`tool_representation`) offline.
  - `_collectOutputs` (`:386-416`) keeps `format` + `formatSource` for data outputs, and `collection_type`/`_source`/`_from_rules`/`structured_like` for collection outputs.
  - Those fields are **step-local metadata only**: never propagated, never compared.
- **`post_job_actions` is never read.** `NormalizedNativeStep.post_job_actions` exists (`schema/src/workflow/normalized/native.ts:74`). Format2 `out: {x: {change_datatype: t}}` becomes `ChangeDatatypeAction` with `{newtype}` (`normalized/toNative.ts:85-88`).
- Subworkflows (`:183-213`): `_buildSubworkflowOutputMap` (`:252-264`) maps `label || "<stepId>:<output_name>"` → `[innerStepId, outputName]`.
  - It's private. The same mapping over the **top-level** workflow's `workflow_outputs` resolves test output labels. Export or generalize it.
- Engine: `connection-validator.ts:49-138` `validateConnectionGraph(graph) → [result, StepOutputTypeMap]`.
  - `StepOutputTypeMap = Record<stepId, Record<outputName, CollectionTypeDescriptor>>` (`types.ts:101`).
  - Values are `NULL_COLLECTION_TYPE_DESCRIPTION` (a dataset), `CollectionTypeDescription(ct)`, or `ANY_COLLECTION_TYPE_DESCRIPTION` (unknown).
  - Data outputs under map-over become `CollectionTypeDescription(mapOver)` (`:290-315`). That's the "dataset assertion on a mapped-over list" case in the issue.
  - Subworkflow outputs resolve through a seeded inner run (`:358-389`).
  - **ANY = unknown.** It comes from skip edges (`_markOutputsUnknown` `:140-146`) or collection outputs without a resolvable type. A missing tool gives an empty outputs map (lookup returns `undefined`). Both must mean "skip check".
- Report: `report-builder.ts:29-36` `validateConnectionsReport`. `:57-61` `resolved_outputs: {name, collection_type}`.
  - `_sentinelToCollectionType` (`:86-91`) maps **both NULL and ANY to `null`**, so the report can't tell dataset from unknown. Don't consume it for this.
  - The report is a Python-parity contract (comment `:6-8`, plus gxwf-web OpenAPI sync), so adding `format` to it is a cross-repo change. Avoid it unless wanted.
- Tool info:
  - `GetToolInfo` (`get-tool-info.ts:3-5`) is sync.
  - `collectToolRefs` + `buildGetToolInfo(data, asyncFetcher)` (`build-get-tool-info.ts:32,75`) preload asynchronously, then serve synchronously.
  - CLI adapter: `cli/src/commands/connection-validation.ts:28-44` (`buildConnectionReport`, `buildGetToolInfo(data, cache)`).
  - `validate --connections` path: `validate-workflow.ts:183` `makeValidationResolver(opts)` (`resolve-tool.ts:81-87`; `--offline` → cache only, else ToolShed + `--galaxy-url`), then `:209` `buildConnectionReport(data, cache)`. `draft-validate.ts:195` follows the same pattern.
  - **validate-tests can reuse this as-is**: add the cache flags, then call `makeValidationResolver` + `buildGetToolInfo`.
  - Open question: online-by-default fetch would change a command that is offline today.
- `ParsedTool` output model (`schema/src/schema/parsed-tool.ts:63-72`): data outputs have `format`, `format_source`, `discover_datasets[].format`.
  - **There's no `change_format`/`<when>`**, so a declared `format` isn't always the final ext.
  - Collection outputs have no element format.
- What output ftype needs, beyond collection shape: a parallel "resolved ext" walk. For each data output:
  - Use the `ChangeDatatypeAction` newtype if one is present.
  - Otherwise `format_source` → the ext of the upstream connection's resolved output, recursively; workflow-input format if declared, else unknown.
  - `format == "input"` → same as `format_source`.
  - Otherwise the declared `format`.
  - `discover_datasets` / `auto` / `_sniff_` → unknown.
  - Unknown → skip. The walk is cheap given the graph, and it should live in `connection-validation` as a new function, not in the report.

## 3. Package graph and placement

Internal deps (package.json):

- `workflow-graph`: no `@galaxy` deps; only `pyre-to-regexp`. `sideEffects: false`.
- `schema`: no internal deps. `sideEffects` unset. Runtime deps `ajv`, `effect`, `yaml`.
- `core`, `tool-xml` → `schema`.
- `connection-validation` → `schema`, `workflow-graph` (`sideEffects: false`).
- `search` → `core`, `schema`.
- `cli` → `connection-validation`, `core`, `schema`, `search`, `tool-xml`.
- `gxwf-web` → `cli`, `connection-validation`, `core`, `schema`. `gxwf-ui` (private) → `connection-validation`, `core`, `schema`, …
- No cycle if `schema` gains a dep on `workflow-graph`. Simpler: `check.ts` takes a structural `{isSubType(child, parent): boolean}` (or a `DatatypesMapperModel`) via options, so `schema` stays dep-free.

Existing datatype code (`packages/workflow-graph/src`):

- `datatypes-mapper.ts:3-46` `DatatypesMapperModel`: `isSubType`, `isSubTypeOfAny`, `getParentDatatype`.
- `datatypes-combined-map.ts:10-16` is a hand-written `DatatypesCombinedMap`.
- `connection-acceptable.ts:12-52` `producesAcceptableDatatype`: special-cases `input`/`_sniff_`.
  - Its "unknown" branch tests against `mapper.datatypes`, which is the **upload-only list**. See §6.
- **None of these are used anywhere outside workflow-graph today.**
- Test fixture: `test/fixtures/{datatypes.json (70 B, 5 types), datatypes.mapping.json (630 B)}`, the same as Galaxy's `client/tests/test-data/json/`. It uses short class names (`Text`, `Data`), while real Galaxy uses FQCNs (`galaxy.datatypes.data.Text`). The `isSubType("txt","Data")` test only passes on the toy fixture.
- Galaxy client mirror: `client/src/components/Datatypes/{model.ts, factory.ts, index.js}`. `factory.ts` fetches `/api/datatypes/types_and_mapping`. A TS "provider" (snapshot default, optional live fetch from `--galaxy-url`) is the analogue of `factory.ts`.

Placement (deciding constraints, not a verdict):

- All published packages are `linked` (`.changeset/config.json`), so separate cadence isn't an argument for a new package.
- A new package needs an npm stub publish plus trusted-publishing setup and a linked-list entry (`docs/development/publication.md:65-98`).
- workflow-graph already owns the mapper, has no deps, and is `sideEffects: false`. Its README pitches "Pure … extracted from Galaxy", and the snapshot is data, not ported code.
- **Recommend** `packages/workflow-graph/src/datatypes-snapshot.generated.ts` behind `exports["./datatypes-snapshot"]`, not re-exported from `index.ts`.
  - That keeps ~150 KB out of any future Galaxy-client consumer, the vscode web bundle and gxwf-ui unless they import it explicitly.
  - Consumers: CLI (node) and, optionally, the vscode server.
- If John wants the "datatypes package mirroring Galaxy" framing, `@galaxy-tool-util/datatypes` is the alternative. It would depend on workflow-graph and hold the snapshot, provider, extension helpers and sync.

Size and bundling:

- `types_and_mapping` is 154,143 B raw (16.6 KB gzip) and 142.5 KB minified with arrays instead of `{cls:true}` maps.
- The vscode web extension and gxwf-ui would pay this only through explicit import.

JSON conventions and sync model:

- `src/` never imports `.json`. The only exception is `cli/src/meta/specs.ts:6-8` (`with {type:"json"}`, node-only). Vendored JSON becomes a `*.generated.ts` `export const … as const`.
- Model to copy: `Makefile:66-104`.
  - `sync-test-format-schema` dumps via `GALAXY_ROOT` python (`scripts/dump-test-format-schema.py`), writes the `.json`, the `.generated.ts` and the `.sha256`.
  - `verify-test-format-schema` is wired into `make check` (`Makefile:23`). Same pattern: `sync-user-tool-source-schema`.
- rsync-style groups (`sync-rules-dsl-spec` etc.) go through `scripts/sync-manifest.json` + `scripts/sync-fixtures.mjs`. That works for copying files; the snapshot needs generation, so follow the dump pattern.
- Proposed `sync-datatypes` target:
  - Option A (reproducible): a `GALAXY_ROOT` python script building `Registry().load_datatypes(…, lib/galaxy/config/sample/datatypes_conf.xml.sample)` and dumping `galaxy.managers.datatypes.view_types_and_mapping(registry, upload_only=False?)` (`lib/galaxy/managers/datatypes.py:56-62`).
  - Option B: `curl https://usegalaxy.org/api/datatypes/types_and_mapping`. This pins one instance (`26.1.2.dev0` today) and includes ToolShed-installed types (anvio etc.).
  - Record the source and version in the generated header either way.

## 4. Test-format schema fields (`packages/schema/src/test-format/tests.schema.json`, 207 KB)

- Job value (`$defs.Job.additionalProperties`): File (`LocationFile|PathFile|ContentsFile|CompositeDataFile`, `class: "File"`), `Collection`, `Directory`, string/int/number/bool/null, or an array of Files/scalars.
  - A bare string is valid for a data input (it's a path).
- File fields that matter: `class`, `filetype`, `dbkey`, `composite_data`, `decompress`.
- `Collection`: `class: "Collection"` (required), `collection_type`, `elements[]` (File or nested Collection, each with `identifier`), `rows` (sample sheets).
  - Nested element Files carry their own `filetype`.
- Output (`TestJob.outputs.additionalProperties`) is discriminated **only by `class: Collection`**:
  - With it: `TestCollectionOutputAssertions {class, collection_type, attributes.collection_type, element_count, element_tests|elements}`.
  - Otherwise, an object is `TestDataOutputAssertions {class?: "File", ftype, asserts, file, checksum, metadata, …}`, and a scalar is a parameter output.
  - So the "dataset-form assertion on a collection output" case means the `class` key is absent.
  - `element_tests` values are either `TestCollectionDatasetElementAssertions` (has `ftype`) or nested `TestCollectionCollectionElementAssertions` (`class: Collection`, no `collection_type`).
- Collection type appears in **two places**: top-level `collection_type` and `attributes.collection_type`. Element-level `ftype` needs the element datatype, which isn't knowable, so skip it.

## 5. Check semantics and traps

- Input `collection_type`: use the algebra, **not string equality**. Galaxy's `collection_semantics_list_paired.gxwf-tests.yml` passes `sample_sheet:paired` to a `list:paired` input. Use `CollectionTypeDescription.canMatch` from workflow-graph, or `canMatch` re-exported by connection-validation (`index.ts:37-47`).
  - Open question: should map-over on workflow inputs (`canMapOver`) ever be accepted? Galaxy doesn't map over workflow inputs, so probably no.
- Input `filetype` vs declared `format`: subtype-aware (`isSubTypeOfAny(filetype, formats)`).
  - Galaxy does **not** enforce input format at invocation. `InputDataModule.execute` (`lib/galaxy/workflow/modules.py:1154-1187`) never checks it, and `format` only filters the runtime `DataToolParameter` (`:1260-1270`). Downstream tools may also implicitly convert.
  - So this is likely a warning, not an error. Open question.
  - Compressed classes subclass the base: `registry.FastaGz` ⊂ `sequence.Fasta`. So `fasta.gz` passes a `fasta` input, matching Galaxy.
- Output `ftype`: Galaxy compares `ftype` → `file_ext` **exactly** (`lib/galaxy/tool_util/verify/interactor.py:2498-2499`), not by subtype. Check it against the resolved ext walk (§2); unknown → skip.
  - Trap: Galaxy's `pick_value_change_datatype.gxwf-tests.yml` has a bed input with output `ftype: txt` via `change_datatype: txt` on a `pick_value` step.
  - The graph builder handles `pick_value` as an empty step (`graph-builder.ts:92-93` → `_emptyStep`), so it has no outputs. It must skip, not fail.
- Unknown extension: check against `ext_to_class_name` keys (799), not `datatypes` (575 upload-only). Special-case `input`, `_sniff_`, `auto`, `data`. `data` is in the mapping but not in the upload list.
- Issue repro cases by data need:
  - **No tool cache needed** (from tool_state or the format2 input): `class: Collection` on a `data` input; `filetype: bam` on a `format: fasta` input. Input `collection_type` mismatch is the same.
  - **Needs graph + tools (cache or inline UDTs)**: `collection_type: list:paired` on a `list` output; dataset-form assertion on a map-over `list` output; `ftype: bam` vs tool `fasta`.
  - The egapx case uses inline UDTs plus an inline subworkflow, so the tool-dependent checks work offline for it.
- Phasing suggestion:
  1. Enrich extractors (via the normalized/`toNative` path) and add input checks plus datatype injection.
  2. Add a CLI-side enrichment that resolves output kind from `StepOutputTypeMap`.
  3. Add the ext walk plus `ftype`.

## 6. Datatype API measurements (usegalaxy.org, `26.1` / `2.dev0`, 2026-10-27)

Saved under `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-workflow-libs/f05d0ddd-baff-4781-ab15-e8c6bf6640dc/scratchpad/datatypes_dl/` (not in the repo).

| endpoint | bytes | gzip |
|---|---|---|
| `/api/datatypes/types_and_mapping` | 154,143 | 16,615 |
| `/api/datatypes/mapping` | 147,847 | 14,489 |
| `/api/datatypes?extension_only=false` | 131,246 | 12,168 |
| `/api/datatypes` | 6,261 | 2,451 |
| `/api/datatypes/edam_formats` | 19,917 | 4,463 |
| `/api/datatypes/converters` | 13,684 | 1,620 |
| `/api/datatypes/sniffers` | 10,787 | 1,962 |

- `types_and_mapping` contains:
  - `datatypes`: 575, the **upload-only** list (`view_index` defaults `upload_only=True`).
  - `ext_to_class_name`: 799.
  - `class_to_classes`: 527, averaging 4.4 ancestors each, as FQCNs.
  - Compare the existing fixture: 5 / 5 / 5.
- `?extension_only=false` gives 576 dicts `{extension, description, description_url, display_in_upload, composite_files, upload_warning, display_behavior}` with **no hierarchy**, so it's useless for subtyping. It's only useful for descriptions or completions.
- Use `types_and_mapping` (or `mapping` plus `?upload_only=false` for the full extension list).
- Comparison with Galaxy's sample `datatypes_conf.xml.sample` (786 `<datatype>` entries): most usegalaxy-only extensions are `*.gz`/`*.bz2` classes that the registry generates at runtime (module `galaxy.datatypes.registry`). A `Registry()`-based dump from `GALAXY_ROOT` would produce them too, so a source dump is close to the live set minus ToolShed-installed types.
- `converters` would let the input-format check accept implicitly convertible types, if wanted.

## 7. Reusable fixtures

- `packages/schema/test/fixtures/test-format/cross-check/{positive,negative}/*-tests.yml` + `workflows/basic.{gxwf.yml,ga}` (README there).
  - It's the one-keyword-per-negative-fixture pattern, driven by `packages/schema/test/cross-check.test.ts:34-46` (`describe.each` over format2 and native).
  - `basic` has no collections or formats. Add `collections.{gxwf.yml,ga}`, or extend `basic` with a `format:` data input and a `collection_type` input.
- `packages/core/test/fixtures/connection_workflows/*.gxwf.yml` (34, synced from Galaxy `test/unit/tool_util/workflow_state/connection_workflows/`) + `parsed_tools/*.json` (12, `make sync-parsed-tools`, sha-checked).
  - Most have no top-level `outputs:`. Those with outputs are mainly subworkflow and UDT cases (`ok_subworkflow_map_over`, `ok_subworkflow_list_propagation`, `ok_udt_*`).
  - `parsed_tools/output_format.json` covers `format`/`format_source`.
  - Harness: `packages/connection-validation/test/connection-workflows.test.ts`. Adding local files there shows up as EXTRA in `check-sync`.
- CLI tests: `packages/cli/test/validate-tests.test.ts:101-160` (the `--workflow` block) and `validate-tests-tree.test.ts`.
- Galaxy `lib/galaxy_test/workflow/` (`origin/dev`): 53 `*.gxwf.yml` + `*.gxwf-tests.yml` pairs, all passing in Galaxy CI.
  - 29 use `class: Collection`/`collection_type`, 17 `filetype`, 5 `ftype`.
  - It's an ideal zero-false-positive corpus.
  - Using it needs a new sync-manifest group plus extending `sync-parsed-tools` to their `test/functional/tools` tool ids.
- Workflow fixtures with subworkflows: `packages/schema/test/fixtures/workflows/{format2,native}/synthetic-*subworkflow*` (structure only, no tests files).

## Open questions

- Should the snapshot go in a workflow-graph subpath or a new `@galaxy-tool-util/datatypes` package?
- Snapshot source: a `GALAXY_ROOT` sample-conf dump or a usegalaxy.org curl?
- Severity channel: add `severity` to `TestFormatDiagnostic`, or keep checks error-only and drop the uncertain ones?
- `filetype` outside the declared `format`: error or warning? Should converters count as acceptable?
- validate-tests tool fetching: should it default to online like `validate`, or be offline unless flags are given?
- Should the extractors move onto `normalizedFormat2`/`toNative`, or should the raw-dict walk be extended?
- Should `WorkflowOutput` gain `collectionType?`/`format?`, or should `type` carry a `collection:<ct>` encoding?
- Should the shared vocabulary align with the vscode plugin?
