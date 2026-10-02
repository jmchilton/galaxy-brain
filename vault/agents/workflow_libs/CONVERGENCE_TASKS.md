# gxformat2 ↔ galaxy-tool-util-ts convergence tasks

Audit date 2026-09-30. Read-only audit; nothing changed in either repo.

## TL;DR

- Declarative parity is good. The `gxformat2_declarative_sync` branch syncs all current Python expectations and fixtures. On that branch the TS suite runs 387 pass and 1 skip (the known YAML null-key divergence).
- The real gaps are behaviors with **no shared fixture**. Three were found and confirmed by probes:
  1. **Python bug (TS→Py backport):** a format2 dict-form step whose `label:` differs from its key breaks Python cytoscape, mermaid and layout. Cytoscape emits a dangling edge, mermaid drops the edge, and layout writes no positions. TS handles all three.
  2. **TS bug (Py→TS):** native→format2 silently drops PJAs that have no out-shorthand, such as `ValidateOutputsAction`. It also emits a junk `out: [{}]` entry.
  3. **Draft workflows** exist only in TS. The Python side is WIP PR #219, which is stale.
- **Tooling:** the `workflow-fixtures` sync check always exits 1 against Python main (no `format2/draft/` dir), and no sync check runs in CI. The TS runner reports unknown operations as passing (`it.fails`).

## SHAs audited

