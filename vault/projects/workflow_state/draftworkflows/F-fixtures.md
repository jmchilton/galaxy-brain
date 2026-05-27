# Workstream F — Fixtures & declarative expectation tests

## Goal

Lock the draft-checks contract (detect / validate / next-step / extract) into declarative YAML expectation files, the same pattern used by `validate_format2.yml`, `lint_format2.yml`, `normalized_format2.yml`. Each expectation case is `fixture → operation → assertions[]` — same runner, same vocabulary. The expectations become the language-neutral contract shared upstream with gxformat2 PR #219.

The CLI command tests (`draft-validate.test.ts`, `draft-next-step.test.ts`, `_draft-extract.test.ts`) stay as they are — thin smoke tests for I/O wiring, exit codes, and CLI-only concerns (text/JSON/HTML output mode routing, stdout-sink collisions). Behavior assertions move to the declarative tier where they're richer and cheaper.

## Why not goldens

The metaplan F (INDEX.md L185–203) originally hand-waved at "golden output" tests. The codebase strongly prefers declarative assertion files:

- 20+ expectation files under `packages/schema/test/fixtures/expectations/` already cover validate / normalize / lint / mermaid / cytoscape / ensure / to_format2 / to_native.
- Single runner (`declarative-normalized.test.ts`) with a shared assertion vocabulary (`value`, `value_contains`, `value_any_contains`, `value_set`, `value_type`, `value_truthy`, `value_matches`, `value_absent`, `$length` terminal, `{field: value}` find-in-list).
- The pattern is a port of gxformat2's `test_declarative_normalized.py`, so expectations move upstream without translation.
- Goldens pin whole serializations and fail noisily on incidental churn (key ordering, trailing whitespace). Declarative assertions check the facts that matter and stay quiet on the rest.

## Inputs

- Metaplan: [INDEX.md](./INDEX.md), workstream F section.
- Reference test runner: `packages/schema/test/declarative-normalized.test.ts`. `OPERATIONS` registry (L50–76), positive/negative dispatch (L149–174).
- Reference assertion vocabulary: `packages/schema/test/declarative-test-utils.ts`.
- Reference expectation files: `validate_format2.yml`, `lint_format2.yml`, `normalized_format2.yml`.
- Sync pipeline: `Makefile` targets `sync-workflow-fixtures` / `sync-workflow-expectations` / `check-sync-workflow-expectations`; manifest at `scripts/sync-manifest.json`.
- Existing draft fixtures: `packages/cli/test/fixtures/draft/synthetic-draft-{tool-step,plan-top-level,plan-subworkflow}.gxwf.yml`.
- Existing draft tests: `packages/cli/test/draft-validate.test.ts`, `draft-next-step.test.ts`, `_draft-extract.test.ts`; `packages/schema/test/draft-checks.test.ts`, `promote-draft.test.ts`, `report-models-draft.test.ts`.
- Locked decisions and conventions live in [INDEX.md](./INDEX.md) L22–39.

## Locked decisions (this subplan)

