# Normal review 2 (post re-scope) - raw

Scope: `git diff d45d2fdb3bc...HEAD` on `issue_24220_drop_collection_matching_26.0` (6 commits), focus on `3ff21339fb8` (column defs only on direct drops), `9cae14dc544` (empty `collectionTypes` = any), and the column-definition rows in baseline `6414bc1cc36`.

Verdict: no must-fix. Both expansion commits are small, correct against the server as it stands, red-first by construction, and well named. One should-fix is a decision/follow-up rather than a code change: the server's map-over listing is arguably the wrong side for `sample_sheet` inputs with `column_definitions`, so the client relaxation should ship with a server follow-up issue.

Tests: `pnpm exec vitest run src/components/Form/Elements/FormData/ src/components/Workflow/Editor/modules/collectionTypeDescription` -> 4 files, 53 tests pass.

## Findings

### Should-fix

1. **Map-over onto a `sample_sheet` input with `column_definitions` can never satisfy those columns - file the server follow-up** (`FormData.vue:647-656`, `basic.py:2611-2618`).
   - Server parity confirmed: `match_collections` (basic.py:2595) filters directly matched HDCAs by `column_definitions_compatible`; `match_multirun_collections` (2611) only checks `can_map_over` + datatype; `from_json` (2620+) checks neither type nor columns; `meta.py` expansion doesn't either. So 3ff21339 does make drop == dropdown.
   - But: `sample_sheet` is only legal as the outermost rank (`type_description.py:16` regex), so the subcollections produced by any map-over onto a `sample_sheet` input are always plain `list`s with no `column_definitions` and `DatasetCollectionElement.columns` = None. `DatasetCollectionWrapper` (wrappers.py:687) then hands the tool `rows` of all `None`. The job runs but a tool that declared columns gets none - "misbehaves" rather than fails.
   - So the "accidentally right" possibility in scope_evaluation.md is actually the stronger reading: for a column-def input the old client refusal was always correct for map-over, and the server multirun listing is too lax.
   - Fix: not a client blocker, since parity with the dropdown is the issue's stated goal. Queue a server issue: `match_multirun_collections` (and ideally `from_json`) should refuse map-over onto a parameter with `_column_definitions` (or decide that's intentionally allowed). If the server is changed, revert 3ff21339's `match.mapOverType === null &&` and flip the new test to a refusal. Mention this explicitly in the PR description so a reviewer doesn't read the relaxation as "sample sheets map over fine".

### Nits

2. **Empty-vs-null guard spelled two ways** (`FormData.vue:465` `props.collectionTypes?.length > 0` vs `FormData.vue:643` `!props.collectionTypes?.length`). Semantics now agree for `[]`, `null`, `undefined`. Optional: one small computed (e.g. `constrainsCollectionType`) used by both gates, so they can't drift again. Low value; skip if merge-forward risk matters.
3. **Prop type still hides `null`** (`FormData.vue:59`, default at 73). Server `to_dict` sends `collection_types: None` and the only caller (`FormElement.vue:445`) passes it straight through; Vue's default only applies to `undefined`, so the real value is `null`, not `[]`. scope_evaluation.md recommended widening to `Array<CollectionType> | null`; not done. Harmless at runtime because both gates use `?.`. Optional.
4. **Test covers `[]` but not the realistic `null`** (`FormData.test.ts:482`). `["list", [], null]` pins the latent case; `null` (what the tool form actually sends) is the path users hit and already worked. A `null` row would need `dropOnCollectionInput`'s `collectionTypes: string[]` widened. Optional; arguably belongs in baseline since it already passed.
5. **Commit message 3ff21339**: "an outer list never does" - more precisely "the outer collection of a map-over never has the input's column_definitions"; and "they run" is true but they run with column-less rows (see #1). Fine as is if #1 lands in the PR description.

## Checked and fine

- `3ff21339fb8`: `match` reused rather than calling `matchCollectionType` twice; check gated on `mapOverType === null`. New row `list:list` on `["sample_sheet"]` with column defs expects `batch: true`, `map_over_type: "sample_sheet"` - consistent with `matchCollectionType` (sample_sheet normalized to list). Before this commit the drop alerted (outer `list:list` has no `column_definitions`), so the test is red-first.
- `9cae14dc544`: before, `[]` was truthy, reached `matchCollectionType(…, [])` -> null -> alert; `toDataOption` already skipped on `length > 0`. Now both treat `[]`/`null` as "any". Pre-existing on the base too (old includes/suffix code also refused `[]`). Commit message accurate. Row is red-first.
- Baseline `6414bc1cc36`: the two direct column-def rows (same columns accepted; other columns refused with exact alert text) pass on the base, as baseline tests should, and give the branch its first client coverage of `columnDefinitionsCompatible`. The map-over column row correctly lives in 3ff21339, not baseline.
- `collectionMatch.ts`: unchanged by the expansion; reuses `CollectionTypeDescription` per REVIEW_FOCUS reuse concern. Comment is non-obvious and useful.
- Test helper `dropOnCollectionInput` asserts either one alert and no input, or exactly one input - no weakened assertions. Names read well ("uses a dropped %s on a %j input with map_over_type %s", "maps a dropped list:list over it without checking column definitions, like the server").
- `FormData.vue` elsewhere: `effectiveCollectionTypes` (688) and the label (854) already use `?.` and treat `[]`/`null` alike. No other gate diverges.
- API test `test_can_map_over_dce_on_collection_param` (baseline) unchanged by the re-scope.
- No Python import placement issues; no security-relevant findings.

## Server-side follow-ups (not client blockers)

- `match_multirun_collections` ignores `column_definitions` (see #1).
- `DataCollectionToolParameter.from_json` validates neither collection type nor column definitions for `hdca`/`dce` values, so API callers can bind any collection to any collection param. Pre-existing; worth noting in the same server issue.
