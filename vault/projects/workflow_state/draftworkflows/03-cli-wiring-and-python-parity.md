# Draft Workflows — CLI Wiring & Python Parity Survey

## TL;DR / Recommendation

Wire all three `draft-*` commands as plain entries in `packages/cli/spec/gxwf.json` + matching handler files under `packages/cli/src/commands/`, registered in `packages/cli/src/programs/gxwf.ts`. Skip a `draft-validate-tree` for v1: only `draft-validate` (single file) is justified by the existing convention; `draft-next-step` and `_draft-concrete-subset` are inherently single-file. Defer Python parity — the Python side already has a `gxwf` umbrella and shares fixture pipelines, but no "draft workflow" concept exists in either codebase today, and forcing parity now would block on Python design decisions that don't yet exist. After landing, run `make gen-skill` and add a changeset.

## 1. The CLI surface is fully spec-driven

`packages/cli/spec/gxwf.json` (lines 25-750) is the single source of truth for the command surface: each command lists `name`, `description`, `handler` (a registry key, camelCase), `args`, `options`, and optional `optionGroups` references (only `strict` is defined today, at lines 6-23). `packages/cli/src/spec/build-program.ts:13` walks that spec into a commander `Command`, validating up-front (lines 30-58) that:
- command names are unique,
- handler keys exist in the registry,
- option `attributeName` (commander-camelCased long-flag) is unique per command,
- referenced `optionGroups` exist.

Spec-shape types live at `packages/cli/src/meta/spec-types.ts`; the JSON is imported with `with { type: "json" }` in `packages/cli/src/meta/specs.ts:6`. Adding a new command means appending an object to the `commands` array and adding the handler in `packages/cli/src/programs/gxwf.ts:32-82`. There is no separate help-text or argparse plumbing — commander reads it all from the spec.

The handler signature is what commander hands the action callback: `(arg1, arg2, ..., opts: Record<string, unknown>, cmd: Command)`. Most existing handlers simplify to `(file: string, opts: SomeOptions)` and let TS coerce the camelCased options object. Two entries (`mermaid`, `cytoscapeJs`, lines 39-68) demonstrate the explicit-arity wrapper pattern when there's a second positional or option remapping is needed.

## 2. Representative command control flow

Take `runValidateWorkflow` in `packages/cli/src/commands/validate-workflow.ts:81-224` as the canonical shape:

1. **I/O**: `readWorkflowFile(filePath)` + `resolveFormat(data, opts.format)` from `workflow-io.ts` — early-return on parse errors.
2. **Strict gates**: `resolveStrictOptions(opts)` from `strict-options.ts` collapses `--strict / --strict-structure / --strict-encoding / --strict-state` into a `ResolvedStrictOptions` struct.
3. **Validation**: structural decode via Effect `S.decodeUnknownEither(schema, { onExcessProperty: "ignore" })` (line 67), unwrapping the `Either` (`result._tag === "Left"` → format issues via `ParseResult.ArrayFormatter.formatErrorSync`, lines 52-55). Tool-state validation walks normalized native/format2 steps (`validateNativeSteps`/`validateFormat2Steps`, lines 248+, 364+).
4. **Tool cache**: `makeNodeToolCache({ cacheDir })` from `@galaxy-tool-util/core/node` + `loadCachedTool` from `./resolve-tool.js`.
5. **Emit**: three modes branching on `opts.json` / `opts.reportHtml`:
   - text: `console.log`/`console.error` lines (lines 132-141, 210-221),
   - JSON: `buildSingleValidationReport(...)` + `JSON.stringify(report, null, 2)` (line 188-196),
   - HTML: `writeReportHtml("validate", report, opts.reportHtml)` from `report-output.ts` (line 198).
6. **Exit code**: `process.exitCode = structOk && stateOk && connectionsOk ? 0 : 1;` (line 199, 223). Strict failures use `2`.

`runLint` in `packages/cli/src/commands/lint.ts:74-195` follows the same shape but pulls more from `@galaxy-tool-util/schema` (`lintWorkflow`, `lintBestPracticesNative/Format2`, `buildSingleLintReport`) and exposes a pure `lintWorkflowReport(...)` separation (line 198) — the CLI handler is a thin shell over a pure-logic function that takes already-loaded data + cache. **This is the pattern to follow for new commands**: keep the pure logic in `@galaxy-tool-util/schema` and let `packages/cli/src/commands/draft-*.ts` be I/O + reporting glue.

## 3. Report models + Effect `Either` unwrap convention