| Decision | Outcome |
|---|---|
| Testing pattern | **Declarative YAML expectation files**, not goldens. One operation per file, mirroring the `validate_format2.yml` / `lint_format2.yml` style. |
| Fixture naming | **`synthetic-` prefix kept.** Established gxformat2 convention; metaplan's `draft-valid-simple.yml`-style names were hand-wave naming. New fixtures: `synthetic-draft-<descriptor>.gxwf.yml`. |
| Fixture location | **`packages/schema/test/fixtures/workflows/format2/draft/`** — new `draft/` subdir under `format2/` for hygiene. Existing 3 fixtures move out of `packages/cli/test/fixtures/draft/`. |
| Negative-case shape | **Assert on result paths directly** (lint pattern), no `expect_error` flag. `expect_error` stays reserved for operations that throw. `validateDraft` is documented as *"Collects all diagnostics — does not throw"* (draft-checks.ts L251), so `validate_draft.yml` follows `lint_format2.yml`: `[error_count]`, `[errors, 0]: value_contains "..."`. |
| Extract-result shape | **Assert on full surviving workflow shape** via per-key paths, not just step-label sets. Catches structural regressions on survivors (lost `state:` blocks, mangled `in:` entries) that set assertions miss. Consistent with how `normalized_format2.yml` already asserts. |
| Snake-case wrapper | **Yes — wrap `validateDraft` and `detectDraft` in the OPERATIONS registry** so paths in expectation files are snake_case across all four draft ops. `NextStepResult` and `ExtractResult` are already snake_case; only `DraftValidationResult` and `DraftSurvey` are camelCase. Tiny `toSnakeCaseKeys` helper lives in `declarative-test-utils.ts`. (Alternative refactor — change the result types to snake_case directly — flagged as open question, not done in F.) |
| `next_draft_step_work_lines` op variant | **Punt.** Revisit if `[work, 0]: value_contains` paths feel awkward when writing F5. Not in v1. |
| Upstreaming | **Bundle into existing gxformat2 PR #219.** Fixtures + expectation YAMLs + Python helpers for the ops gxformat2 needs (`detect_draft`, `validate_draft`). `next_draft_step` / `extract_draft_subset` stay TS-only (locked decision: Python parity deferred). |
| `_ts_extras.yml` suffix | **Not used.** Expectations are canonical from day one. If gxformat2 PR #219 lags, `check-sync-workflow-expectations` is allowed to fail locally until the upstream PR catches up. |
| Cross-check (draft ⊇ concrete) | **Dropped.** F7 removed. `validate_format2` (lax) injects `class: GalaxyWorkflow` over the draft class and drops `_plan_*` via `onExcessProperty: ignore` — the cross-check fixture would prove nothing about the lax decoder. `validate_format2_strict` rejects `class: GalaxyWorkflowDraft` outright. No single fixture satisfies both validators meaningfully. |
| `_plan_*` on a step with no TODO sentinels | **`validateDraft` emits semanticError.** Locked decision in INDEX.md L284 was inaccurate ("schema-enforced"). `DraftWorkflowStep` accepts `_plan_*` unconditionally and `validateDraft` had no per-step check — only the extract layer dropped via `step_has_plan_field`. F4 adds the missing semanticError so the validate / extract contracts agree. |
| CLI command tests | **Stay as they are.** Thin smoke tests for exit codes, text/JSON/HTML routing, and CLI-only failure modes (`--report-json` to stdout collision, etc.). Behavior assertions move to the declarative tier. |

## Steps

### F1. Fixture audit (done)

| # | Metaplan name | Status | Target fixture (under `format2/draft/`) |
|---|---|---|---|
| 1 | draft-valid-simple | done | `synthetic-draft-tool-step.gxwf.yml` (existing) |
| 2 | draft-valid-chain | missing | `synthetic-draft-chain.gxwf.yml` |
| 3 | draft-valid-subworkflow (inner *draft*) | needs-extract-from-inline | `synthetic-draft-subworkflow-inner-draft.gxwf.yml` |
| 4 | draft-invalid-todo-label | needs-extract-from-inline | `synthetic-draft-bad-todo-label.gxwf.yml` |
| 5 | draft-invalid-dangling-edge | needs-extract-from-inline | `synthetic-draft-bad-dangling-edge.gxwf.yml` |
| 6 | draft-invalid-plan-on-concrete | missing | `synthetic-draft-bad-plan-on-concrete.gxwf.yml` |
| 7 | draft-valid-plan-on-subworkflow | done (extract-drops; encode in expectation) | `synthetic-draft-plan-subworkflow.gxwf.yml` (existing) |
| 8 | draft-extract-cascade | needs-extract-from-inline | `synthetic-draft-extract-cascade.gxwf.yml` |
| 9 | draft-fully-concrete | needs-extract-from-inline | `synthetic-draft-fully-concrete.gxwf.yml` |
| 10 | draft-next-step-topological-tiebreak | needs-extract-from-inline | `synthetic-draft-next-step-tiebreak.gxwf.yml` |

Plus existing `synthetic-draft-plan-top-level.gxwf.yml` (warning case, not in the 10) — keep and move.

Inline heredocs that intentionally stay inline (CLI-only concerns): survey-line pluralization (validate.test L52–67), parse-failure exit codes, `--format native` rejection, `--json + --report-html` stdout collision, hidden-command help filtering, markdown output rendering.

### F2. Move + reorganize fixtures (both sides — TS + upstream gxformat2)

