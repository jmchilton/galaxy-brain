# #581 gxwf validate --connections crashes: `step.in is not iterable`

[Issue](https://github.com/galaxyproject/foundry/issues/581) · [verification comment](https://github.com/galaxyproject/foundry/issues/581#issuecomment-6374782166) (posted 2026-10-23)

## Status

`closed`: John closed it 2026-10-23 (completed). Fixed upstream by [galaxy-tool-util-ts#179](https://github.com/jmchilton/galaxy-tool-util-ts/pull/179), `@galaxy-tool-util/cli` 1.13.1+; Foundry pins `^1.14.0`. No branch to prune.

## Verification (2026-10-23)

- Real root cause: `toNative`'s `_isNormalizedFormat2` check skipped normalization when `class: GalaxyWorkflow` came with list `inputs:` **and** list `steps:`. A dict `in:` then reached `_extractConnections` raw. The comment's "detection from `inputs:` alone" is close but incomplete: map-form `steps:` never crashed.
- Repro (list inputs + list steps + dict `in:`), run via npx on the published CLI:
  - `validate --json --connections`: 1.12.0 crashes; 1.13.1 and 1.14.0 give a full report.
  - `draft-validate --concrete --connections`: 1.12.0 crashes; 1.14.0 emits a connection report. It still exits 1, from an unrelated draft topology error (`unknown port "out_file1"`, from the TODO step's reference to the concrete `cat1` step).
  - 1.13.0 was tagged but never published to npm.
- The comment's amendments:
  1. `draft-extract` keeps the author's `inputs:` shape. That's legal and no longer matters.
  2. Fixed by #179.
  3. Fixed by #179.
- No regression test added: `toNative` is now the single choke point, and #179/#182 cover list form.
- Scratch worktree `galaxy-tool-util-ts/branch/fix_connections_list_inputs` was created at `origin/main` `6266935d`. No changes were made, and it has been removed.

## Leftovers (not acted on)

- `gxwf validate` (`validate-workflow.ts:211`) calls `buildConnectionReport` without a try/catch, so an unexpected exception still drops the whole JSON. That's the issue's fallback ask, and it would belong in a galaxy-tool-util-ts issue if John wants it.
- Classless format2 with `--connections`: `graph-builder.ts` `_coerceNormalizedNative` routes on `class === "GalaxyWorkflow"`. A document without `class` goes through `normalizedNative` and gets a silently empty connection report (no input step, 0 connections). This is tied to the gxformat2#278 class-required decision ([review](../../../../gxformat2/reviews/active/278/index.md), P2 2).

## Earlier triage

- Proposed labels: `roadmap/off`, `priority/mvp`, `agent/human`, `upstream/gxwf`. Status was derived as `blocked` (upstream/gxwf).
- No open PR/branch addressed it. #554 (draft-validate type-dump gotcha) is unrelated.
