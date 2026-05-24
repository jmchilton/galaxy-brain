# Workstream E — CLI command `gxwf _draft-extract`

## Goal

Wire `extractConcreteSubset` (workstream B) behind a hidden `gxwf _draft-extract` CLI command. Emit the trimmed workflow (YAML to stdout or `-o file`) and an optional sidecar JSON report listing drops + rewrites. The command is the agent-loop "freeze what's concrete so far" step.

## Inputs

- Metaplan: [INDEX.md](./INDEX.md) (commands section L163–181; locked decisions L26–40).
- Subplan B (landed): provides `extractConcreteSubset(workflow): ExtractResult` with `dropped_steps`, `dropped_outputs` (now carrying `path`), `rewritten_step_inputs`.
- Subplan B notes (L168 in B-ts-draft-checks.md): "Promoting an extract output from `class: GalaxyWorkflowDraft` → `class: GalaxyWorkflow` when zero drops occurred — E decides."
- Reference commands: `clean.ts` (output writing shape, `--output` / `--diff` / `--report-html` patterns).
- Reference: `packages/schema/src/workflow/clean.ts:384` — `CleanWorkflowOptions`. E adds `stripPlanFields?: boolean`.
- Reference: `packages/schema/src/workflow/serialize.ts` — output serialization.

## Locked decisions (this subplan)

| Decision | Outcome |
|---|---|
| Hidden command | **Yes — leading underscore in name (`_draft-extract`).** Requires extending `SpecCommand` with `hidden?: boolean` and suppressing from `--help` in `build-program.ts`. |
| Handler key | `draftExtract` (camelCase). Filename: `packages/cli/src/commands/_draft-extract.ts` (leading underscore to match command). |
| `_plan_*` strip | **Yes — via a new `clean.ts` option `stripPlanFields: true`.** Strips `_plan_state`, `_plan_context`, `_plan_in`, `_plan_out` from every step (recursively into draft subworkflows) and from the workflow root. Lives in `packages/schema/src/workflow/clean.ts` so it's reusable. |
| Class flip | **Conditional.** If, after extract + plan-field strip, the resulting dict has zero `_plan_*` *and* zero TODO sentinels remaining, flip `class: GalaxyWorkflowDraft` → `class: GalaxyWorkflow`. Recursively apply to inline subworkflow `run:` blocks that were already draft and are now fully concrete. Otherwise leave as `GalaxyWorkflowDraft`. |
| Empty extract | **Exit 0.** Per INDEX L181 — an empty extract is a valid step in the agent loop, not an error. |
| Subworkflow recursion | **Already handled in B.** E does not redo it; just passes the workflow through. |
| Output format | YAML default. Auto-detect from `-o` extension (`.ga` → JSON; `.gxwf.yml` → YAML). `--format <fmt>` overrides. |
| Sidecar report | `--report-json [file]` writes a JSON `SingleDraftExtractReport` (drops + rewrites + class-flip flag). Filename omitted → stdout. **See "stdout-sink collision" below** — `--report-json` to stdout conflicts with the trimmed workflow output (which also defaults to stdout); reject the combination with exit 2, matching the rule C established in `draft-validate`. |
| Cross-check | **Run inside E's tests, not as a CLI flag.** When the result is `class: GalaxyWorkflow`, decode it against `GalaxyWorkflowSchema` and fail loudly if it doesn't validate. This is plan test-step 9 (deferred from B). |
| Exit code | `0` always when input parses + extract runs. `2` only for parse/read failure. |
| Format flag | `--format <fmt>` for input format detection alignment with other commands. Reject native (drafts are format2-only). |
| Diff mode | **Not in v1.** `clean.ts --diff` exists; we could mirror it but skip for v1. |

## Pipeline gaps E closes

### 1. Spec-types extension — `packages/cli/src/meta/spec-types.ts`

```ts
export interface SpecCommand {
  // ...existing fields...
  /** When true, suppress from `--help` output. Useful for experimental / agent-internal commands. */
  hidden?: boolean;
}
```

### 2. `build-program.ts` — honor `hidden`

When the spec sets `hidden: true`, mark the commander subcommand as hidden (commander API: `.command(...).addHelpText(...)` / `program.command(name).command(...)` with `.helpCommand(false)` is wrong; the correct call is `.command(name, { hidden: true })` per commander docs). Verify against the installed commander version (`packages/cli/package.json`).

### 3. New clean option — `packages/schema/src/workflow/clean.ts`