`packages/schema/src/workflow/report-models.ts` is mirror-mode parity with Python `galaxy.tool_util.workflow_state._report_models` (header comment lines 1-10). Field names are snake_case TS interfaces (not Effect Schemas — they're plain TS shapes serialized via `JSON.stringify`). Each report family has:
- a step-level result (`ValidationStepResult` line 23, `CleanStepResult` line 31),
- a single-workflow wrapper (`SingleValidationReport` line 100, `SingleLintReport` line 111, `SingleCleanReport` line 129),
- a tree wrapper + per-workflow tree entry (`TreeValidationReport` line 326, `WorkflowValidationResult` line 284),
- builder helpers at the bottom (`buildSingleValidationReport` line 441, `buildTreeValidationReport` line 644, etc.).

A new `draft-validate` command should add a `SingleDraftValidationReport` (or reuse `SingleValidationReport` if shape coincides) plus a builder. Mirror snake_case so Python parity is cheap later. `draft-next-step` should probably define a new `NextStepSuggestion` interface — it's a recommendation surface, not a validation surface. `_draft-concrete-subset` is leading-underscore (internal/debug) — its report shape can be lightweight (a `ConcreteSubsetResult` with `concrete_steps: string[]` + `draft_steps: string[]` would be enough).

Effect `Either` unwrap is uniform: `S.decodeUnknownEither(schema, { onExcessProperty: "ignore" })(data)` → check `_tag === "Left"`, run `ParseResult.ArrayFormatter.formatErrorSync(error)` to flatten into `{ path, message }[]`, then `i.path.join(".") + ": " + i.message` (see `formatIssues` at `validate-workflow.ts:52-55`).

## 4. Report output (text / JSON / HTML / Markdown)

`packages/cli/src/commands/report-output.ts` is the centralized emitter:
- `writeReportHtml(type, data, dest, title?)` (line 85): renders a CDN-bootstrapped HTML page that hands the JSON payload to `@galaxy-tool-util/gxwf-report-shell` (pinned at `0.1.0`, line 9). `dest === true` or `"-"` writes to stdout.
- `writeReportOutput(templateName, report, opts)` (line 40): Markdown via Jinja2-style templates in `workflow/report-templates`.
- `ReportType` literal at line 12-19 — extend if you add a tree variant: add `"draft-validate-tree"` etc.

For single-file `draft-*` commands you need only HTML (matching `validate` / `lint` / `clean`). Markdown reports are tree-only by current convention.

## 5. Tree pattern (`tree.ts` orchestrator)

`packages/cli/src/commands/tree.ts:1-80` defines a generic `collectTree<T>(dir, processOne)` plus `WorkflowInfo`, `WorkflowOutcome<T>`, `TreeResult<T>`, and a `skipWorkflow(reason)` helper that throws a sentinel for the orchestrator to catch. Its docstring (line 9) says this "Mirrors Python's `_tree_orchestrator.py` pattern". `validate-tree.ts:37-142` is a clean reference: build cache once, lazy-load json-schema mode, call `collectTree`, `buildTreeValidationReport`, then write all three output modes.

**Recommendation for draft commands**: skip `draft-validate-tree` in v1. The single-file `draft-validate` is the canonical entry point; users iterating on a single draft workflow don't need batch operations yet, and the tree orchestrator adds non-trivial reporting shape (categories, summaries). It can be added later by adding a `validateTreeDraft` command spec entry + handler. `draft-next-step` and `_draft-concrete-subset` are inherently single-workflow (they suggest/expand one workflow's next move) — no tree variant needed.

## 6. Skill regeneration

`docs/skills/gxwf-cli/SKILL.md` is fully auto-generated from commander introspection by `packages/cli/scripts/generate-cli-skill.mjs` (header comment lines 1-9). It imports `buildGxwfProgram` / `buildGalaxyToolCacheProgram` from `dist/programs/*.js` (lines 14-15) — so **the regen requires a build first**. Trigger: `make gen-skill` (root `Makefile:30-33`), which runs `pnpm --filter @galaxy-tool-util/cli build` then `node packages/cli/scripts/generate-cli-skill.mjs`. The generator walks `program.commands`, dumps each command's args + options table, and writes a single markdown page with frontmatter (lines 21-25). **No hand-editing**.

## 7. Workflow for adding a `gxwf` command (minimal delta)

Per command:
1. Append a spec entry to `packages/cli/spec/gxwf.json` (mirror an existing single-file command — `validate` at lines 26-72 is the closest analog for `draft-validate`). Use `optionGroups: ["strict"]` if strict checks apply.
2. Create `packages/cli/src/commands/draft-validate.ts` exporting `runDraftValidate(file, opts)` (and similarly `draft-next-step.ts`, `_draft-concrete-subset.ts` — note the underscore-prefix bin name maps to a `draftConcreteSubset` registry key; commander will preserve the dash form in the CLI but the handler key is camelCase).
3. Add the import + registry entry in `packages/cli/src/programs/gxwf.ts:32-82`.
4. If new report shapes are needed, add interfaces + builders to `packages/schema/src/workflow/report-models.ts` and re-export from `packages/schema/src/workflow/index.ts`.
5. Add a vitest at `packages/cli/test/draft-*.test.ts` matching the existing pattern.
6. `make check && make test`.
7. `make gen-skill` to refresh `docs/skills/gxwf-cli/SKILL.md`.
8. `pnpm changeset` (per project `CLAUDE.md`, required for `packages/*/src/` changes).

