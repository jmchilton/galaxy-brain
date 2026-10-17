# Thermo-nuclear review (re-harden): issue_24218_can_map_over_parity_26.0

**Top line:** No code changed and nothing committed. The branch is still `3e3b6d75e8b` / `0e9a619bda4` / `d45d2fdb3bc` / `d29206dcd71`. This was a fresh pass over `origin/release_26.0..HEAD`. The diff is net-simplifying (client `canMapOver` lost a whole half-overlapping pre-branch), no file crosses 1k lines because of the branch, and the client and server rules now read line for line. The real structural findings only affect multi-type `collection_types` inputs. One of them, an ordering shift that matches a questionable server order, comes from this branch; the rest predate it. A grep found that no in-tree tool hits any of them. Fixing them would change editor behavior that #24218 doesn't cover on a release branch, so they are recorded as dev follow-ups. Tests: Python `dataset_collections` 84 pass; client `src/components/Workflow` 32 files / 200 tests pass.

Not acted on:
- **Client never rank-sorts declared `collection_types`; the server does** (`HistoryQuery.from_collection_types`). This is a behavior change for multi-type inputs, outside #24218, and pre-existing. Follow-up (F1).
- **Branch-introduced ordering shift for `collection_type_source`:** with `["list:paired","paired"]` and `list:paired` connected, the client now resolves to `paired` where base resolved to `list:paired`. This matches the server, but the server itself looks wrong here (it never checks `direct_match` first). A grep found no in-tree `type_source` tool with that declaration shape. Fixing it means changing the server and client together. Follow-up (F4).
- **Two client sites pick "which declared type" with different rules** (`_effectiveMapOver` is match-first, `getCollectionTypeFromInput` is map-over-first). Pre-existing; unifying them needs a multi-type fixture and server confirmation. Follow-up (F1).
- **Rule duplicated in TS and Python with no shared test table.** The right fix is a shared parity fixture run by vitest and pytest. That's new test infra, so it belongs on dev. Follow-up (F2).
- **`_endsWith` is a hand-rolled `String.prototype.endsWith`,** and the same function mixes both. Pre-existing; deleting it is churn on a release branch. Follow-up (F3).
- **New terminal test mutates a frozen step's nested input through a cast.** The fixture is deep-copied per test, so nothing leaks. The alternative (`updateStep` with a rebuilt inputs array) needs the same cast. Left as is.
- **New `collection_type_source` test mostly copies the existing one.** Turning both into an `it.each` would edit an existing test on a release branch, which isn't worth it. Left as is.
- `terminals.ts` and `terminals.test.ts` are over 1k lines, but they already were on base (1062 → 1063). This branch doesn't cause it.

## Details

### Scope of diff

6 files, +120 / −41. `collectionTypeDescription.ts` net −10. `terminals.ts` +1. `type_description.py` 1 line. Tests: one new client test file (46 lines), 3 new terminal tests, 3 new Python asserts.

### 1. `canMapOver` rewrite (0e9a619bda4, d29206dcd71): approve

This is the code-judo move, and it's already done. The old code had a `this.rank <= other.rank` pre-branch with its own `paired_or_unpaired` special cases, followed by a second, partly overlapping set of `paired_or_unpaired` cases (with a "this really needs to be extended" comment). The new code is one ordered rule list: self → `:other` suffix → `paired_or_unpaired` → `X:paired_or_unpaired` with aligned extra higher ranks → false. That's exactly the shape of Python `has_subcollections_of_type`, so complexity was deleted, not moved. The comments mirror the Python ones on purpose, which makes drift visible.

The `:` boundary (`endsWith(":" + higherRanksRequired)`) is the right expression. It subsumes the old Python `!=` guard and the client's earlier `rank <= other.rank` reasoning in one token-aligned check. No ad-hoc branch was added.

Nit, not acted on: `normalizedThis.endsWith(":paired")` and `this._endsWith(...)` sit side by side in the same function. `_endsWith` predates ES2015 `endsWith` and should go, but every caller in the file should change in one go (F3).

### 2. `getCollectionTypeFromInput` (d45d2fdb3bc): approve, with a pre-existing structural debt

The rewrite deletes the `"any"` special case, since `ANY.canMatch(x)` is true and `ANY.canMapOver` is false, so the fallback covers it. It also fixes the reversed `canMatch` receiver (`output.canMatch(input)` → `input.canMatch(output)`). The order (map-over → declared type, else direct match → connected type) mirrors `tools/actions/__init__.py` `create_collection` (~1179–1185). It's direct and boring, which is good.

