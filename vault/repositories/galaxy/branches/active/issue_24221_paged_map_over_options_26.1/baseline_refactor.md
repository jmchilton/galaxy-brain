One behavior-preserving refactor commit now sits between the baseline tests and the fix: `27506823dcb` "Look up data option values through shared helpers". It adds `isSameItem` and `findDataOption` to `types.ts` with id+src identity, and routes FormData's value lookups and keep-option keys through them. This is the FormData/types half of dev `05907884de9`. The `mergeDataOptions` half stays in the merge fix.

New history (base `dbe4f2f7e41`, old head `a26e4600f37`, final tree identical):

- `4df74333a48` Baseline tests for option paging (unchanged)
- `27506823dcb` Look up data option values through shared helpers (new)
- `599d0978a83` Keep a collection's direct and map-over options on one page (was `43a0d6691f1`)
- `4249dbb60ba` Keep map-over options when merging option pages (was `621a35204b8`)
- `79dccaf6f84` Let a collection's map-over option be selected on its own (was `a26e4600f37`)

## What moved into the refactor

Applied dev `05907884de9`'s FormData/types hunks verbatim (they applied cleanly to 26.1), minus `mergeDataOptions`:

- `types.ts`: `OptionIdentity = Pick<DataOption, "id" | "src">`, `itemUniqueKey` takes it, and new `isSameItem` and `findDataOption` (a single id+src find).
- `FormData.vue`: `currentValue` and `matchedValues` use `findDataOption`. `matchedValues` searches page options before pinned ones, as before. The four keep-option key sites use `itemUniqueKey`. That key is private to the `keepOptions` cache, so the change from `id_src` to `src-id` can't be seen outside it.

The map-over commit now shows only the identity change: `map_over_type` in `itemUniqueKey`, the same-item fallback in `findDataOption`, and the call sites that used to match by id only (keep-replace, `createValue` dedupe, `normalizeOption`/`handleIncoming`) plus drag-enter and the label suffix. Its FormData.vue diff shrank from +44/-34 to +37/-24 (about 15 fewer lines).

## Left in the fixes

- **`mergeDataOptions` extraction (ToolForm/WorkflowRunDefaultStep).** Still rejected, for round 1's reason. On base, ToolForm dedups only against existing options. WorkflowRunDefaultStep also dedups within the incoming page, which drops a same-page map-over entry. A single helper keyed on id+src would make ToolForm drop that entry too, which is a regression on 26.1. Dev took that small change inside its refactor. A backport shouldn't.
- **Id-only matches → key (keep-replace, `createValue` dedupe, `normalizeOption`).** These are behavior changes, not refactors. An hda and an hdca can share an encoded id, and the keep-replace loop sees other-source options. They stay in the fix.
- **`handleIncoming` → `normalizeOption`.** On base it pushes the raw incoming value, not the server-listed option, so this rewire changes behavior. It stays in the fix.

## Worth it for a backport?

It's marginal but positive. It costs one ~20-line mechanical commit with no new tests. The baseline tests and the existing FormData suites cover it, and it passes on its own. In return, the fix diff is smaller and easier to review, and the 26.1 history follows dev's refactor-then-fix shape for the same helpers, so a forward merge into dev is easier to compare. If reviewers want fewer commits, it can be squashed into `79dccaf6f84` with no other changes.

## Verification

- `27506823dcb`: vitest Form/Tool/Workflow/Run 289/289, vue-tsc 0, eslint + prettier clean
- `599d0978a83`: unit `test_parameter_pagination.py` 2/2
- `4249dbb60ba`: vitest 291/291, vue-tsc 0
- `79dccaf6f84` (HEAD): vitest 295/295, vue-tsc 0, unit 2/2. `git diff a26e4600f37 79dccaf6f84` is empty.
- API tests not re-run: no Python changed, and the server commit's tree is unchanged.

Note: the re-scope debrief mentions `types.test.ts` cases and 300 tests, but there is no `types.test.ts` on the current branch (it existed only at `e4a0f756c63`/alt). The thermo round-2 count of 295 matches.
