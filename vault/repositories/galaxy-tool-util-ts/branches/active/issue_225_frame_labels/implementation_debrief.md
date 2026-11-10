# Implementation debrief — `issue_225_frame_labels`

Base `origin/main` `68451c8e`; head `0e74a2f0` on `origin`.

## Root cause

Confirmed: `_buildNativeComments` mapped string `child_steps` through `ConversionContext.stepId`, whose `parseInt` fallback returns `NaN` for an unknown label; JSON serializes it as `null`. Lint never looked at comments.

## Change

- Port of [gxformat2 `issue_292_frame_labels`](../../../../gxformat2/branches/active/issue_292_frame_labels/index.md): `unresolvedFrameReferences` and `frameDescription` in `normalized/comments.ts`, with `format2CommentList` shared by lint and conversion.
- Lint `FrameReferenceNotFound` / `FrameIsEmpty`, exported from both indexes; profiles synced.
- `toNative` throws the same message; `gxwf convert` catches conversion errors and prints `Conversion failed: <message>` with exit 1 instead of a stack trace.
- Fixtures and expectations synced from the gxformat2 branch (`make sync-workflow-fixtures sync-workflow-expectations sync-lint-profiles`); unrelated upstream drift (`validate_format2.yml`, `synthetic-extra-field-output`) left out.

## Behavior notes

- Dict-form comments now keep an explicit `label` over the map key, matching Python. Before, the key won.
- `gxwf validate --connections` converts to native, so a bad frame now throws there too (stack trace). Same as any existing conversion error, e.g. an unknown `contains_comments` label on base; related to #220.

## Checks

- Red first: 6 synced declarative cases and the new imperative tests failed on base.
- `make check`, `pnpm lint:unused:ci`, `pnpm build`, `make test` green.
- Local IWC sweeps: 2 failures (tool-state roundtrip diffs, tests-file schema), none frame-related; local IWC `2912683` is newer than CI's pinned `ed959c9`.
- CLI on the issue's file: lint exit 2 with both messages; `convert --to native` exits 1 with the message.

## Out of scope

- `gxwf validate` unchanged (it doesn't check `outputSource` either).
- Out-of-range integer entries, native `child_steps` lint, mermaid/cytoscape handling, #171 (frame `color`).