The 3 existing draft fixtures already exist upstream (gxformat2 commit 58c8e95, in PR #219) flat in `gxformat2/examples/format2/`. To keep sync valid with the `draft/` subdir convention we want, both repos move in step.

Upstream gxformat2 (carry-along on the existing #219 branch):
- `git mv gxformat2/examples/format2/synthetic-draft-*.gxwf.yml gxformat2/examples/format2/draft/`.
- Update `gxformat2/examples/catalog.yml` — 3 entries change from `format2/...` to `format2/draft/...`.
- Extend `gxformat2/examples/__init__.py::get_path` to walk `format2/draft/` (or recursively walk `format2/`) so bare-name `load("synthetic-draft-tool-step.gxwf.yml")` still resolves. Existing callers in `tests/test_pydantic_schema.py` and `examples/expectations/validate_format2.yml` stay unchanged.

TS side:
- Create `packages/schema/test/fixtures/workflows/format2/draft/`.
- `git mv` the 3 existing TS fixtures from `packages/cli/test/fixtures/draft/` into the new dir.
- Lift `needs-extract-from-inline` heredocs from F1 audit out into `synthetic-draft-*.gxwf.yml` files under the new dir (deferred to F3).
- Update CLI test fixture paths (`FIXTURE_DIR` constants in the 3 CLI test files).
- Extend `loadWorkflow()` in `declarative-normalized.test.ts` (L98–110) to walk the new `draft/` subdir. Prefer a recursive walk under `format2/` rather than a hard-coded subdir list — future-proofs the runner.
- Add a new entry to `scripts/sync-manifest.json` for `gxformat2/examples/format2/draft/` → `packages/schema/test/fixtures/workflows/format2/draft/` with `synthetic-draft-*.gxwf.yml` pattern.

### F3. Fill missing fixtures

Per F1 audit. All in `format2/draft/`, all with `synthetic-` prefix:

Positive cases:
- **`synthetic-draft-chain.gxwf.yml`** — 3 tool steps `a → b → c`, step `a` concrete, `b` and `c` have `tool_id: TODO`. Used by `validate_draft` (clean), `next_draft_step` (returns `b`), `extract_draft_subset` (returns workflow with only `a`).
- **`synthetic-draft-subworkflow-inner-draft.gxwf.yml`** — outer concrete tool step + inner subworkflow whose own tool step is still draft. Exercises step path `[outer, inner]`. Distinct from existing `synthetic-draft-plan-subworkflow.gxwf.yml` (which has a concrete inner).
- **`synthetic-draft-extract-cascade.gxwf.yml`** — step `B` concrete, step `B`'s `in:` sources from step `A`, step `A` has `tool_id: TODO`. Used to assert cascade drop + drop-report reason `cascaded` for `B`.
- **`synthetic-draft-fully-concrete.gxwf.yml`** — `class: GalaxyWorkflowDraft`, zero TODOs and zero `_plan_*` fields. Used by `validate_draft` (clean), `next_draft_step` (`{draft: false}`), `extract_draft_subset` (identity).
- **`synthetic-draft-next-step-tiebreak.gxwf.yml`** — two unresolved tool steps at the same topological level, labels chosen so alphabetical tie-break is observable.

Negative cases (lifted from inline heredocs):
- **`synthetic-draft-bad-todo-label.gxwf.yml`** — `steps: { TODO: {...} }`. Used by `validate_draft` (topology error: step label cannot be a TODO sentinel).
- **`synthetic-draft-bad-dangling-edge.gxwf.yml`** — `in:` references nonexistent step. Used by `validate_draft` (topology error: source references unknown step).
- **`synthetic-draft-bad-plan-on-concrete.gxwf.yml`** — fully-resolved step still carries `_plan_state`. Used by `validate_draft` (semantic error — see F4) and `extract_draft_subset` (drops with `step_has_plan_field`).

Each fixture is YAML-only. No code change.

### F4. Register draft operations in the runner + close the plan-on-concrete enforcement gap

**B-tier addition (must land before F5 expectation entries can pass):** in `packages/schema/src/workflow/draft-checks.ts`, extend `validateDraft` to emit a semanticError when a step carries any `_plan_*` field but no TODO sentinels. Path: the step's `StepPath`. Message: ``step "<label>" has _plan_<field> but no TODO sentinels — planning fields belong on drafty steps only``. This closes the contradiction flagged in the locked-decisions table (INDEX.md L284 was inaccurate). Add a vitest case in `draft-checks.test.ts` mirroring the new behavior. Update `report-models-draft.test.ts` if the surface changes.

In `packages/schema/test/declarative-normalized.test.ts`, extend `OPERATIONS`:

```ts
detect_draft: (raw) => toSnakeCaseKeys(detectDraft(raw)),
validate_draft: (raw) => toSnakeCaseKeys(validateDraft(raw)),
next_draft_step: (raw) => nextDraftStep(raw),
extract_draft_subset: (raw) => extractConcreteSubset(raw),
```

Add `toSnakeCaseKeys` to `declarative-test-utils.ts` — deep, simple recursive helper, only used by these two ops. Punt on `next_draft_step_work_lines` variant.

`expect_error` is not used for any of these — all four ops return structured results.

### F5. Write expectation YAMLs

Four new files under `packages/schema/test/fixtures/expectations/`:

- **`detect_draft.yml`** — per fixture assert `[todo_count]`, `[todo_paths, $length]`, `[plan_step_labels, $length]`, `[plan_step_labels, 0]`. Include `synthetic-draft-plan-top-level.gxwf.yml` asserting `[plan_step_labels, $length]: 0` to lock the "survey is per-step only" contract.
- **`validate_draft.yml`** — positive cases assert `[ok]: true`, `[structure_errors, $length]: 0`, `[topology_errors, $length]: 0`, `[semantic_errors, $length]: 0`. Negative cases assert specific category counts and `value_contains` over the message body (lint pattern). One case per negative fixture (`todo-label`, `dangling-edge`, `plan-on-concrete`). Plus a passing-with-warning case: `synthetic-draft-plan-top-level.gxwf.yml` asserts `[ok]: true`, `[warnings, $length]: 1`, `[warnings, 0]: value_contains "top-level"`.
- **`next_draft_step.yml`** — `[draft]`, `[step]` array, `[work, $length]`, `[work, 0]: value_contains "TODO[tool_id]"`, etc. Tiebreak fixture asserts the chosen `[step, 0]` label.
- **`extract_draft_subset.yml`** — surviving workflow shape via per-key paths. Path syntax adapts to fixture shape (dict-form steps → `[workflow, steps, A, ...]`; list-form → `[workflow, steps, {label: A}, ...]`). Vocabulary:
  - `[workflow, steps, $length]`
  - `[workflow, steps, <label>, tool_id]`
  - `[workflow, steps, <label>, in, input1]`
  - `[workflow, outputs, $length]`
  - Drop-report: `[dropped_steps, $length]`, `[dropped_steps, {label: B}, reason, kind]: cascade`, `[dropped_outputs, $length]`, `[rewritten_step_inputs, $length]`.
  - Cover `synthetic-draft-plan-subworkflow.gxwf.yml` — the outer step carries `_plan_context` on top of a concrete inner; expect the outer step to drop with `step_has_plan_field` (encodes the v1-allowed open question that L180-181 flagged).

Naming convention `test_draft_<descriptor>_<expectation>:` so the test id reads like a contract sentence.

### F6. Bundle into gxformat2 PR #219 (minimal scope)

In worktree `~/projects/worktrees/gxformat2/branch/abstraction_applications`, on top of PR #219:

- F2 + F3 fixture work mirrored upstream: 3 existing draft fixtures `git mv`'d into `gxformat2/examples/format2/draft/`; 8 new fixtures copied alongside; `gxformat2/examples/catalog.yml` updated with 9 new entries; `gxformat2/examples/__init__.py::get_path` extended to recursive `os.walk`; `tests/test_examples_catalog.py::_all_example_files` switched to recursive `**/*.gxwf.yml` glob.
- F5 carry-along: `detect_draft.yml` + `validate_draft.yml` mirrored into `gxformat2/examples/expectations/`.
- Python ports DEFERRED (per INDEX.md L34 locked decision). Both ops registered in `tests/test_interop_tests.py` OPERATIONS as `pytest.skip(...)` stubs so the cases stay visible in the suite (currently 18 skipped — 7 detect + 11 validate). When the Python helpers land in a follow-up, swap the stubs for real implementations.
- `next_draft_step.yml` / `extract_draft_subset.yml` stay TS-only — not mirrored. `check-sync-workflow-expectations` will report them as EXTRAs against upstream until either the upstream catches up or the manifest is taught to allow TS-only files. Surface this in the commit body.

### F7. Subplan doc + `(TBD)` removal (this section)

(Original F7 was a cross-check expectation; dropped because no single fixture satisfies both `validate_draft` and `validate_format2` meaningfully — see locked decision row.)

#### Final state — landed inventory

**Fixtures under `packages/schema/test/fixtures/workflows/format2/draft/`** (mirrored at `gxformat2/examples/format2/draft/`):

Existing (3, moved): `synthetic-draft-tool-step.gxwf.yml`, `synthetic-draft-plan-top-level.gxwf.yml`, `synthetic-draft-plan-subworkflow.gxwf.yml`.

New (8): `synthetic-draft-chain.gxwf.yml`, `synthetic-draft-subworkflow-inner-draft.gxwf.yml`, `synthetic-draft-extract-cascade.gxwf.yml`, `synthetic-draft-fully-concrete.gxwf.yml`, `synthetic-draft-next-step-tiebreak.gxwf.yml`, `synthetic-draft-bad-todo-label.gxwf.yml`, `synthetic-draft-bad-dangling-edge.gxwf.yml`, `synthetic-draft-bad-plan-on-concrete.gxwf.yml`.

**Expectation files under `packages/schema/test/fixtures/expectations/`** (TS authoritative; `detect_draft.yml` + `validate_draft.yml` mirrored upstream):

| File | Cases | What it locks |
|---|---|---|
| `detect_draft.yml` | 7 | survey shape (`is_draft`, `todos`, `plan_fields`); subworkflow path prefixing; per-step-only contract |
| `validate_draft.yml` | 11 | `ok` flag + per-category counts; top-level `_plan_*` warning; v1 carveout for non-tool steps; 3 negatives (todo-label, dangling-edge, plan-on-concrete) |
| `next_draft_step.yml` | 8 | locked work-order; topological pick + alphabetical tiebreak; subworkflow descent; `{draft: false}` on non-draft and fully-resolved cases |
| `extract_draft_subset.yml` | 8 | step survival shape; cascade ordering; subworkflow inner shrink + outer-output cascade; `step_has_plan_field` drop |

**Metaplan named case → expectation test id mapping:**

| Metaplan name | Fixture | Asserted by |
|---|---|---|
| draft-valid-simple | `synthetic-draft-tool-step` | `test_detect_draft_tool_step_*`, `test_validate_draft_tool_step_clean`, `test_next_draft_step_tool_step_*`, `test_extract_draft_tool_step_*` |
| draft-valid-chain | `synthetic-draft-chain` | `test_detect_draft_chain_*`, `test_validate_draft_chain_clean`, `test_next_draft_step_chain_*`, `test_extract_draft_chain_*` |
| draft-valid-subworkflow | `synthetic-draft-subworkflow-inner-draft` | `test_detect_draft_subworkflow_*`, `test_validate_draft_subworkflow_inner_draft_clean`, `test_next_draft_step_subworkflow_*`, `test_extract_draft_subworkflow_*` |
| draft-invalid-todo-label | `synthetic-draft-bad-todo-label` | `test_validate_draft_bad_todo_label_topology_error` |
| draft-invalid-dangling-edge | `synthetic-draft-bad-dangling-edge` | `test_validate_draft_bad_dangling_edge_two_topology_errors` |
| draft-invalid-plan-on-concrete | `synthetic-draft-bad-plan-on-concrete` | `test_validate_draft_bad_plan_on_concrete_semantic_error`, `test_extract_draft_bad_plan_on_concrete_drops_step` |
| draft-valid-plan-on-subworkflow | `synthetic-draft-plan-subworkflow` | `test_detect_draft_plan_subworkflow_*`, `test_validate_draft_plan_on_subworkflow_step_clean_v1_carveout`, `test_next_draft_step_plan_subworkflow_*`, `test_extract_draft_plan_subworkflow_drops_outer_plan_step` |
| draft-extract-cascade | `synthetic-draft-extract-cascade` | `test_validate_draft_extract_cascade_clean`, `test_extract_draft_cascade_*` |
| draft-fully-concrete | `synthetic-draft-fully-concrete` | `test_detect_draft_fully_concrete_*`, `test_validate_draft_fully_concrete_clean`, `test_next_draft_step_fully_concrete_*`, `test_extract_draft_fully_concrete_*` |
| draft-next-step-topological-tiebreak | `synthetic-draft-next-step-tiebreak` | `test_validate_draft_tiebreak_clean`, `test_next_draft_step_tiebreak_alphabetical`, `test_extract_draft_tiebreak_*` |

Plus the `synthetic-draft-plan-top-level.gxwf.yml` warning fixture is locked by `test_detect_draft_plan_top_level_*`, `test_validate_draft_plan_top_level_passes_with_warning`, `test_next_draft_step_plan_top_level_*`.

**gxformat2 PR #219 carry-along status:**

- Schema fields (`class: GalaxyWorkflowDraft`, `_plan_*` on draft step): already landed upstream (commit 58c8e95).
- Fixtures: 11 fixtures mirrored under `gxformat2/examples/format2/draft/`.
- Expectations: `detect_draft.yml` + `validate_draft.yml` mirrored under `gxformat2/examples/expectations/`.
- Python helpers: NOT ported (deferred — INDEX.md L34). Upstream pytest skips the 18 corresponding cases via `_skip_unported_op` stubs in `tests/test_interop_tests.py`.

**Open items left for follow-up (not in F's scope):**

- Port `detect_draft` + `validate_draft` to Python (~250 lines, including F4's plan-on-concrete semantic check). Tracked as a v2 follow-up; let downstream usage drive priority.
- Decide upstream handling of `next_draft_step` + `extract_draft_subset` — port to Python or surface them as TS-extras with a manifest carve-out.
- INDEX.md L284's "schema-enforced" claim is now superseded by F4's semantic check — a one-line correction is owed on the metaplan when F lands.
- Refactor `DraftValidationResult` / `DraftSurvey` to snake_case keys directly (drops the `toSnakeCaseKeys` wrap). Defer until a CLI report-builder change touches the same surface.

## Sequencing

```
F1 (audit, done — above)
  └─→ F2 (move fixtures, update loadWorkflow + sync-manifest)
       └─→ F3 (fill missing fixtures — 5 positive + 3 negative)
            └─→ F4 (register ops + toSnakeCaseKeys + add plan-on-concrete semanticError to validateDraft)
                 └─→ F5 (write 4 expectation YAMLs, parallelizable per file)
                      └─→ F7 (subplan doc finalization)

  Parallel from F3 onward:
  └─→ F6 (gxformat2 PR #219 carry-along)
```

F2 is the only structural commit; F4 has a small B-tier code addition; F3, F5, F6 are mostly YAML.

## Pipeline / commands

- `pnpm -F @galaxy-tool-util/schema test packages/schema/test/declarative-normalized.test.ts` — exercise expectation files after F4.
- `make check-sync-workflow-expectations` — pre-PR drift check (will fail until F6 lands upstream).
- `make sync-workflow-fixtures && make sync-workflow-expectations` — after #219 merge, pull canonical state from gxformat2.
- `make test` — full repo verification before commit.

## Acceptance criteria (status)

- ✅ All 10 metaplan-named cases (INDEX.md L191–202) have a corresponding `synthetic-draft-*.gxwf.yml` fixture under `format2/draft/`. (See F7 inventory.)
- ✅ Four expectation files exist for the four draft operations (`detect_draft.yml`, `validate_draft.yml`, `next_draft_step.yml`, `extract_draft_subset.yml`) with positive and (for `validate_draft` / `extract_draft_subset`) negative cases.
- 🗑 The "draft ⊇ concrete" invariant was DROPPED — no fixture satisfies both validators meaningfully (see locked decision row).
- ✅ gxformat2 PR #219 carries the fixtures + `detect_draft.yml` / `validate_draft.yml`. Python helpers deferred (skip stubs in upstream `tests/test_interop_tests.py`).
- ✅ `make test` green; `make check` green. `make check-sync-workflow-expectations` will flag `next_draft_step.yml` + `extract_draft_subset.yml` as EXTRAs until upstream catches up or the manifest is taught to allow TS-only files.

## Open questions (resolved)

All F open questions resolved during execution. Outstanding cross-workstream follow-ups are listed under F7's "Open items left for follow-up" section.
