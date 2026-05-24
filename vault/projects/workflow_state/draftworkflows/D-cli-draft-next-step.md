# Workstream D — CLI command `gxwf draft-next-step`

## Goal

Wire `nextDraftStep` (workstream B) behind a `gxwf draft-next-step` CLI command. Default output is the locked JSON shape (it IS the wire format for agent loops); a `--format markdown` rendering is the nice-to-have. Pure pass-through — no extra logic, no I/O beyond reading the file and printing the result.

## Inputs

- Metaplan: [INDEX.md](./INDEX.md) (commands section L119–161; `work[]` convention L131–146 + L153–155).
- Subplan B (landed): provides `nextDraftStep(workflow): NextStepResult` and the locked work[] order/format.
- Reference command: `packages/cli/src/commands/mermaid.ts` is a similarly small read-and-emit command (good shape to mirror).

## Locked decisions (this subplan)

| Decision | Outcome |
|---|---|
| Default output | **JSON to stdout.** This is the agent-loop wire format; no flag needed to get JSON. |
| Markdown rendering | **Nice-to-have via `--format markdown`.** Renders the `work[]` as a checklist; useful for humans during onboarding. v1 must ship JSON; markdown can land in a follow-up commit if scope expands. Recommend ship together. |
| Non-draft input | **Emit `{ "draft": false }` and exit 0.** The function is total; the CLI mirrors that. Same for fully-concrete draft. |
| Pretty-printing JSON | **Yes, 2-space indent.** Human-readable; agents that want compact can `jq -c`. |
| Tree variant | **Out of scope (v2).** No `draft-next-step-tree`. |
| Format flag | **Honor `--format <fmt>`** for input auto-detection alignment but reject non-format2 (drafts only). |
| Exit codes | `0` always when input parses + is a (possibly non-draft) workflow document; `2` only for parse / read failure. No "draft has work" vs "draft has none" exit distinction — both are exit 0. |
| Idempotence | Preserved end-to-end. JSON stringify of two runs MUST be byte-identical. |
| Tie-break for list-form steps without `label:` | Per B (already implemented): label key falls back to step `id` then array index. CLI inherits this. |

## Pipeline gaps D closes

### 1. Spec entry — `packages/cli/spec/gxwf.json`

```jsonc
{
  "name": "draft-next-step",
  "description": "Pick the next step a downstream agent should work on (or report no remaining work)",
  "handler": "draftNextStep",
  "args": [{ "raw": "<file>", "description": "Draft workflow file (.gxwf.yml)" }],
  "options": [
    { "flags": "--format <fmt>", "description": "Input format: format2 (default; native is rejected)" },
    { "flags": "--output-format <fmt>", "description": "Output format: json (default) or markdown", "default": "json" }
  ]
}
```

Note: `--format` controls *input* (matches validate/clean convention); `--output-format` selects JSON vs markdown. Avoids overloading `--format` two ways. Alternative names considered: `--render`, `--as`. **Pick `--output-format`** — descriptive, no abbreviation collisions with existing flags.

### 2. Handler — `packages/cli/src/commands/draft-next-step.ts`

```ts
export interface DraftNextStepOptions {
  format?: string;          // input format
  outputFormat?: "json" | "markdown";
}

export async function runDraftNextStep(file: string, opts: DraftNextStepOptions): Promise<void>;
```

Pipeline:
1. `readWorkflowFile(file)` — parse failure → exit 2.
2. `resolveFormat(parsed, opts.format)` — native rejected.
3. `const result = nextDraftStep(parsed);`
4. Emit per `outputFormat`:
   - `"json"` (default): `console.log(JSON.stringify(result, null, 2));`
   - `"markdown"`: render via a tiny inline renderer (see template below).
5. Exit 0.

### 3. Handler registry — `packages/cli/src/programs/gxwf.ts`

```ts
import { runDraftNextStep } from "../commands/draft-next-step.js";
// ...
const handlers: HandlerRegistry = {
  // ...
  draftNextStep: runDraftNextStep,
};
```

### 4. Markdown renderer (inline, no template engine needed)

