Run via Claude Opus 5.5 at low effort.

**Verdict:** small, contained change; one structural finding acted on in `5cf1f5d6` (named check + early-return problem function, mirroring gxformat2 `_FrameRefCheck`). Behavior, messages, fixtures and expectations unchanged.

Not acted on:
- `comments.ts` size (~200 lines): far below 1k; no split needed.
- Huge-digit-string guard: JS `Number()` yields `Infinity`, so no explicit length guard like Python's `_index_in_range` is needed; parity already tested.
- `labels` typed structurally (`{ has(label: string): boolean }`) rather than unifying `format2StepLabelIndices` Map and comment Set; a shared label-index type would be wider scope than this branch.

<details><summary>Full review</summary>

Reviewed `ad7d1e4b` vs `origin/main` `61d5e632`.

**T1 (acted on): positional `as const` tuples + nested conditional in loop body.** `checks` was an array of 6-element tuples destructured positionally (`[field, kind, indexKind, labels, count, digitsIndex]`), with a `let problem` built by a two-level if/else-if inside the per-entry closure, including `ref as number` casts. Positional booleans/strings are easy to swap silently and diverge from gxformat2's `_FrameRefCheck(field, label_kind, index_noun, labels, index_count, digit_strings_are_indices)` with `problem(ref)`. Replaced with a `FrameRefCheck` interface using the same field names (camelCased) and a `frameRefProblem(check, ref)` early-return function in the same order as Python's `problem`: non-int/non-string → null; label hit → null; non-index string → unknown label; else range check. Loop body shrinks to call + push; casts gone. Future ports can diff line-for-line against Python.

Other checks:
- No new spaghetti outside `unresolvedFrameReferences`; lint/toNative consume it unchanged.
- Booleans: `typeof` and `Number.isInteger(true) === false` keep the bool skip.
- Tests: fixture-driven expectations synced byte-identical with gxformat2 plus one imperative huge-digit test; adequate, not trivial.

</details>