```ts
export interface CleanWorkflowOptions {
  // ...existing...
  /**
   * When true, strip `_plan_state` / `_plan_context` / `_plan_in` / `_plan_out`
   * from every step (recursively into inline draft subworkflows) and from the
   * workflow root. Used by `gxwf _draft-extract` after `extractConcreteSubset`.
   */
  stripPlanFields?: boolean;
}
```

Either:
- Add the strip logic inline in `cleanWorkflow` when `opts.stripPlanFields`, OR
- Expose a separate top-level helper `stripPlanFields(workflow): { workflow, removedPaths }` that `cleanWorkflow` calls when the option is set. Recommend the latter — narrower surface, easier to test in isolation, and E can call it directly without involving the rest of `cleanWorkflow`'s tool-state machinery.

If the latter, E imports `stripPlanFields` directly from `@galaxy-tool-util/schema` and the new `CleanWorkflowOptions.stripPlanFields` option is OPTIONAL (only useful for callers wanting one-stop clean+strip).

### 4. Class flip helper — also lives in `clean.ts` (or a new `promote-draft.ts`)

```ts
/**
 * Recursively flip `class: GalaxyWorkflowDraft` → `class: GalaxyWorkflow` on
 * any (sub)workflow that is now fully concrete: zero `_plan_*` fields, zero
 * TODO sentinels anywhere in steps / inputs / outputs / refs.
 * Leaves drafts that still carry work as-is.
 *
 * Returns the (possibly mutated) workflow and a list of step paths whose
 * inner workflow was promoted.
 */
export function promoteFullyConcreteDrafts(workflow: unknown): {
  workflow: unknown;
  promotedPaths: StepPath[];
};
```

Reuses `detectDraft` to check "is anything still drafty?" at each level. Pure function.

### 5. Spec entry — `packages/cli/spec/gxwf.json`

```jsonc
{
  "name": "_draft-extract",
  "description": "Extract the concrete subset of a draft workflow (agent-loop internal)",
  "handler": "draftExtract",
  "hidden": true,
  "args": [{ "raw": "<file>", "description": "Draft workflow file (.gxwf.yml)" }],
  "options": [
    { "flags": "-o, --output <file>", "description": "Write extracted workflow to file (default: stdout)" },
    { "flags": "--report-json [file]", "description": "Write extraction report JSON (drops, rewrites, class flip)" },
    { "flags": "--format <fmt>", "description": "Input format: format2 (default; native is rejected)" }
  ]
}
```

### 6. Handler — `packages/cli/src/commands/_draft-extract.ts`

```ts
export interface DraftExtractOptions {
  output?: string;
  reportJson?: string | boolean;
  format?: string;
}

export async function runDraftExtract(file: string, opts: DraftExtractOptions): Promise<void>;
```

