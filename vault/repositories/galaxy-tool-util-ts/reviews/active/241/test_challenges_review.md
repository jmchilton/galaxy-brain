# Test challenges review: PR #241

Profile generic_test_challenger, Claude Opus 5.5, effort medium. Reviewed commit `28e93b564fc6fd132ee5fb6bcae621c09db568df`. Details and the mutation table are in [test_challenges_debrief.md](test_challenges_debrief.md).

Verdict: the tests are solid. They're mock-free and go through public entry points. Reverting `toNative.ts`, `lint.ts` or `report-builder.ts` turns its tests red; the label and numeric-id resolve cases pass at base too, as regression guards. One claimed fix is untested, and the cross-language cases belong in shared fixtures.

## P2 1: The `/`-in-label `outputSource` fix has no test

The changeset says a step label containing `/` (IWC's `Merge summits +/-500kb`) is no longer reported as missing. No test covers it. With base `lint.ts`, an outputSource of `Merge summits +/-500kb/out_file1` gets the false error "references step 'Merge summits +'". The full schema suite stays green apart from the PR's own two lint tests. The lint fixture `synthetic-slash-in-label-chained.gxwf.yml` routes its outputSource through an unslashed step (`second_cat`), so it never reaches this path.

Fix: the shared fixture `synthetic-slash-in-step-label.gxwf.yml` (outputSource `Host/Contaminant Filter/out_file1`) already exists in gxformat2, but only `validate_format2` and `normalized_labels` use it. Add a `lint_format2` `error_count: 0` expectation for it in gxformat2 and sync. Python already lints it clean. Until that sync, a one-line TS lint case would do.

## P2 2: Put the cross-language cases in shared declarative fixtures

The fixtures sync from gxformat2, so this needs a gxformat2 PR first and a sync here second. It's a follow-up, not a blocker for #241.

The TS-only unit tests duplicate behavior gxformat2 already shares. Python `ensure_native` raises on both shadowed-id cases (step `in` and `outputSource`), and Python lint reports 1 error for the `outputSource` one. `synthetic-frame-step-id-shadowed-by-label.gxwf.yml` already has a `to_native` `expect_error: true` case for the frame version of this bug, and these new cases should follow it:

- `synthetic-source-step-id-shadowed-by-label.gxwf.yml`: `to_native` `expect_error: true`.
- `synthetic-output-source-step-id-shadowed-by-label.gxwf.yml`: `to_native` `expect_error: true`, plus `lint_format2` with `error_count: 1` and `value_contains: "first"`. The message text differs between the languages.

Keep the TS unit tests only for TS-specific behavior: the exact message and suggestion, the error type, step-`in` lint (Python lint doesn't check `in` sources), numeric ids, `runtime_value`, and subworkflow scope. The connection-validation test could then load the same fixture instead of a second inline copy.

## P3 1: The lint "no such step" branch for step-`in` sources is untested

Lint for a step-`in` source with a plain typo (`missing/out_file1`) has no test. The "no step or input has the label" message is checked only through `toNative`. Add one `lintErrors(labelShadowsId("missing/out_file1"))` case with an exact `toEqual`.

## P3 2: Assert the exact lint result instead of `toContain`

"reports a step source that names a labelled step by its id" uses `toContain`, but the lint returns exactly that one error (checked). Use `toEqual([...])` so a duplicate or extra error also fails, matching the outputSource case next to it.

## P3 3 (optional): CLI exit-code test

The changeset says `gxwf validate --connections` used to exit 0 here. A single CLI test asserting a non-zero exit would pin that down. The report-level test already covers the logic, so this is optional.