```ts
function renderMarkdown(result: NextStepResult): string {
  if (!result.draft) return "_No remaining draft work._\n";
  const heading = `## Next step: \`${result.step.join(" / ")}\`\n\n`;
  const items = result.work.map((w) => `- [ ] ${w}`).join("\n");
  return heading + items + "\n";
}
```

Embedded in `draft-next-step.ts`; no new template file. (HTML report is NOT needed for this command — agents consume JSON; humans get markdown.)

### 5. Report model — `report-models.ts`

The `NextStepResult` type is already exported from `@galaxy-tool-util/schema` (workstream B). D does NOT add a new report-model interface; `NextStepResult` IS the wire format. If a `NextStepSuggestion` alias is desired for Python parity, add a `type NextStepSuggestion = NextStepResult` re-export — but only if reviewers want the naming bridge.

## Test plan (vitest)

Tests live in `packages/cli/test/draft-next-step.test.ts` (sibling-style, matches the convention C actually shipped — `packages/cli/test/draft-validate.test.ts`, `clean.test.ts`, `lint.test.ts`; the `test/commands/` subdir is not used). Reuse the CLI draft fixture dir at `packages/cli/test/fixtures/draft/` that C established (`synthetic-draft-tool-step.gxwf.yml`, `synthetic-draft-plan-top-level.gxwf.yml`, `synthetic-draft-plan-subworkflow.gxwf.yml`).

Use the shared `createCliTestContext` harness from `packages/cli/test/helpers/cli-test-context.ts` — it sets up a tmp dir, mocks `console.log` / `console.error` / `process.stdout.write`, and resets `process.exitCode`. Pattern (from `draft-validate.test.ts`):

```ts
import { createCliTestContext, type CliTestContext } from "./helpers/cli-test-context.js";
// ...
let ctx: CliTestContext;
beforeEach(async () => { ctx = await createCliTestContext("draft-next-step"); });
afterEach(async () => { await ctx.cleanup(); });
```

Red-to-green:

1. **JSON output on draft fixture** — synthetic-draft-tool-step → exit 0, stdout parses as JSON matching `{ draft: true, step: ["fastp"], work: [...] }` with the locked work[] order.
2. **Non-draft document** — `class: GalaxyWorkflow` → exit 0, stdout `{ "draft": false }`.
3. **Fully concrete draft** — draft with no TODOs / `_plan_*` → exit 0, stdout `{ "draft": false }`.
4. **Subworkflow descent** — outer concrete + inner draft → step path is `[outer, inner_step]`.
5. **Tie-break determinism** — two steps at level 0 → alphabetical wins, asserts the order.
6. **Markdown rendering** — `--output-format markdown` → checklist with `- [ ]` items.
7. **Native input rejected** — `.ga` file → exit 2.
8. **Idempotence** — run the command twice on the same fixture, capture stdout, byte-compare.

Call `runDraftNextStep` directly with stdout captured via the `createCliTestContext` spies (matches the convention C settled on; spawning the full commander program is unnecessary for handler-level coverage). See `packages/cli/test/draft-validate.test.ts` for the shape.

## Out of scope for D

- Tree variant.
- `_plan_*` field rendering customization (e.g. truncating long plan text). Plan text is passed through verbatim per locked decision INDEX L154.
- Caching / memoization. Function is pure and cheap; no need.
- HTML report.

## Acceptance criteria

- `gxwf draft-next-step <file>` emits a JSON object matching the locked shape.
- `--output-format markdown` renders the checklist form.
- Spec entry + handler wired; vitest suite green.
- `make gen-skill` includes the new command.
- `make check && make test` green.
- Changeset: minor bump for `@galaxy-tool-util/cli`.

## Sequencing inside D

```
commit 1  cli: draft-next-step handler + spec entry + handler registry + JSON output      (+ tests)
commit 2  cli: --output-format markdown renderer                                            (+ test)
commit 3  Changeset + regen gxwf-cli skill doc
```

(Commits 1 + 2 could collapse into one — both are small. Keep separate if the user wants finer-grained review history.)

## Post-C carry-overs

What landed during C that this plan should inherit verbatim:

- Test layout is `packages/cli/test/<command>.test.ts` (no `commands/` subdir).
- Test harness is `createCliTestContext` from `test/helpers/cli-test-context.js`.
- Draft fixtures live in `packages/cli/test/fixtures/draft/` (three syntheticfixtures already copied from `packages/schema/test/fixtures/draft/`).
- `resolveFormat` + `readWorkflowFile` are the canonical "read + normalize input" pair (`resolveFormat` exported from `@galaxy-tool-util/schema`; `readWorkflowFile` lives in `packages/cli/src/commands/workflow-io.ts`). Use them, don't re-roll.
- No stdout-sink collision concern for D: only one stdout sink (JSON or markdown output to stdout, never both). The `findStdoutSinkConflict` helper introduced in C is not needed here.
- Changeset: `@galaxy-tool-util/cli` minor. `@galaxy-tool-util/schema` only needs a patch IF `NextStepResult` (or anything else B added) isn't already re-exported from the package root — verify with `grep "NextStepResult" packages/schema/src/index.ts` before deciding.

## Open questions for D

- `--output-format` vs `--render`: confirm name. Recommend `--output-format`.
- Should `--format` (input) even be exposed for this command? Drafts are format2-only by definition. Recommend keep the flag for symmetry but reject non-format2 with a clean error.
- For an extremely large `work[]` (many TODOs on one step), should markdown rendering paginate / collapse plan text? Recommend no — agents drive consumption; markdown is for human glance.
- Should the JSON include the source file path (e.g. `{ "workflow": "path.yml", "draft": true, ... }`)? Useful for shell pipelines aggregating multiple files. Recommend yes if cheap, but check whether `NextStepResult`'s shape is contractual — adding fields to it would be a schema-level change. Safer: emit a wrapper object only in JSON mode (`{ "file": ..., "result": {...} }`)? Or just print the raw `NextStepResult`?  Recommend raw `NextStepResult` for v1 (agents already know which file they fed in).
