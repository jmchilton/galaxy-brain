# gxwf validate-tests --workflow ignores job input collection shape and filetype

- Target: jmchilton/galaxy-tool-util-ts (owns `checkTestsAgainstWorkflow` in `@galaxy-tool-util/schema`, which `gxwf validate-tests --workflow` calls). Foundry tracking needed: yes, and it already exists.
- Seen in: `/home/ubuntu/foundry-runs/prose-wb2g-demo-v1-2026-10-29`, phase 8 (implement-galaxy-workflow-test), 2026-10-29; ledger entries `validate-tests-doc-overclaims-type-mismatch-check`, `gxwf-validate-tests-no-collection-type-or-filetype-check`.
- Existing issues/PRs: upstream [jmchilton/galaxy-tool-util-ts#210](https://github.com/jmchilton/galaxy-tool-util-ts/issues/210) (open, same gap, found on egapx with 1.14.0). Foundry [#731](https://github.com/galaxyproject/foundry/issues/731) (open, `priority/mvp`, `agent/implement`) with open PR [#734](https://github.com/galaxyproject/foundry/pull/734) (`issue-731-igwt-cardinality-trace`), which already rewords step 4/eval, adds a manual job-input shape/filetype check and fixes `content/cli/gxwf/validate-tests.md`. This run is a duplicate; it adds input-side evidence only.

## Symptom

A job input that cannot match the workflow input passes `validate-tests --workflow` with `valid: true`, exit 0. The workflow input is `samples`: `type: collection`, `collection_type: list:list:paired_or_unpaired`, `format: fastqsanger.gz`. The phase-8 negative control (a `list` of `bam`) passed. Foundry's `content/cli/gxwf/validate-tests.md` (worktree `pipeline-run-demo-v1`, foundry 47aa5c1c) says the cross-check makes "type mismatches fail". The Mold's step 4 and eval said "no collection/datatype mismatches".

## Root cause

Confirmed. The cross-check has no data for shape or datatype, and it treats `collection` and `data` as matching any value:

- `extract-format2.ts:13-30` (`parseInputEntry`) keeps only `name`, `type`, `doc`, `optional` and `default`. It drops `collection_type` and `format`, so `WorkflowInput` (`types.ts:26`) never carries them.
- `type-compat.ts:33-34`: `isCompatibleType` returns `true` for every unmapped declared type, including `data` and `collection`. Its comment says "the strict structural check lives in the JSON Schema layer", but `tests.schema.json` is generic and knows nothing about the workflow.
- `check.ts:59-94` emits only `workflow_input_undefined`, `workflow_input_type` (JS value type), `workflow_input_required` and `workflow_output_undefined`.

Line numbers are from galaxy-tool-util-ts main `a0476900`. The shipped 1.15.0 `dist` is identical: `node_modules/.pnpm/@galaxy-tool-util+schema@1.15.0/.../dist/test-format/cross-check/{check,type-compat}.js`. The last change to `cross-check/` was fe80b5fe on 2026-04-21.

## Evidence

`gxwf --version` returned 1.15.0 (worktree `node_modules`). Each probe was a copy of the run's tests file with only `job` replaced, checked against the run's `galaxy-workflow.gxwf.yml`:

| job `samples` | result |
| --- | --- |
| `class: Collection`, `collection_type: list`, one `bam` File | `valid: true`, exit 0 |
| `class: File`, `filetype: bam` | `valid: true`, exit 0 |
| bare string `"hello"` | `valid: true`, exit 0 |
| (missing; `other:` File instead) | exit 1, `workflow_input_undefined` + `workflow_input_required` |
| the run's real tests file | `valid: true`, exit 0 |

The bare-string case is new beyond gtu#210: a scalar bound to a collection input passes, because `collection` falls through `isCompatibleType`.

## Proposed fix

- **Upstream (gtu#210):** extend `WorkflowInput` with `collectionType` and `format` (from Format2 `collection_type`/`format`, and from native `tool_state`). In `checkTestsAgainstWorkflow`, add input checks:
  - `class` against the declared kind;
  - `collection_type` equality;
  - nesting depth of `elements` against the rank count;
  - leaf identifiers for `paired` (`forward`/`reverse`) and `paired_or_unpaired` (adds `unpaired`) ranks;
  - `filetype` against `format`, as a warning unless datatype subclassing is available.

  Map `data`/`collection` to `object` in `isCompatibleType` (a `data` input should still accept a string path). The output-side checks are already listed in #210.
- **Foundry:** nothing new. Land PR #734. When gtu#210 ships, fold its manual input check back into the step-5 gate and bump `@galaxy-tool-util/cli`.

## Draft issue

No new issue is needed; post as a comment on jmchilton/galaxy-tool-util-ts#210:

> Another reproduction with `@galaxy-tool-util/cli` 1.15.0 (main `a0476900`, `cross-check/` unchanged since fe80b5fe). The workflow input is `samples: {type: collection, collection_type: list:list:paired_or_unpaired, format: fastqsanger.gz}`. `gxwf validate-tests --workflow` returns `valid: true` for each of these jobs: `samples` as a `list` of one `bam` File; as a single `class: File` `bam`; and as the bare string `"hello"`.
>
> Root cause: `extract-format2.ts` `parseInputEntry` drops `collection_type` and `format`, and `type-compat.ts:33` returns `true` for `data`/`collection`. The comment pointing at "the JSON Schema layer" doesn't hold, because `tests.schema.json` can't see the workflow.
>
> Please include these in the input half of the ask: scalar-vs-`class` mismatches, `elements` nesting depth vs `collection_type` rank count, and `paired`/`paired_or_unpaired` leaf identifier sets (`forward`/`reverse`/`unpaired`).

Foundry tracking comment for galaxyproject/foundry#731 (add label `upstream/gxwf`; #731 currently has none):

> The wb2g nf-core/demo run (2026-10-29, CLI 1.15.0) hit this again on the input side: a `list` of `bam` against a `list:list:paired_or_unpaired` `fastqsanger.gz` input passes `validate-tests --workflow`. Upstream comment on jmchilton/galaxy-tool-util-ts#210: "`parseInputEntry` drops `collection_type` and `format`, and `type-compat.ts:33` returns `true` for `data`/`collection`." #734's manual job-input check covers this until #210 ships.

## Local Mold fix 8758f9ee

Drop it. It covers part of what PR #734 already does: it rewords step 4 and the eval property, and adds a manual job-input `collection_type`/`filetype` check. #734 does more, with output-kind tracing via `--connections` and the `validate-tests.md` doc fix that 8758f9ee doesn't touch. Both edit the same step-4 and `eval.md` lines, so keeping 8758f9ee means a conflict once #734 merges. One idea from 8758f9ee is worth keeping: a mismatched negative control that must fail the manual check. If John wants it, carry it into #734 as a review suggestion. The Mold fix isn't papering over the upstream gap: it is the documented stopgap, and #210 removes the need for it.