| Repo | Ref | SHA |
|---|---|---|
| gxformat2 | `galaxyproject/main` | `6cfdb58` (2026-09-30) |
| gxformat2 | `jmchilton/model_record_fields_214` (PR #219, WIP) | `7b09786`; 8 commits, 80 behind main |
| galaxy-tool-util-ts | `origin/main` | `f3ef6abb` (2026-09-25) |
| galaxy-tool-util-ts | `origin/gxformat2_declarative_sync` (in flight) | `fa52f6ee` |

## Module map (Py → TS, `packages/schema/src/workflow/`)

| Area | Python | TS | State |
|---|---|---|---|
| normalize / expand | `normalized/{_format2,_native,_expanded}.py`, `normalize.py` | `normalized/{format2,native,expanded,ensure}.ts` | parity (declarative) |
| convert | `normalized/_conversion.py`, `converter.py`, `export.py` | `normalized/{toFormat2,toNative}.ts` | parity except PJA passthrough (task 3) |
| labels | `_labels.py` (`unlabeled_node_id` only) | `normalized/labels.ts` (`stepRenderIdentity`, `rawStepRenderIdentity`, `unlabeledNodeId`) | Py lacks the render-identity helpers (task 1) |
| lint | `lint.py`, `linting.py`, `lint_rules.py`, `lint_profiles.yml` | `lint.ts`, `linting.ts`, `lint-rules.ts`, synced yml | TS lacks report-markdown validation and training lint; both sides wire only 1 rule class (pilot) |
| schema rules | `schema_rules.py/.yml` | `schema-rules.ts`, synced yml | in sync |
| semantic validators | `_semantic_validators.py` | `semantic-validators.ts` | parity (incl. state/tool_state exclusivity) |
| cytoscape / mermaid | `cytoscape/`, `mermaid/` | `cytoscape*.ts`, `mermaid.ts` | TS adds draft overlay and edge annotations; Py has the id-ref edge bug |
| layout | `layout/` | none on main; `layout.ts` and `layout-properties.ts` on the sync branch | in flight; no TS CLI command |
| draft | none on main (PR #219 WIP) | `draft-checks.ts`, `promote-draft.ts`, `raw/gxformat2-draft*.ts`, CLI `draft-*` | TS-only |
| JSON Schema export | `schema/json_schema.py` | `json-schemas.ts` | both exist |
| markdown | `markdown_parse.py` | none | Py only (task 5) |
| abstract CWL | `abstract.py` (`gxwf-abstract-export`) | none | Py only (question) |
| schema sources | `schema/` | `schema-sources/` | identical, incl. `draft_workflow.yml` = #219 |

Out of scope (TS ports of Galaxy's `tool_util.workflow_state` and connection validation, not gxformat2): `clean`, `roundtrip`, `walker`, `precheck`, `legacy-encoding`, `replacement-scan`, `stale-keys`, `fill-defaults`, `stateful-*`, `state-merge`, `report-models`, `step-skeleton`, `edge-annotation`.

## Ordered tasks

### 1. Labeled-step render identity: id-form sources + layout positions — TS→Py, S–M

- **Area:** cytoscape, mermaid, layout (edges and positions).
- **Bug:** format2 dict-form steps where `label:` ≠ dict key.
  - Cytoscape and mermaid key nodes by `label || id`. When an `in:` source uses the dict id (`upstream/out`), it isn't folded back to the render identity, so cytoscape emits a dangling edge (`source: "upstream"`) and mermaid drops the step→step edge.
  - Separately, `layout/_builder.py::_format2_node_id` (and its mirror in `layout/_properties.py::_read_node_positions`) returns the dict key and ignores an explicit `label`. Positions never match, so no step gets `position`. This happens even when sources reference by label.
- **Evidence:**
  - Python probe on the TS regression workflow: edges `[('in_file','Upstream Tool With Label'), ('upstream','Downstream Tool With Label')]`; mermaid has no `step_0 --> step_1`; `apply_layout` gives `position=None` for both steps; `downstream_right_of_upstream`, `all_nodes_positioned` and `roots_leftmost` fail.
  - TS (sync branch) passes all four graph properties with both strategies, and mermaid emits `step_0 --> step_1`.
  - TS fix commit is `3999c83e`. The test is imperative, in `packages/schema/test/diagram-unlabeled-fallback.test.ts` ("diagram source resolution by step id").
- **Fixture:** none exists. Only `synthetic-inputs-array` has an explicit `label:`, and it doesn't hit this. Add a new one, e.g. `synthetic-labeled-step-id-ref.gxwf.yml`: dict keys ≠ labels, one source by dict id, one by label.
- **Red→green:**
  - Add cases to `cytoscape.yml` (edge `source` equals the label, and both endpoints are in the node ids via `cytoscape_node_ids`), `mermaid.yml` (`workflow_to_mermaid` with `value_contains: "step_0 --> step_1"`) and `layout.yml` (`layout_format2` and `layout_layered_format2` with all 4 `graph_properties`).
  - These go red in Python and are already green in TS.
  - After syncing, delete the second `describe` in `diagram-unlabeled-fallback.test.ts`, since it becomes redundant.
- **Abstraction:**
  - Python: add `step_render_identity` / `raw_step_render_identity` plus an id→identity source resolver to `gxformat2/_labels.py`. Use them from the cytoscape builder, the mermaid builder, `layout._builder` and `layout._properties`, instead of three local derivations.
  - TS: `identityByKey` is duplicated in `mermaid.ts` and `cytoscape.ts`. Extract it into `normalized/labels.ts` as a small follow-up.
- **Sequencing:** land after the sync branch merges. That branch rewrites `cytoscape.yml`, `mermaid.yml` and `layout.yml`.

### 2. Draft workflows in Python — TS→Py, L

- **Area:** schema/models, validation, draft ops, viz overlays.
- **Evidence:**
  - PR #219 (`model_record_fields_214`, `7b09786`) is WIP and 80 commits behind main. It adds the draft schema and models, `draft.py` sentinels, `validate_format2_draft[_strict]` and 11 fixtures under `format2/draft/`.
  - Its `tests/test_interop_tests.py` skip-stubs `detect_draft`, `validate_draft` and `extract_draft_subset`.
  - TS has the full implementation: `draft-checks.ts`, `promote-draft.ts`, CLI `draft-validate`, `draft-next-step` and `draft-extract`, plus mermaid and cytoscape planned overlays.
  - The TS expectations `detect_draft.yml`, `validate_draft.yml` and `extract_draft_subset.yml` are byte-identical to #219. The draft schema source is identical too.
- **Shared fixtures:** mostly present. TS-only items to upstream:
  - fixtures `synthetic-draft-mixed-steps.gxwf.yml` and `synthetic-draft-planned-source.gxwf.yml`
  - `next_draft_step.yml` (8 cases, not in #219)
  - draft viz cases in `cytoscape_ts_extras.yml` (5) and `mermaid_ts_extras.yml` (6), which live on the sync branch
- **Also needed in TS:** the `validate_format2_draft` and `validate_format2_draft_strict` ops. #219 adds 6 such cases to `validate_format2.yml`, and TS has no op for them. See task 4c.
- **Red→green:**
  - Rebase #219 onto main and unstub one op at a time, in this order: `detect_draft` → `validate_draft` → `next_draft_step` → `extract_draft_subset`. The synced YAMLs are the red tests.
  - Then move the `*_ts_extras` draft viz cases into the canonical `mermaid.yml` and `cytoscape.yml`.
- **Abstraction:** keep `draft.py` as the single owner of the sentinel and `_plan_*` field constants. TS already checks drift via `check-draft-sentinel.mjs`.

### 3. Preserve unmapped PJAs on native→format2 — Py→TS, S

- **Area:** convert.
- **Bug:** TS `normalized/toFormat2.ts::_buildFormat2StepOutputs` drops PJAs it can't fold into `out:`, such as `ValidateOutputsAction` or PJAs with no `output_name`. It also creates an `out` entry keyed `undefined`, which serializes as `{}`. This affects every step type; the user-tool step also has no `post_job_actions` field.
  - Python returns `(out_list, remaining_pjas)` and sets the step's `post_job_actions`. That came in `6f936aa` (closes gxformat2 #206).
- **Evidence:** TS probe on `synthetic-step-post-job-actions.gxwf.yml` via `toFormat2(toNative(...))` gives `[{"out":[{}]}]`. Python gives `out=[]`, `post_job_actions=['ValidateOutputsAction']`.
- **Fixture:** exists. Coverage is missing only because `post_job_actions.yml` has no native→format2 case.
- **Red→green:** add `test_step_post_job_actions_via_native` to `post_job_actions.yml` in gxformat2. Use `operation: to_format2_via_native`, which exists on both sides once the sync branch lands, and assert:
  - `[steps, 0, post_job_actions, ValidateOutputsAction, action_type]`
  - `[steps, 0, out, $length] == 0`
  - Optionally add a merged-fixture variant. Green in Python now; red in TS until `remaining` passthrough is ported.

### 4. Sync and harness tooling hardening — TS, S

- **a.** `scripts/sync-manifest.json` workflow-fixtures has an entry for `gxformat2/examples/format2/draft/`. That dir is absent on Python main, so `make check-sync-workflow-fixtures` prints ERROR and exits 1, and can't be put in CI. Mark the entry optional (skip if the source is missing) until #219 merges.
- **b.** No sync check runs in `.github/workflows/ci.yml`; drift detection is manual. Add a job that checks out `galaxyproject/gxformat2@main`, then runs the `check-sync-{workflow-fixtures,workflow-expectations,schema-rules,lint-profiles,cytoscape-template}` targets and `check-sync-draft-sentinel`. EXTRA files are already tolerated. Consider making it non-blocking or scheduled so upstream merges don't break TS PRs.
- **c.** `declarative-normalized.test.ts` registers unknown operations as `it.fails` with a throwing body, and vitest counts that as a pass. Once #219's `validate_format2_draft*` cases sync, they'll look green with no implementation behind them. Make unknown ops a hard failure, or an explicit `UNSUPPORTED_OPERATIONS` skip.
- **Evidence:** `--check` run against `6cfdb58`. On main the report shows 5 MISSING fixtures and 4 DIVERGED plus 1 MISSING expectations (all fixed on the sync branch). The draft-dir ERROR shows on both main and the sync branch.

### 5. Report markdown validation in lint — Py→TS, M

- **Area:** lint.
- **Gap:** Python `lint.py::_validate_report` calls `markdown_parse.validate_galaxy_markdown` and reports the `ReportMarkdownInvalid` profile rule. TS `lint.ts::validateReport` only type-checks, with the comment `// Note: Galaxy markdown validation (```galaxy directives) not yet ported`.
- **Fixture:** only `test_lint_{format2,native}_report_clean` exist. Add `synthetic-lint-report-bad-markdown.{gxwf.yml,ga}` and cases in `lint_format2.yml` / `lint_native.yml` with `value_any_contains: "Report markdown validation failed"`. Green in Py, red in TS.
- **Abstraction:** port `markdown_parse` as a standalone TS module. Galaxy's client and the gxwf-ui editor could reuse it, rather than burying it in `lint.ts`. Python `tests/test_markdown_validate.py` cases could become a small declarative `markdown_validate` op on both sides.

### 6. Training-topic lint — Py→TS, S–M

- **Area:** lint.
- **Gap:** Python `_lint_training` emits missing-tag, wrong-topic, missing-doc and empty-doc warnings when `training_topic` is set. TS has the rule names in `lint_profiles.yml` but no implementation.
- **Harness:** declarative cases can't pass `training_topic`. Two options:
  - **(a)** Add an optional `options:` mapping to `TestCase` in both harnesses, passed to the operation. This is a reusable abstraction that would also unlock `ConversionOptions` cases that are stuck in imperative `test_normalized.py`.
  - **(b)** Add fixed-topic ops such as `lint_format2_training`.
  - Recommendation: (a).
- **Red→green:** new cases on existing fixtures with and without tags/doc, e.g. `synthetic-basic` versus a tagged one.

### 7. Promote Python imperative tests that cover shared behavior — Py→TS, S each

- **Candidates:**
  - `tests/test_inline_tool_roundtrip.py`: user-tool `tool_state`, `when`, `uuid` and `errors` preserved (from `4fa1a46`). TS already does this; the point is a shared guard.
  - `test_auto_label.py`
  - `test_post_job_action_import.py`
  - `test_comments.py`
  - `test_to_format2_model.py` / `test_to_native_model.py` where the result is structural
- **Approach:** most can use the existing `to_format2_via_native` and `ensure_*` ops. Task 3 is the proof this pays off: the PJA bug hid behind an imperative-only test.
- **Scope:** do one file per PR in gxformat2, then sync.

### 8. `gxwf layout` CLI command — TS, S (after the sync branch merges)

- The layout library is ported on the sync branch, but `packages/cli/src/commands/` has no layout command. The Python counterpart is `gxwf-layout` (`layout/_cli.py`: `--strategy topological|layered`, overwrite, recursive).
- **Test:** a CLI test on the `synthetic-basic` and `real-amr-gene-detection` fixtures, reusing `GRAPH_PROPERTY_CHECKERS`.

### 9. Upstream TS-local non-draft fixture/expectation — TS→Py or document, S

- `synthetic-import-run.gxwf.yml` exists only in TS, and `normalized_format2_ts_extras.yml` (4 cases) holds TS-only behavior:
  - `@import` normalized to a string
  - `@import`/URL `run` and native URL `content_id` pass through `expanded_*` without a resolver
- Python keeps `ImportReference` as an object and raises without a resolver. Decide the contract, then either converge one side or keep the cases as documented divergence.

## In-flight: `gxformat2_declarative_sync` (`fa52f6ee`, pushed, no PR)

- **Syncs:** all gxformat2 fixtures and expectations as of `6cfdb58`, including #255 input bounds (`to_format2.yml` ×4 new cases, `to_native.yml`) and `layout.yml`. Fixtures: `synthetic-crossing-reversed`, `synthetic-cycle`, `synthetic-numeric-input-bounds`, `real-amr-gene-detection.ga`, `synthetic-numeric-range-validators.ga`.
- **Ports:**
  - `layout.ts` (`applyLayout` / `layoutPositions`, topological and layered)
  - `layout-properties.ts` (`GRAPH_PROPERTY_CHECKERS`)
  - native best-practice step lint (annotation, label, untyped tool_state), which clears the `test_bp_native_untyped_param` behavior-divergence skip
  - `unlabeledNodeId` shared helper
- **Harness:** adds `graph_properties`, `value_falsy`, null-matches-undefined, and ops `to_format2_via_native` plus `layout_{,layered_}{format2,native}`. The TS op set now equals Python's plus the 4 draft ops.
- **Moves:** draft mermaid/cytoscape cases to `*_ts_extras.yml`, so the expectation sync check is clean (EXTRA only).
- **Verified:** the declarative suite gives 387 pass / 1 skip. `check-sync-workflow-expectations` exits 0. `check-sync-workflow-fixtures` exits 1, only because of the draft dir (task 4a).
- **Merge order:** merge this first. Tasks 1, 3 and 8 build on its files and ops.

## Unresolved questions

- Should abstract CWL export (`abstract.py`) be ported to TS or left Python-only?
- Is #219 to be rebased and finished, or restarted? Either way, should `next_draft_step` and the 2 TS-only draft fixtures be upstreamed with it?
- For `@import`/URL passthrough without a resolver, is the TS or the Python behavior canonical?
- Harness options: a generic `options:` on TestCase, or per-option ops?
- Should the CI sync check block TS PRs, or run scheduled/non-blocking?
- Should `KNOWN_PARSER_DIVERGENCES` (null-key YAML) stay a permanent TS skip, or should the fixture change to avoid null keys?
- Lint rule attribution: both sides wire only `NativeStepKeyNotInteger`. Should wiring the remaining profile rules be a joint task?
