Run via Claude Opus 5.5 at low effort.

Acted on two structural findings (`e3307c45`, `5d66d799`); left the rest as acceptable or out of scope per standing decisions.

Not acted on:
- **`entries` / `isNonEmptyArray` near-duplicates:** two tiny local helpers in different modules; merging buys little.
- **`commentLabelMap` built separately from `format2CommentList` labels in `_buildNativeComments`:** keeps the non-frame `contains_comments` error path (`ac7ad741`); folding it in would change that message.
- **Subworkflow lint pointers:** standing decision, unchanged.
- **Digit-string / out-of-range indices:** standing decision, matches gxformat2.

<details><summary>Full review</summary>

- **Repeated `(wf as Record<string, unknown>).comments` cast (3 sites):** `format2CommentList` now takes the workflow and owns the cast. Fixed in `e3307c45`.
- **`convert.ts` re-indented ~40 lines into a wide try:** extracted `convertWorkflow(data, filePath, sourceFormat, targetFormat, cache, opts)` returning `{ result, stepStatuses }`; `runConvert` wraps one call. Cache resolution stays outside the try so its errors aren't relabelled "Conversion failed". Fixed in `5d66d799`.
- File sizes: `lint.ts` 743, `toNative.ts` 765 lines; no 1k crossing.
- Logic placement good: frame resolution lives in `normalized/comments.ts`, label indices in `labels.ts`, shared by lint and conversion; no ad-hoc conditionals in unrelated paths.
- Lint rules follow the existing `Linter` class pattern; exports and profiles consistent.
- Parity with gxformat2 #292 message text preserved; no behaviour change from these refactors.

</details>
