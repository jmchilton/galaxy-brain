# Workstream C — CLI command `gxwf draft-validate`

## Goal

Wire `validateDraft` (workstream B) behind a `gxwf draft-validate` CLI command. Single-file variant only in v1 (tree variant → v2). Text / JSON / HTML output modes, parity with the existing `gxwf validate` shape.

## Inputs

- Metaplan: [INDEX.md](./INDEX.md) (commands section L102–115; status L268–275)
- Subplan B (landed): [B-ts-draft-checks.md](./B-ts-draft-checks.md) — provides `validateDraft`, `DraftValidationResult`, `DraftValidationDiagnostic`, `DraftSurvey`.
- Reference command: `packages/cli/src/commands/validate-workflow.ts` (option shape, HTML report wiring, `buildSingleValidationReport`-style report construction).
- Reference spec entry: `packages/cli/spec/gxwf.json` → `"validate"` (option shapes, handler name convention).

## Locked decisions (this subplan)

| Decision | Outcome |
|---|---|
| Strict tool-state options | **Not exposed.** Drafts can't have meaningful concrete tool state; `optionGroups: ["strict"]` is not applied. |
| Tree variant | **Out of scope (v2).** `gxwf draft-validate-tree` is not built in C. |
| Format flag | **Honor `--format <fmt>`.** Auto-detect by extension (`.gxwf.yml` → format2) like `gxwf validate`. Native (`.ga`) inputs always fail draft-validate up front — drafts only exist in format2. |
| Connection validation | **Not run.** Draft step `tool_id`s may be `TODO`; type-aware connection checks are meaningless. |
| Class mismatch | If the input parses but `class !== GalaxyWorkflowDraft`, fail with structureErrors and exit `2`. (`validateDraft` already returns this diagnostic.) |
| Exit codes | `0` clean draft (no structure/topology/semantic errors; warnings allowed); `1` draft validation errors (any of the three error buckets non-empty); `2` parse / structural decode failure (file couldn't be parsed, `class` not Draft). |
| `_plan_*` strip on output | **No.** `draft-validate` is read-only. The strip + class flip lives in E. |
| Default output mode | Text (human-readable summary). JSON + HTML via flags. |
| HTML report | Reuse `writeReportHtml` + a new `draft_validate.md.j2` template. |
| Filename argument | Single positional `<file>`, matches `gxwf validate <file>`. |

## Pipeline gaps C closes

### 1. Spec entry — `packages/cli/spec/gxwf.json`

Add command `draft-validate`:

```jsonc
{
  "name": "draft-validate",
  "description": "Validate a draft Galaxy workflow (class: GalaxyWorkflowDraft)",
  "handler": "draftValidate",
  "args": [{ "raw": "<file>", "description": "Draft workflow file (.gxwf.yml)" }],
  "options": [
    { "flags": "--format <fmt>", "description": "Force format: format2 (native is rejected for drafts)" },
    { "flags": "--json", "description": "Output structured JSON report" },
    { "flags": "--report-html [file]", "description": "Write HTML report (or stdout if filename omitted)" },
    { "flags": "--report-markdown [file]", "description": "Write Markdown report" }
  ]
}
```

### 2. Handler — `packages/cli/src/commands/draft-validate.ts`

```ts
export interface DraftValidateOptions {
  format?: string;
  json?: boolean;
  reportHtml?: string | boolean;
  reportMarkdown?: string | boolean;
}

export async function runDraftValidate(file: string, opts: DraftValidateOptions): Promise<void>;
```

Pipeline:
1. `readWorkflowFile(file)` from `workflow-io.ts`. Parse error → exit 2 (already handled by reader).
2. `resolveFormat(parsed, opts.format)`. Native → fail with "draft-validate requires format2", exit 2.
3. Call `validateDraft(parsed)`.
4. Build a `SingleDraftValidationReport` (see report model below).
5. Emit per output mode:
   - text (default): summary line + grouped diagnostics by bucket.
   - `--json`: pretty-printed report to stdout.
   - `--report-html [file]` / `--report-markdown [file]`: render via existing report-output infrastructure.
6. Set `process.exitCode` per locked exit-code table.

### 3. Handler registry — `packages/cli/src/programs/gxwf.ts`

```ts
import { runDraftValidate } from "../commands/draft-validate.js";
// ...
const handlers: HandlerRegistry = {
  // ...existing...
  draftValidate: runDraftValidate,
};
```

### 4. Report model — `packages/schema/src/workflow/report-models.ts`

Add (snake_case for forward Python parity):

```ts
export interface DraftValidationDiagnosticReport {
  path: string[];        // [] for workflow-level
  message: string;
}

export interface DraftSurveyReport {
  is_draft: boolean;
  todo_count: number;
  todo_paths: string[][];        // [] dedup of survey.todos paths
  plan_step_paths: string[][];   // dedup of survey.planFields paths
}

export interface SingleDraftValidationReport {
  workflow: string;                                  // file path
  ok: boolean;
  structure_errors: DraftValidationDiagnosticReport[];
  topology_errors: DraftValidationDiagnosticReport[];
  semantic_errors: DraftValidationDiagnosticReport[];
  warnings: DraftValidationDiagnosticReport[];
  survey: DraftSurveyReport;
  summary: string;                                   // 1-line human summary
}

export function buildSingleDraftValidationReport(
  filePath: string,
  result: DraftValidationResult,
): SingleDraftValidationReport;
```

### 5. HTML/Markdown template

New `packages/cli/src/workflow/report-templates/draft_validate.md.j2` (Nunjucks/Jinja-style; existing templates set the conventions). Lists each bucket; shows survey summary.

## Test plan (vitest)

Tests live in `packages/cli/test/commands/draft-validate.test.ts`. Reuse the existing draft fixtures (copy from `packages/schema/test/fixtures/draft/`) into a CLI fixture dir `packages/cli/test/fixtures/draft/`.

Red-to-green:

1. **Happy path text output** — synthetic-draft-tool-step fixture → exit 0, stdout contains `"ok: true"`-ish summary, no diagnostics surfaced.
2. **Topology error** — `label: TODO` step → exit 1, stderr/stdout cites the path.
3. **Structural failure** — `class: GalaxyWorkflow` input → exit 2, error mentions class mismatch.
4. **Parse failure** — malformed YAML → exit 2 (already handled by `readWorkflowFile`).
5. **JSON mode** — `--json` flag emits a valid `SingleDraftValidationReport` JSON; assert shape with `S.decodeUnknownSync` against a TS-only declared schema or shape assertion.
6. **Determinism** — running twice on the same fixture produces byte-identical JSON output.
7. **HTML report** — `--report-html /tmp/x.html` writes a file; assert file exists and contains a recognizable marker (e.g. workflow filename).
8. **Format flag** — `--format native` on a draft file → exit 2 with "draft-validate requires format2".

Tests use the existing CLI-test scaffolding (spawn the program built via `buildGxwfProgram` and capture output, or call `runDraftValidate` directly and assert on stdout/exitCode — match conventions in `validate-workflow.test.ts` if it exists, else use the same shape as `clean.test.ts`).

## Out of scope for C

- Tree variant (`draft-validate-tree`) — v2.
- Type-aware connection checks on concrete steps inside a draft — v2.
- `_plan_*` stripping or output writing — that's E.
- Cross-checking that a "fully-concrete draft" also passes `state-validate --no-tool-state` — that's F (fixtures + golden tests).

## Acceptance criteria

- `gxwf draft-validate <file>` works in all four modes (text default, `--json`, `--report-html`, `--report-markdown`).
- Spec entry checked in; handler wired in `programs/gxwf.ts`; vitest suite green.
- `make gen-skill` regenerates the CLI skill doc with `draft-validate` listed (per INDEX L209–211).
- `make check && make test` green.
- Changeset: minor bump for `@galaxy-tool-util/cli`. Patch (if shared report model gained fields) for `@galaxy-tool-util/schema`.

## Sequencing inside C

```
commit 1  schema: add SingleDraftValidationReport + buildSingleDraftValidationReport      (+ unit tests)
commit 2  cli:    draft-validate handler + spec entry + handler registry + text mode      (+ command tests)
commit 3  cli:    --json + --report-html + --report-markdown wiring + j2 template          (+ tests)
commit 4  Changeset + regen gxwf-cli skill doc
```

## Open questions for C

- Bare-`TODO` warning surfacing in text mode: count-only line (e.g. `2 warnings (bare TODO ports)`) or list each? Recommend list (matches validate-workflow's diagnostic verbosity); collapse in HTML.
- Should `draft-validate` accept a `.gxwf.yml` file lacking `class:` (older drafts pre-schema-A)? Recommend no — fail with exit 2 and instruct user to add the class. INDEX L29 says "Strictly `class: GalaxyWorkflowDraft`."
- Reuse `connection-validation.ts`? Probably no — that path assumes concrete tool ids. Confirm with first reviewer.
- Cross-link from `gxwf validate` when a user runs it on a draft file: emit a 1-line hint "this looks like a draft — try `gxwf draft-validate`"? Or silent? Recommend hint when `class === GalaxyWorkflowDraft`.
