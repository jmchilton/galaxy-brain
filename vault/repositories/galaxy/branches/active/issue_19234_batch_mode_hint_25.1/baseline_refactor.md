No further refactoring of the base branch was performed. The round-1 refactor still stands: `isBatchSelection` is extracted in `6028edab3f3`, ahead of the fix. History is unchanged, with head `c2987f4abad`.

## Current history (base `origin/release_25.1` `8bb256be5b1`)

1. `9b6f39b7609` Baseline tests for FormData batch hint (still first)
2. `6028edab3f3` Extract isBatchSelection for FormData batch flag. A behavior-preserving refactor on base.
3. `da78f5eb235` Show map over hint when selected collection maps over input. This is the fix.
4. `ad7c3fcc447` Test map over hint for dropped nested collection. This commit is the tip of `_alt_original_scope`.
5. `617bb92f50f` Name job unit in FormData map over hint (re-scope)
6. `de8046bcdf3` Use collection type label for map over job unit
7. `c2987f4abad` Derive FormData map over hint from one mapsOver computed

## Candidates considered, left in place

- **Extracting `mapsOver` onto base** (base meaning: `type == "data"` and the source is a collection). On base this would be a single-use, one-line rename of the inline `v-if`. It would only change the fix's diff from "replace the expression" to "add a disjunct". Round 1 drew the same line for `showBatchInfo`. The rewrite cost is not small: it rewrites `da78f5eb235` and every commit after it. `_alt_original_scope` would stop being a prefix, so that alt would need a second force-push or a stale `alts/original_scope.md`. It would also invalidate the SHAs cited in the round-2 codex, test-challenge and thermo debriefs. Not worth it for a backport.
- **`showBatchInfo` and the `currentVariant?.` chains.** These exist only because of the fix's new guard. On base, `currentVariant.batch !== DISABLED` differs from `isBatchSelection`, so there is nothing behavior-preserving to hoist.
- **`localize` import, `mapOverUnit`, `COLLECTION_TYPE_TO_LABEL` use.** These are re-scope feature code with no base consumer.
- **Squashing `617bb92f50f` + `de8046bcdf3` + `c2987f4abad`.** This would be post-fix tidying, not a refactor onto base, so this process doesn't call for it. The head was already reviewed at these SHAs, and the commits read fine as a sequence: unit, then label, then dedupe.

## Verification (fresh)

- `6028edab3f3`: FormData jest 23/23. `npx vue-tsc --noEmit` clean.
- `c2987f4abad`: FormData jest 30/30.
- `_alt_original_scope` (`ad7c3fcc447`) is an ancestor of head. The worktree is clean on the branch at `c2987f4abad`. No push was needed.