Structural debt the branch touches but doesn't cause:
- `HistoryQuery.from_collection_types` (query.py ~41–49) sorts declared types by `dimension` descending ("default to providing tool as much data as possible"). The client `InputCollectionTerminal` keeps declared order, and both `find` here and the loop in `_effectiveMapOver` walk it. Example: `["paired","list:paired"]` with `list:list:paired` connected. The server picks `list:paired`; the client picks `paired`. Both client sites pick the same one, so the composed output type stays self-consistent.
- The "code-judo" candidate is to sort `collectionTypes` once in the `InputCollectionTerminal` constructor, mirroring the server's `from_collection_types`, so both sites inherit it. It's a single-site change, but it changes the step `mapOver` for multi-type inputs on a release branch, it isn't exercised by any fixture, and it's outside #24218. Do it on dev with a multi-type fixture, together with unifying the match-first / map-over-first split into one resolver (F1).
- **Ordering shift introduced by this branch (not base):** take an input declaring `["list:paired","paired"]` with `list:paired` connected. Base used `find(canMatch || canMapOver)`, which hit `list:paired` and returned `list:paired`. The branch is map-over-first, so it returns `paired`. That matches the server: `create_collection` calls `can_map_over` without checking `direct_match` first, and `list:paired` over `list:paired` is false, so it falls through to `paired`. The branch therefore keeps parity, but the parity is with what looks like a latent server bug: a directly matched, non-mapped job gets a lower-rank output type. Fixing it means changing both client and server, so it's a follow-up (F4).
- **Does any in-tree tool hit this?** I grepped `lib/galaxy/tools`, `tools/` and `test/functional/tools`. The `type_source` tools with multi-type inputs declare `list,list:paired` (filter_failed/empty/null, keep_success, sort, harmonize), `list,paired` (collection_type_source_map_over) and `sample_sheet,sample_sheet:paired,sample_sheet:paired_or_unpaired,sample_sheet` (convert_sample_sheet). None has an entry that ends with `:<another entry>`. So the shift, and the F1 rank-sort gap, never fire for in-tree `type_source` tools. I traced each tool's realistic inputs (`list`, `list:paired`, `list:list`, `list:list:paired`, the `sample_sheet` variants), and old and new client and server give the same type. This doesn't block.
- `"collectionTypes" in inputTerminal` is duck typing where `instanceof InputCollectionTerminal` would be explicit. It's pre-existing and unchanged.

### 3. Server change (`type_description.py`): approve

One line, and it's the same expression as the client. Callers include `HistoryQuery.can_map_over` (query.py), which feeds `tools/actions` `create_collection` (`collection_type_source`) and tool-parameter map-over. I re-grepped the in-tree compound declarations fresh: `list:paired_or_unpaired` (twice, including split_paired_and_unpaired) and `sample_sheet:paired_or_unpaired` (sample_sheet_to_tabular, convert_sample_sheet). Their higher ranks are `list` after normalization, and no rank token other than `list` ends in `list`, so the boundary changes nothing for in-tree tools. It only rejects `paired:...:paired_or_unpaired` pseudo-matches. That's appropriate for 26.0.

### 4. Tests

- `collectionTypeDescription.test.ts` is a pure-function table, which is the right level. It will add/add conflict with the dev-era file at merge-forward (already noted in index.md).
- `terminals.test.ts`: the two new rejection tests follow the neighboring pattern. The new `collection_type_source` test reuses the `filter_failed` fixture by overriding its `collection_types` (`as DataCollectionStepInput`) instead of adding a new step to `parameter_steps.json`. That's acceptable: the `canAccept` `beforeEach` re-adds steps from a `JSON.parse(JSON.stringify(...))` copy, so the mutation doesn't leak. It's 80% the same as the existing "resolves collection type source" test. A shared helper or `it.each` would be cleaner, but it would mean editing an existing test on the release branch.
- Python: the 3 asserts sit in the existing compound test with a "why" comment. Fine.

### 5. File size / layer

There's no layer leak. The type rule stays in `CollectionTypeDescription` / `type_description.py`, and terminal resolution stays in `terminals.ts`. `terminals.ts` was already 1062 lines on base, and decomposing it isn't for this branch.

### Follow-ups (dev)

- **F1:** one rank-sorted declared-type resolver on `InputCollectionTerminal` (sort in the constructor like `from_collection_types`), used by both `_effectiveMapOver` and `getCollectionTypeFromInput`. Add a multi-type fixture pinning the server's choice. Settle match-first vs map-over-first against the server's param-level behavior.
- **F2:** a shared `(output, input) → canMapOver / canMatch / effective type` JSON table, consumed by both vitest and pytest. This replaces the scratchpad parity harness and keeps the two languages honest. It would also expose the 89 known `effectiveMapOver` / `effective_collection_type` disagreements (already a separate follow-up).
- **F3:** delete `CollectionTypeDescription._endsWith` in favor of native `endsWith`.
- **F4:** in server `create_collection` (`tools/actions/__init__.py` ~1179), check `direct_match` before `can_map_over`, so that a directly matched `collection_type_source` input keeps the connected type even when a lower-rank declared type would map over it. The client's `getCollectionTypeFromInput` order should change in the same commit to keep parity. No in-tree tool is affected today.
