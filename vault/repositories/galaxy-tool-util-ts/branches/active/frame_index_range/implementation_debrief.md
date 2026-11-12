Run via Claude Opus 5.5 at low effort.

# frame_index_range implementation debrief

Port of gxformat2 `frame_index_range` (`baaac08`) onto `origin/main` `61d5e632`. Commit `5d773e85`, pushed to `origin`.

## Change

- `unresolvedFrameReferences` (`packages/schema/src/workflow/normalized/comments.ts`) now: labels resolve first; otherwise number entries and all-ASCII-digit `contains_steps` strings must satisfy `0 <= i < inputs+steps` (`contains_comments`: `< comments.length`). Booleans skipped; digit strings in `contains_comments` remain labels. Message `{frame} references out-of-range {step|comment} index '{ref}' in {field}`. Lint (`FrameReferenceNotFound`) and `toNative` error pick it up unchanged.
- Synced `synthetic-frame-index-out-of-range` + `synthetic-frame-digit-label` fixtures and lint/to_native expectations via `GXFORMAT2_ROOT=<gxformat2 worktree> make sync-workflow-fixtures sync-workflow-expectations sync-lint-profiles`. Dropped unrelated drift (`validate_format2.yml`, `synthetic-extra-field-output.gxwf.yml`).
- Mirrored imperative tests in `packages/schema/test/to-native-frame-references.test.ts`.

## Red/green

- Out-of-range cases (2 declarative + 1 imperative) red on base, green after fix.
- Digit-label cases pass on base too (base skipped digit strings); they guard label-first precedence.

## Gate

`pnpm build`, `make check`, `pnpm lint:unused:ci`, `make test` all green (fresh worktree needs `pnpm build` before `make check`).

## Divergence from Python

- Non-integer numbers: Python `int()` truncates (`-0.5` -> 0, in range); TS compares the raw number (`-0.5` flagged). Schema-invalid input anyway.
