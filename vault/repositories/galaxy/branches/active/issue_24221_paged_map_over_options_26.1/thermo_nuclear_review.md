# Thermo-nuclear code quality review (round 2, after re-scope)

Acted on one finding. `handleIncoming` repeated the body of `normalizeOption` line for line: find the server-listed option, cache a keep option if it is missing, return the found option or the value. They became identical once the re-scope switched to `push(foundOption ?? newValue)`. It now calls `normalizeOption(newValue)` (-11 lines). That also leaves two keep-label templates instead of three, so the suffix can't drift (review L4). Folded into the map-over commit, now `a26e4600f37`. No structural blockers. The server change removes a moving piece, and the client changes route every identity check through one key (`itemUniqueKey`) plus one lookup (`findDataOption`).

Not acted on:
- **R2: `findDataOption<T>` takes an accessor callback.** Only `currentValue` needs it, to look inside `SelectOption.value`; the other three callers pass an identity function. The helper is line-identical to dev `9eff87c8e21`, so keeping it identical helps the forward merge. If it gets simplified, do it on dev.
- **R3: `isSameItem` is exported but only used inside `types.ts`.** Kept for dev parity. Trivial.
- **R4: `ToolForm`/`WorkflowRunDefaultStep` `mergeFetchedOptions` are still near-duplicates** (round 1 T2). This predates the branch. A shared `mergeFetchedInput` belongs on dev.
- **R5: `FormData.vue` is 1324 lines.** It was already 1318 on base, so this branch didn't push it past 1k. Decomposing it (for example moving the keep-option cache into a composable) is a dev job.
- **R6: `mapOverSuffix` puts a `props.type` check in the label path, and the suffix becomes search text.** This is the accepted 26.1 trade-off, since 26.1 has no `label-area` slot. Dev uses a slot/badge instead.
- **R7: the dev branch `issue_20657_input_processing_mode` has the same `handleIncoming`/`normalizeOption` duplication.** The fix should be applied there too. It is a note for that branch, not this one.

<details><summary>Full review</summary>

Scope: `dbe4f2f7e41..HEAD`: baseline tests `4df74333a48`, server `43a0d6691f1`, client merge `621a35204b8`, map-over selection `669e0de55f3` (now `a26e4600f37`). Compared against dev `9eff87c8e21` on `issue_20657_input_processing_mode`.

## Structural

The diff is +346/-56, mostly tests.

- **Server.** `accumulate_with_filter` drops the `hit_limit` flag and the inner break, so pages break only at row boundaries. This is a deletion and the right fix. The comment documents the offset/merge contract, which is dev's wording.
- **Client.** The re-scope removes the second identity key (`pageMergeKey`), which was round 1's T3. Now one key, `itemUniqueKey` (src+id+map_over_type), serves selection, the keep cache, dedup, page merge and FormSelect `trackBy`. The id/src fallback lives in a single place, `findDataOption`. Before, five call sites in FormData.vue each matched on their own: some by id+src, some by id only (keep replace, `createValue`, `normalizeOption`). Now they all go through the helpers. This lowers the number of rules a reader has to hold, and is the code-judo move for this bug.

## R1 (acted): `handleIncoming` duplicated `normalizeOption`

After L1 (push the server-listed option), the per-value block in `handleIncoming` matched `normalizeOption` exactly:

- `findExistingOption`
- if not found and `!isInKeepOptions`: set the keep option with the same label template, then bump `keepOptionsUpdate`
- return `found ?? value`

Calling `normalizeOption(newValue)` removes the duplication and one of three label builders, and keeps behaviour. Both functions are declarations, so hoisting doesn't matter. The existing "dropping values" FormData tests exercise this path. Fixup of the map-over commit, because on base the two blocks still differed (`push(newValue)`).

## R2: generic accessor on `findDataOption`

The `toOption: (item: T) => DataOption | null | undefined` parameter only exists for `currentValue`, which searches `SelectOption[]`. The alternative is to search `formattedOptions.value.map(e => e.value)` and drop the generic. It's a small win, but it diverges from dev's identical helper. Leave it to dev.

## R3: `isSameItem` export

Only `findDataOption` uses it. Dev exports it as well, so I left it.

## R4: `mergeFetchedOptions` duplication

There are about 15 identical lines in two Options API components: find the input, merge, copy `options_meta`, and bump the inputs. This is unchanged from round 1. It's a dev refactor (`mergeFetchedInput(target, incoming, src)` in `Form/utilities`).

## R5: file size

`FormData.vue` went from 1318 to 1324 lines with this branch (net +6 after R1). It was already over 1k on base, so the 1k rule's "pushes past" trigger doesn't apply. The keep-option cache (`keepOptions`, `keepOptionsUpdate`, `isInKeepOptions`, `normalizeOption`, the keep-replace loop in `formattedOptions`) is a self-contained concept that could become a composable on dev. `types.ts` is 163 lines.

## R6: suffix in label

`mapOverSuffix` is a single documented function with one `props.type` guard, not a scatter of special cases, so I'm fine with it. Search matching the suffix text is a known trade-off. The PR should mention it.

## Tests

- Baseline commit first. The unit tests use a fake query and no mocks. The API test uses the existing `TargetHistory`/`RequiredTool` describers.
- FormData cases are mount-level and test the round trip. The call-site tests in ToolForm and WorkflowRunDefaultStep go through `onLoadMore`.
- The fix commit has no unit test. Round 1's test challenge deliberately removed `test_accumulate_keeps_a_rows_matches_on_one_page` because the API test covers the same three cases. I noted it and didn't restore it.
- Nothing to strengthen.

## Verification at `a26e4600f37`

- vitest Form + Tool + Workflow/Run: 295/295 (node 22.20.0)
- vue-tsc: exit 0
- eslint/prettier on FormData.vue: clean
- unit `test_parameter_pagination.py`: 2/2
- No API run, since no python changed.

</details>