The `_draft-concrete-subset` leading-underscore convention — by Python's `_cli_common`/`_report_models` precedent — signals "internal, not promoted to top-level help." Commander doesn't have a hidden-command flag in spec form; you'd either accept the help visibility or add a `hidden: true` field to `SpecCommand` and `buildCommand` to call `cmd.helpCommand(false)`/the right commander API. That's a small spec-types extension if you want it; otherwise just live with it appearing in `gxwf --help`.

## 8. Python parity assessment

The Python `gxwf` umbrella exists: `lib/galaxy/tool_util/workflow_state/scripts/gxwf.py:25-44` imports per-subcommand modules (`workflow_validate`, `workflow_lint_stateful`, `workflow_clean_stale_state`, `workflow_roundtrip_validate`, plus `_tree` variants and the four toolshed search ones). Each subcommand module follows a fixed contract (e.g. `workflow_validate.py:43-58`): `SUBCOMMAND` constant, `_add_args(parser)`, `build_parser()` (for the standalone entry point), `register(subparsers)` (for the umbrella). Argparse-based, not click/typer. Tree variants live in separate modules (e.g. `workflow_validate_tree.py`).

The pure logic lives outside `scripts/`: `validate.py`, `lint_stateful.py`, `clean.py`, `roundtrip.py` etc. — and report shapes are in `_report_models.py`, mirrored exactly by `packages/schema/src/workflow/report-models.ts:1-10`.

There is **no "draft" concept on the Python side either** — `grep "draft"` returns no hits in `workflow_state/`. So Python parity would be net-new code in both languages, not a port.

**Recommendation: defer Python parity.** Reasons:
- The TS side has converged ahead on workflow editing (`step-skeleton.ts`, `minimal-tool-state.ts`, `fill-defaults.ts`) — these enable draft-workflow semantics in TS that don't yet exist in Python.
- "Draft" is presumably a workflow-authoring concept (incomplete tool steps with placeholder state, gradual concretization). Python has no `step-skeleton` analog yet, so Python `draft-validate` would need port-the-skeleton-first.
- The fixture pipeline already syncs in both directions — once Python catches up, parity tests + report-shape-mirroring become cheap.
- Land the TS commands first as a working reference (snake_case report shapes already match Python conventions), then write the Python port as a follow-up with the TS report-model file as the spec. The Python side already has `_report_models.py` as the authoritative shape — adding three new dataclasses there + three argparse modules is mechanical once the TS design stabilizes.

If you want to set up the Python side defensively at the same time, the minimum is: append snake_case mirror types to `_report_models.py` and stub out empty `workflow_draft_validate.py` / `workflow_draft_next_step.py` / `workflow_draft_concrete_subset.py` modules (with `register()` that raises `NotImplementedError`). That's ~30 lines of Python and keeps the namespace reserved. But it's not strictly required.

## 9. Key file paths (for the metaplan)

- Spec: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/packages/cli/spec/gxwf.json`
- Spec → commander glue: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/packages/cli/src/spec/build-program.ts`
- Handler registry: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/packages/cli/src/programs/gxwf.ts`
- Commands dir (add new files here): `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/packages/cli/src/commands/`
- Tree orchestrator: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/packages/cli/src/commands/tree.ts`
- Strict-options helper: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/packages/cli/src/commands/strict-options.ts`
- Report output emitters: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/packages/cli/src/commands/report-output.ts`
- Report shapes + builders: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/packages/schema/src/workflow/report-models.ts`
- Step skeleton (reuse for draft logic): `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/packages/schema/src/workflow/step-skeleton.ts`
- Skill regen: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/packages/cli/scripts/generate-cli-skill.mjs` (run via `make gen-skill`)
- Generated skill: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/docs/skills/gxwf-cli/SKILL.md`
- Python `gxwf` umbrella: `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/workflow_state/scripts/gxwf.py`
- Python report shapes (parity target): `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/workflow_state/_report_models.py`
- Python single-cmd reference: `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/workflow_state/scripts/workflow_validate.py`

## 10. Open questions to resolve before implementation

- Do `draft-validate` and friends need their own `optionGroup` (`draft`?) or can they reuse `strict` (lines 6-23)? Likely they need their own controls (e.g. `--accept-incomplete-tool-state`).
- Should `_draft-concrete-subset` be hidden from `gxwf --help`? If yes, extend `SpecCommand` with `hidden?: boolean` in `packages/cli/src/meta/spec-types.ts` + handle in `build-program.ts`.
- Report-model field naming: confirm snake_case (matches existing `report-models.ts` policy) even though no Python counterpart exists yet — pre-paving for the eventual Python port.
- Bin entry: does `packages/cli/package.json` need anything? Single `gxwf` bin already covers everything via subcommands, so no.
