# Normal review: issue_24218_can_map_over_parity_26.0

**Acted on:** fixed the reversed `canMatch` in `getCollectionTypeFromInput` on this branch (`d86600ad72c`, red-to-green test via `collection_type_source` fixture with `list:paired_or_unpaired` input). Did not act on the follow-ups below (out of scope for a 26.0 client parity fix).

**Top line:** Fix is correct and ready. An exhaustive parity check found 0 `canMapOver` disagreements with server `has_subcollections_of_type` across 7744 pairs, and tests are meaningful. One decision is needed: `OutputCollectionTerminal.getCollectionTypeFromInput` calls `canMatch` in the reversed direction. The old `canMapOver` bug hid this for `list -> list:paired_or_unpaired` (via `collection_type_source`), and that case now resolves to "any". Either fix it here (one line + test) or file it. Everything else is follow-up material.

Not worth acting on here:
- `effectiveMapOver` client/server disagreements (121 pairs). All are pre-existing or server-side bugs, the server's effective type isn't consulted by `canMapOver` parity, and none comes from pairs this branch changed. File a follow-up instead.
- Suffix match without a colon boundary (`"…paired_or_unpaired".endsWith("paired")`) in the compound branch. Client and server have the same bug, so parity holds. Fixing it means changing both sides, which is out of scope for a 26.0 client parity fix.
- Moving to a shared client/server parity table. The issue already defers it, and it would clash with the dev-era test file at merge-forward.
- The comments in the new `canMapOver` match the Python comments word for word, which is fine for a "keep in sync" pair.

## Details

### Parity check (scratchpad, not repo)

Script: `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/4e0a0dce-3e49-4e14-84e4-978526fc94ee/scratchpad/parity/` (`gen.py`, `py.py`, `cmp.mts`). Types: every rank 1-3 combination of `list|paired|paired_or_unpaired|record`, plus `sample_sheet`, `sample_sheet:paired`, `sample_sheet:paired_or_unpaired` and `sample_sheet:record` (88 types, 7744 ordered pairs). The real Python module was exec'd with stubbed imports, and the real TS file was run with `node --experimental-strip-types` (22.20.0).

- `canMapOver` vs `has_subcollections_of_type`: **0 disagreements**.
- `canMatch` (input.canMatch(output)) vs `can_match_type`: 0 disagreements.
- Change vs base: 1089 pairs flipped, **all true -> false**. Nothing became newly mappable. Of the 84 "realistic" flips (no `record`, `paired_or_unpaired` only in the innermost position), the ones where the input `canMatch`es the output (e.g. `list -> list:paired_or_unpaired`, `list:list -> list:list:paired_or_unpaired`, every self case, `sample_sheet -> sample_sheet:paired_or_unpaired`, `paired -> paired:paired_or_unpaired`) now connect directly, as they should. The rest are now rejected, matching the server.

### Callers of changed pairs

- `InputCollectionTerminal._effectiveMapOver` / `attachable`: checks `canMatch` first, so direct-match pairs never reach `canMapOver`. The behavior changes only for the issue's broken rows, which are now rejected (`paired`/`paired_or_unpaired -> list:paired_or_unpaired`, `list -> list:list:paired_or_unpaired`). Correct.
- `BaseInputTerminal.setMapOver` (`multiple` -> `effectiveMapOver(list)`): `list` isn't `paired_or_unpaired`, so nothing changes.
- **`OutputCollectionTerminal.getCollectionTypeFromInput` (terminals.ts ~836-841)**: `otherCollectionType.canMatch(collectionType) || otherCollectionType.canMapOver(collectionType)`. Here `otherCollectionType` is the *output*, so `canMatch` runs in the reversed direction (everywhere else it is `input.canMatch(output)`, and `canMatch` is asymmetric for `paired_or_unpaired`). Example: a `collection_type_source` output whose source input is `list:paired_or_unpaired`, connected to a `list` output.
  - Base: `list.canMatch(list:p_o_u)` false, buggy `canMapOver` true -> resolves to `list:paired_or_unpaired`.
  - Branch: both false -> `ANY_COLLECTION_TYPE_DESCRIPTION`.
  - The same degradation already exists on base for `list:paired -> list:paired_or_unpaired` and `paired -> paired_or_unpaired`, so this is a pre-existing direction bug that the old `canMapOver` bug hid for one case. Impact: the downstream output type becomes "any" (looser validation, no crash). Fix: `collectionType.canMatch(otherCollectionType) || otherCollectionType.canMapOver(collectionType)`, plus a test using the `collection_type_source: "input"` fixture in `parameter_steps.json`. It is small enough to include, or it can be filed as a follow-up. John's call.

### Tests

- `vitest run src/components/Workflow/Editor` (node 22.20.0): 17 files, 149 tests pass.
- The baseline commit comes first and pins cases that already agree. The fix commit adds red-to-green asserts. The asserts are meaningful, not trivial, and nothing was weakened.
- The terminal tests cover the 💥 rows that are now rejected. The "no effect yet" rows (`list -> list:paired_or_unpaired`, self) go through `canMatch` first in `_effectiveMapOver`, so a terminal test for them would be green on base as well. The unit tests are the right level for those, and the self case is already at terminals.test.ts:248. The `list -> list:list:paired_or_unpaired` row has only a unit test because there is no fixture. Acceptable.

### Follow-ups found (not this branch)

1. Server `effective_collection_type` with a compound `X:paired_or_unpaired` subtype runs the peel-off before the plain suffix strip, so direct-suffix cases come out wrong. Example: `list:list:paired_or_unpaired` over `list:paired_or_unpaired` gives server `list:list`, while the correct answer (and the client's) is `list`. The same happens for `list:paired:paired_or_unpaired` over `paired:paired_or_unpaired` and `paired:list:paired_or_unpaired` over `list:paired_or_unpaired`. Used by `structure.py:278`.
2. Shared colon-boundary bug in the compound branch: `higherRanks.endsWith(required)` with `required="paired"` matches `...:paired_or_unpaired`. So `list:paired_or_unpaired` "maps over" `paired:paired_or_unpaired` on both sides, and the client's `effectiveMapOver` returns garbage (`""`, `"li"`, `"sampl"`). Both sides need a `:`-boundary check (`== required || endsWith(":" + required)`).
3. The `getCollectionTypeFromInput` direction bug above, if it isn't fixed here.

### Code quality

- The diff is small and mirrors Python line for line. Dropping the `rank <= other.rank` pre-branch is the core fix and makes the code clearer.
- It reuses the existing `_endsWith`, which only exists for legacy reasons (`String.prototype.endsWith` would do), so leaving it alone is fine.
- No typing concerns.
