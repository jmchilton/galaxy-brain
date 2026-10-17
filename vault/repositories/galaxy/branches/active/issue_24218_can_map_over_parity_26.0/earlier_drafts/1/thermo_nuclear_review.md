# Thermo-nuclear review: issue_24218_can_map_over_parity_26.0

**Top line:** I changed no code. There's no new commit or push, and the branch is still `3e3b6d75e8b` / `0e9a619bda4` / `d45d2fdb3bc`. The diff is small: about 107 lines added and 40 removed across 4 files. It deletes the `rank <= other.rank` pre-branch, so `canMapOver` now reads in the same order as Python `has_subcollections_of_type`, and `getCollectionTypeFromInput` follows the server's `collection_type_source` order. The structural findings below are real, but each one either needs both client call sites changed together or touches the server too. That's dev follow-up work, not a 26.0 fix.

Not acted on, and why:
- **Two client resolvers pick the declared type with different rules.** Changing them means touching both call sites, the multi-type order is untested, and it's outside #24218. This is a dev follow-up (see D1).
- **Neither resolver sorts declared types by rank the way the server does.** Sorting in only one place would put the step `mapOver` and the output type out of sync, so this goes with the D1 follow-up.
- **`terminals.ts` and `terminals.test.ts` are over 1k lines.** Both were already over 1k on base (1062 and 1001 lines). The PR adds 1 line to the first and 36 to the second, so it doesn't cross the threshold.
- **`_endsWith` duplicates the native `String.prototype.endsWith`.** It's a pre-existing helper the branch reuses. Swapping it out is churn with no behavior change.
- **The colon-boundary suffix bug and the server `effective_collection_type` ordering.** These are already recorded as follow-ups in `subagents/normal_review.md`. Both need server changes.
- **A shared client/server parity table.** The issue defers it, and it would clash with the dev test file at merge-forward.
- **The `as DataCollectionStepInput` cast and inline fixture changes in the new terminals test.** These are local to the test, follow the neighboring test, and were already accepted in `test_challenges_debrief.md`.

## Details

### Scope and size

- `collectionTypeDescription.ts` went from 235 to 225 lines (net -10). The fix deletes the `rank <= other.rank` pre-branch and the three nested special cases under it. That is the right kind of cut: one ordered rule list instead of two half-overlapping ones.
- `terminals.ts` went from 1062 to 1063 lines and `terminals.test.ts` from 1001 to 1037. Both were already over 1k on base. The PR doesn't push anything over the line, and splitting these files doesn't belong on a release branch.
- No new abstractions, wrappers, flags or casts in production code.

### D1. Two places decide which declared type a connection selects, with different rules (structural; follow-up)

- `InputCollectionTerminal._effectiveMapOver` (terminals.ts ~596) checks for a direct match first. Only if no declared type `canMatch` does it walk the declared types in their declared order looking for `canMapOver`.
- `OutputCollectionTerminal.getCollectionTypeFromInput` (terminals.ts ~837) now checks map-over first and then direct match, also in declared order. This mirrors `tools/actions/__init__.py` (~1179): `HistoryQuery.can_map_over` gives the declared type, otherwise the connected collection's actual type is used.
- The server's `HistoryQuery.from_collection_types` (query.py:50) sorts the declared types by `dimension` from highest to lowest before checking. Neither client site does this.

**Is this a 26.0 problem?** I checked with the existing parity harness (scratchpad `parity/both.mts` against the branch `collectionTypeDescription.ts`, all 88 types and 7744 ordered pairs). No single declared type both `canMatch`es and is `canMapOver`ed by the same connected type (`both=0`). So for single-type inputs, which is everything #24218 covers, the two check orders give the same answer, and so do the sorted and unsorted lists. The difference only shows up when an input declares more than one `collection_types`:

- **Match-first versus map-over-first.** Take `["list:paired","paired"]` with `list:paired` connected. The editor computes no map-over. The branch resolves the output type to `paired`, as the server's `can_map_over` does. Base resolved it to `list:paired`. Server behavior here looks questionable (it types the output `paired` without mapping), but the branch still mirrors it.
- **Declared order versus rank-sorted order.** Take `["paired","list:paired"]` with `list:list:paired` connected. The server picks `list:paired`. Both client sites pick `paired`. Because both sites pick the same type, the final types still compose consistently (`list:list` + `paired` gives the same result as the server's `list` + `list:paired`). If only one site were sorted, they would no longer compose. The base code was already order-dependent in the same way, so this is partly pre-existing.

**Code-judo remedy (dev):** add one rank-sorted resolver on `InputCollectionTerminal` that returns `{ kind: "matched" | "mappedOver", collectionType }`. Use it from both `_effectiveMapOver` and `getCollectionTypeFromInput`, so the "which declared type" decision lives in one place. Include a multi-type fixture in `parameter_steps.json` that pins the server's choice. Before deciding between match-first and map-over-first, confirm the server's actual output for the `["list:paired","paired"]` case.

### D2. `canMapOver` (ok)

- It now runs in the same order as Python: self, then `:other` suffix, then `paired_or_unpaired`, then `X:paired_or_unpaired` with extra higher ranks. The comments follow the Python ones on purpose, as a keep-in-sync pair. The previous parity run found 0 disagreements.
- Python also has a `single_datasets` branch that the client lacks. It's never a workflow-editor input type, so this is not a parity gap that matters here.
- The colon-boundary bug (`higherRanks.endsWith(required)` with `required="paired"` matches `...:paired_or_unpaired`) exists on both sides. It's already recorded as follow-up 2 in `subagents/normal_review.md`.
- `effectiveMapOver` (untouched) is still the messy branch-heavy part of the file: it has nested special cases and a substring-stripping loop. It's the obvious next candidate to reshape as "peel ranks off a parsed type". That is dev work, tied to the server `effective_collection_type` follow-up 1 in `normal_review.md`.

### D3. `getCollectionTypeFromInput` (ok for 26.0)

- The two blocks replace a `find(canMatch || canMapOver)` plus an inner check for `"any"`. The `any` special case goes away: `ANY.canMatch(x)` is true and `ANY.canMapOver` is false, so the direct-match branch already returns the connected type. The new structure is simpler than base.
- The `some(canMatch)` guard has to stay. Without it, an invalid or dataset connection would resolve to `NULL` instead of `ANY`.
- Pre-existing oddity (not introduced here): `inputTerminal` is built with `connection.output.stepId` rather than `this.stepId`. It's harmless for `_otherCollectionType` as used here, but worth one look in the D1 follow-up.

### D4. Tests

- The tests are meaningful red-to-green checks at the right layers. They're covered in `test_challenges_debrief.md`, and I have nothing to add.
- The new terminals test runs three connect/disconnect cases inside one `it`. A table-driven `it.each` would be tidier, but the neighboring `resolves collection type source` test uses the same style, so changing it is churn.

### Follow-ups to record

1. D1: one rank-sorted declared-type resolver shared by `_effectiveMapOver` and `getCollectionTypeFromInput`, plus a multi-type fixture. Settle match-first versus map-over-first against what the server actually executes.
2. Reshape `effectiveMapOver` together with the server `effective_collection_type` fix (`normal_review.md` follow-up 1).
3. Colon-boundary suffix check on both sides (`normal_review.md` follow-up 2).