Pipeline:
1. **Stdout-sink collision check (first thing in the handler).** When `-o` is absent (workflow → stdout) AND `--report-json` is set with no filename or `=-` (report → stdout), reject with exit 2 and an explicit error message. Use or extend `findStdoutSinkConflict` from `packages/cli/src/commands/report-output.ts` (introduced during C's review fixups). The current helper signature only knows about `json` / `reportHtml` / `reportMarkdown`; either generalize it to take a list of named sinks + their dest values, or wrap a tiny E-local check around the same idea.
2. `readWorkflowFile(file)` → parse failure → exit 2.
3. `resolveFormat` — native rejected.
4. `const extract = extractConcreteSubset(parsed);`
5. `let trimmed = stripPlanFields(extract.workflow).workflow;` (or via `cleanWorkflow({ stripPlanFields: true })` if E chose that path).
6. `const promote = promoteFullyConcreteDrafts(trimmed); trimmed = promote.workflow;`
7. Serialize trimmed to YAML via `serializeWorkflow` (or JSON if `-o` ends in `.ga`/`.json`).
8. Write output via `writeWorkflowOutput` (existing helper in `workflow-io.ts`).
9. If `--report-json`: build a `SingleDraftExtractReport` (see report model) and write it.
10. Exit 0.

### 7. Handler registry — `packages/cli/src/programs/gxwf.ts`

```ts
import { runDraftExtract } from "../commands/_draft-extract.js";
// ...
const handlers: HandlerRegistry = {
  // ...
  draftExtract: runDraftExtract,
};
```

### 8. Report model — `report-models.ts`

```ts
export interface DraftExtractDropReport {
  path: string[];       // step path (or workflow path for outputs)
  label?: string;       // for output drops
  reason: DropReason;   // re-uses B's union
}

export interface DraftExtractRewriteReport {
  path: string[];
  in_key: string;
  removed_refs: string[];
  surviving_refs: string[];
}

export interface SingleDraftExtractReport {
  workflow: string;                            // input file path
  output: string | null;                       // -o path, or null for stdout
  dropped_steps: DraftExtractDropReport[];
  dropped_outputs: DraftExtractDropReport[];
  rewritten_step_inputs: DraftExtractRewriteReport[];
  promoted_paths: string[][];                  // (sub)workflows flipped to concrete
  class_after: "GalaxyWorkflowDraft" | "GalaxyWorkflow";
  summary: string;
}

export function buildSingleDraftExtractReport(...): SingleDraftExtractReport;
```

## Test plan (vitest)

Tests live in `packages/cli/test/_draft-extract.test.ts` (sibling-style; C settled on flat `packages/cli/test/<command>.test.ts`, no `commands/` subdir). Schema-side tests for `stripPlanFields` + `promoteFullyConcreteDrafts` live in `packages/schema/test/workflow/clean.test.ts` and `packages/schema/test/draft-checks.test.ts` (or a new `promote-draft.test.ts`).

Reuse the CLI draft fixture dir at `packages/cli/test/fixtures/draft/` (established in C). Use the shared `createCliTestContext` harness from `packages/cli/test/helpers/cli-test-context.ts` exactly like `draft-validate.test.ts` does.

Red-to-green:

1. **Schema: `stripPlanFields` removes the four `_plan_*` keys** from a step (and workflow root) and reports removedPaths.
2. **Schema: `stripPlanFields` recurses into draft subworkflow `run:`** but NOT into concrete `run:` and NOT into string-form `run:`.
3. **Schema: `promoteFullyConcreteDrafts` flips class** when zero TODOs / zero `_plan_*` remain; leaves draft otherwise.
4. **Schema: `promoteFullyConcreteDrafts` recurses** into inline draft subworkflows that are now fully concrete; flips them too. Leaves still-drafty inner workflows alone.
5. **CLI: happy path** — fully-concrete draft (no TODOs, only `_plan_*` planning context) → exits 0, stdout is YAML with `class: GalaxyWorkflow`, no `_plan_*` keys present.
6. **CLI: cascade case** — `draft-extract-cascade.yml`-style → stdout YAML has only the surviving step subset; sidecar report (when `--report-json /tmp/x.json`) lists both the directly-drafty drop and the cascaded drop.
7. **CLI: B's test-9 cross-check** — when promotion fires (output class is `GalaxyWorkflow`), decode the serialized output against `GalaxyWorkflowSchema`; must pass without errors. Failing this is a regression.
8. **CLI: empty extract** — workflow with every step drafty → stdout is a valid draft workflow with empty steps; exit 0; report lists all the drops.
9. **CLI: hidden from --help** — running `gxwf --help` does NOT mention `_draft-extract`. (Useful for verifying the `hidden: true` plumbing.)
10. **CLI: --report-json sidecar** — file written; valid JSON; matches `SingleDraftExtractReport` shape.
11. **CLI: stdout-sink collision** — no `-o` (workflow → stdout) AND `--report-json` with no filename (report → stdout) → exit 2, stderr cites the collision, neither artifact written. Mirror `draft-validate.test.ts`'s "rejects --json + --report-html (stdout) with exit 2" test.

## Out of scope for E

- `--diff` mode (mirroring `clean.ts`). Could land later.
- Type-aware connection validation on the promoted workflow. Defer to v2.
- Tree variant. Defer to v2.
- "Re-roundtrip" — taking the extracted concrete workflow and running it through `gxwf roundtrip`. Not E's job; users can chain commands.
- `clean.ts` integration of `stripPlanFields` via `cleanWorkflow({ stripPlanFields: true })`. Optional; if not done, E imports `stripPlanFields` standalone.

## Acceptance criteria

- `gxwf _draft-extract <file>` produces a trimmed workflow on stdout (YAML).
- `-o file.gxwf.yml` writes to file with the right serializer.
- `--report-json` writes a `SingleDraftExtractReport`.
- Hidden from `gxwf --help`.
- `stripPlanFields` + `promoteFullyConcreteDrafts` exported from `@galaxy-tool-util/schema`.
- Schema test suite green; CLI test suite green; test-9 cross-check passes on the fully-concrete fixture.
- `make check && make test` green.
- `make gen-skill` — confirm hidden command is also hidden from the generated skill doc (per INDEX L209–211 the skill regen runs commander introspection; hidden subcommands should NOT show up in the public skill surface).
- Changesets: minor bump for `@galaxy-tool-util/schema` (new exports) + `@galaxy-tool-util/cli` (new command).

## Sequencing inside E

```
commit 1  schema: stripPlanFields helper                                                  (+ unit tests)
commit 2  schema: promoteFullyConcreteDrafts helper                                       (+ unit tests + test-9 cross-check on promoted output)
commit 3  cli/meta: SpecCommand.hidden + build-program honors it                          (+ test)
commit 4  cli: _draft-extract handler + spec entry + handler registry                     (+ command tests)
commit 5  schema: SingleDraftExtractReport + buildSingleDraftExtractReport                (+ unit tests)
commit 6  cli: --report-json wiring                                                        (+ tests)
commit 7  Changesets + regen gxwf-cli skill doc (verify hidden command is hidden in skill)
```

(commits 1+2 could collapse if the helpers are small; commits 4+6 likewise.)

## Post-C carry-overs

What landed during C (including review fixups) that E should inherit verbatim:

- **Stdout-sink collision rule (NEW in C fixups).** Multiple sinks writing to stdout silently interleave; the new rule is to refuse the combination with exit 2 + an explicit error. C ships `findStdoutSinkConflict(opts)` in `packages/cli/src/commands/report-output.ts`. E has the *strongest* exposure of any command so far (workflow → stdout by default + `--report-json` → stdout when filename omitted), so this is mandatory, not optional. Decide up-front whether to generalize `findStdoutSinkConflict` to take a sink-list or to keep an E-local check.
- **Test layout** is `packages/cli/test/<command>.test.ts` (no `commands/` subdir).
- **Test harness** is `createCliTestContext` from `test/helpers/cli-test-context.js`. Both setup and cleanup reset `process.exitCode`; tests don't need to do it themselves.
- **Draft fixtures** live in `packages/cli/test/fixtures/draft/` (three synthetic fixtures from C). Add new E-specific fixtures (cascade-drop scenarios, fully-concrete drafts) into the same dir.
- **`resolveFormat`** (from `@galaxy-tool-util/schema`) + **`readWorkflowFile`** (from `packages/cli/src/commands/workflow-io.ts`) are the canonical input pair. Use them.
- **Schema re-exports.** C had to add a root-level re-export in `packages/schema/src/index.ts` for `buildSingleDraftValidationReport` + the report types. E will need the same for `stripPlanFields`, `promoteFullyConcreteDrafts`, `buildSingleDraftExtractReport`, and the `SingleDraftExtractReport` / `DraftExtractDropReport` / `DraftExtractRewriteReport` types. Schema patch alongside the cli minor.
- **Markdown templates** live under `packages/cli/src/workflow/templates/reports/` (not `report-templates/` as the original C plan mis-stated). E doesn't add a template, but the next plan that does should target the correct dir.
- **Template polish.** C learned to (a) render booleans as yes/no rather than literal `true`/`false`, and (b) use double-tick code spans (`` ``…`` ``) for any value that might contain a literal backtick. If E adds any rendered output, apply the same.

## Open questions for E

- Recursive `stripPlanFields` semantics: strip `_plan_*` from string-form `run:` blocks? They're opaque (URLs / TRS refs) — no dict to strip from. Recommend skip (no-op).
- Class flip on the OUTERMOST workflow when zero drops occurred but the user still wants the result marked as draft (e.g. they want to keep iterating): no opt-out flag in v1. Recommend default-on flip; user can re-add `class: GalaxyWorkflowDraft` manually if they want. Reviewers may want `--no-promote-class` opt-out.
- Should `promoteFullyConcreteDrafts` also strip `_plan_*` from the workflow root if it flips the class? Recommend yes — root `_plan_*` on a fully-concrete workflow is dead weight. Treat as integral to the promotion.
- Sidecar report when no drops + no rewrites + class promoted: emit anyway, or skip? Recommend emit (file always created when flag is set; agents can detect "empty" by checking arrays).
- The "decode against `GalaxyWorkflowSchema`" cross-check (B test-9): run it inside the CLI command at runtime (and exit 1 if it fails — would indicate a real B-regression) or only inside tests? Recommend tests-only — at runtime, a failure means a B bug we want to find via CI, not surface to users as a confusing CLI error.
