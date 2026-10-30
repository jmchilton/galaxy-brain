# gxwf draft-validate prints an Effect TreeFormatter dump (~84 KB) for one wrong-typed field

- Target: jmchilton/galaxy-tool-util-ts (`@galaxy-tool-util/schema`, `workflow/draft-checks.ts` `validateDraft`). Foundry tracking needed: no. The Mold workaround is to read the leaf `Expected ..., actual ...` lines, which isn't worth a Mold change. Mention it in `content/cli/gxwf/draft-validate.md` only if the upstream fix stalls.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29, phase 4 (workflow-brief-to-galaxy-template), `@galaxy-tool-util/cli` 1.15.0, 2026-10-29. Ledger `draft-validate-structure-error-unreadable` (minor).
- Existing issues/PRs: no gtu issue for workflow structure errors. Same class, different code path: Foundry [#548](https://github.com/galaxyproject/foundry/issues/548) (ParsedTool decode failures in `tool-info.ts` dump the full type, the unfixed half of gtu #166). Related gtu #155 (draft-validate vs gxformat2 parity).

## Symptom
A list-form workflow input with `format: fastqsanger.gz` (a string, not a list) gave one "Structure errors (1)" entry of about 90 KB. The useful fragment (`Expected ReadonlyArray<string>, actual "fastqsanger.gz"`) was buried mid-message.

## Root cause
Confirmed. `validateDraft` decodes with `Schema.decodeUnknownEither(GalaxyWorkflowDraftSchema, ...)` and pushes a single diagnostic with `path: []` and `message: ParseResult.TreeFormatter.formatErrorSync(...)` (1.15.0 `dist/workflow/draft-checks.js:326-333`). TreeFormatter labels every tree node with its full type signature, so the root line alone is the whole workflow type. `gxwf validate` already uses `ParseResult.ArrayFormatter.formatErrorSync` (`cli/dist/commands/validate-workflow.js:14`), which gives one issue per failing path. Draft mode never got the same treatment.

Side observation: the map form of the same input (`inputs: {reads: {type: data, format: fastqsanger.gz}}`) is accepted by both `validate` and `draft-validate`. Only the list form fails, so the error message also hides that the two input forms aren't consistent.

## Evidence
Scratch probe (`class: GalaxyWorkflowDraft`, list-form `inputs: [{id: reads, type: data, format: fastqsanger.gz}]`, one cat1 step): `gxwf draft-validate` rc 2, 83,720 bytes over 32 lines. The leaf lines 17-19 are `Expected null, actual "fastqsanger.gz"` / `Expected ReadonlyArray<string>, actual "fastqsanger.gz"` / `Expected undefined, actual "fastqsanger.gz"`, under tree nodes `["inputs"]` → `[0]` → `["format"]`. Each of those node lines starts with a multi-KB type signature.

## Proposed fix
In `validateDraft`, format structure errors with `ArrayFormatter` and push one diagnostic per issue with its real `path` (`inputs.0.format: Expected ReadonlyArray<string>, actual "fastqsanger.gz"`), as `validate-workflow` does. Put any full tree behind `--verbose`. Optionally, check whether list-form `format` should accept a string, as the map form does in gxformat2.

## Draft issue
**Title:** `gxwf draft-validate`: structure errors use TreeFormatter, so one bad field prints ~84 KB with no path

With 1.15.0, a draft whose list-form input has `format: fastqsanger.gz` (string, not list) reports a single structure error of ~84 KB:

```
Structure errors (1):
  <workflow>: { readonly id?: null | string | undefined; ... [the whole workflow type] ...
└─ ["inputs"]
   └─ ReadonlyArray<{ ... [whole input type] ...
      │  └─ [0]
      ...  └─ Expected ReadonlyArray<string>, actual "fastqsanger.gz"
```

`validateDraft` (`packages/schema/src/workflow/draft-checks.ts`) pushes one diagnostic with `path: []` and `TreeFormatter.formatErrorSync(...)` as the message. `gxwf validate` already uses `ArrayFormatter.formatErrorSync`, which gives one issue per path. Using it here, with one diagnostic per issue and a real `path`, would turn this into `inputs.0.format: Expected ReadonlyArray<string>, actual "fastqsanger.gz"`. Agents running the draft loop read these reports in context. Foundry #548 measured the same type-dump class at ~13% of a loop phase's bash output.

Side note: the map form `inputs: {reads: {format: fastqsanger.gz}}` is accepted, and only the list form is rejected.
