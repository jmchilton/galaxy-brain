# Test challenges debrief: PR #241

Profile generic_test_challenger, Claude Opus 5.5, effort medium. Reviewed commit `28e93b564fc6fd132ee5fb6bcae621c09db568df` (base `61d5e632`).

## Tests in the PR

- `packages/schema/test/to-native-source-references.test.ts`: 6 `toNative` cases, 3 `lintFormat2` cases, built from one inline `labelShadowsId(source)` workflow.
- `packages/connection-validation/test/unresolved-source.test.ts`: 1 `validateConnectionsReport` case, a second inline copy of the same workflow.

No mocks, so the mock/dataclass challenges don't apply. None of the tests are silly or just restate the implementation; all go through public entry points (`toNative`, `lintFormat2`, `validateConnectionsReport`).

## Mutation checks

Run on a scratch copy of the worktree (PR worktree untouched).

| Mutation | Result |
| --- | --- |
| `lint.ts` reverted to base | 2 lint tests red (step-source, outputSource-by-id) |
| `toNative.ts` reverted to base | 4 toNative tests red |
| lint drops the `/^\d+$/` numeric-id pass | "accepts ..." test red |
| lint drops the `runtime_value` skip | "accepts ..." test red |
| toNative drops the `RUNTIME_VALUE_SOURCE` shortcut | already covered by `roundtrip.test.ts` (required disconnected RuntimeValue) |
| `report-builder.ts` reverted to base | connection-validation test red (`UnresolvedSourceError` thrown) |
| `lint.ts` reverted, outputSource `Merge summits +/-500kb/out_file1` | base reports a false "no step 'Merge summits +'" error and head is clean. The full schema suite with base `lint.ts` fails only the PR's 2 lint tests, so **nothing covers this** |

"resolves the same source by the step's label" and "still resolves numeric step ids" pass at base. They're regression guards, which is fine.

## Cross-language check (gxformat2 `origin/main`)

Probed with the Python library:

- Step `in` source naming a shadowed id: `ensure_native` raises `ValueError` (int parse); lint reports **0** errors.
- `outputSource` naming a shadowed id: `ensure_native` raises `ValueError`; lint reports 1 error (old-style "references step 'first' ... no step or input with that label exists").
- `outputSource` through a step label containing `/`: converts and lints clean.

So three of the four behaviors this PR adds or fixes already agree with Python and fit the shared declarative fixtures (`gxformat2/examples/format2/` + `examples/expectations/{to_native,lint_format2}.yml`, synced here by `make sync-workflow-fixtures sync-workflow-expectations`). The precedent is `synthetic-frame-step-id-shadowed-by-label.gxwf.yml`, which already has a `to_native` `expect_error: true` case for the frame version of this exact bug. The step-`in` lint is TS-only for now; a shared lint fixture for it would fail in Python until gxformat2's lint gets the same check.

## Test plan (recommendations)

1. Add to gxformat2, then sync (a gxformat2 PR first, so a follow-up and not a #241 blocker):
   - `synthetic-source-step-id-shadowed-by-label.gxwf.yml` (step `in` names `first` while `first` is labelled): `to_native` with `expect_error: true`.
   - `synthetic-output-source-step-id-shadowed-by-label.gxwf.yml`: `to_native` with `expect_error: true`; `lint_format2` with `error_count: 1` and `value_contains: "first"`. The messages differ between the two languages, so don't assert the full text.
   - Existing `synthetic-slash-in-step-label.gxwf.yml` (outputSource `Host/Contaminant Filter/out_file1`, used today only by `validate_format2`/`normalized_labels`): add a `lint_format2` `error_count: 0` expectation. It would be the regression test for the `/`-in-label fix the changeset claims.
   Once these exist, the TS unit tests duplicating them (`rejects an outputSource ...` in toNative, and the outputSource lint case) can go, keeping only the exact-message assertions that are TS-specific.
2. Keep the TS-only unit tests for the parts Python doesn't share: the exact error/suggestion text, `UnresolvedSourceError` type, step-`in` lint, numeric-id and `runtime_value` acceptance, subworkflow scoping.
3. Add a lint case for a step-`in` source with a plain typo (`missing/out_file1`). The "no step or input has the label" lint branch is only tested through `toNative`.
4. Change `toContain` to `toEqual([...])` in "reports a step source that names a labelled step by its id". The lint returns exactly that one error, so the exact check also guards against duplicate or extra errors.
5. Optional: a CLI test that `gxwf validate --connections` exits non-zero on this workflow, since the changeset calls out the old exit 0. The report-level test covers the logic, so this is low value.
6. Optional: let the connection-validation test load the shared fixture from item 1 instead of its own inline copy of `labelShadowsId`.
