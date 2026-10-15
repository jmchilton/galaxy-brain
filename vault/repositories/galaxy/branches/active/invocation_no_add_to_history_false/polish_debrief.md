# Polish debrief — invocation_no_add_to_history_false

Polished 2026-10-15. Retargeted from `dev` to `release_26.2` at John's request before polishing.

## Rebase

Single commit, replayed cleanly onto `release_26.2` at `082605cade0` (`f9e6dde20fa` → `de958171049`). Force-pushed with lease to the `jmchilton` fork.

## CI

Fork CI on the old `dev`-based head `f9e6dde20fa`: all green except Test Galaxy packages (3.10, 3.14). Both fail on one mypy `no-untyped-call` at `galaxy/security/ssh_util.py:18` (pycryptodome `publickey`), a file this branch doesn't touch, so it's unrelated. CI on the `release_26.2` heads was queued when polishing ended.

## Checklist

GENERAL + WORKFLOW_RELATED (the branch touches invocations). [Evaluation](checklist_evaluation.md): PASS. Human-read item left for John. Re-run after the test change.

Who hits this: no in-tree caller, BioBlend (sends only `True`) or Planemo sends explicit `false`. The exposure is typed callers. The published `@galaxyproject/galaxy-api-client` 26.1.1 (and `release_26.2`'s `schema.ts:18398`) declares `no_add_to_history: boolean | null` as non-optional. Recorded honestly; no concrete affected user is known.

## Strengthening round

Tasks applied:
- Added an explicit-`null` case to `test_run_no_add_to_history` (parametrized `["omitted", None, False, True]`). Amended into the single commit → `e6121407400`, pushed.
- Red on `release_26.2`'s `run_request.py` without `-x`: omitted PASS, null FAIL (`AssertionError: []`), false FAIL (`AssertionError: []`), true PASS, which demonstrates every "before" table row. Green with the fix: 4 passed in 41.43s.
- Description: corrected the claim that library/HDCA paths were untouched (they now follow the value too), added the history (presence check predates 2014's d5916381a8c; schema `default=False` from 222f3649d1b, 2024-02), and highlighted answers to the misreadings: the release-branch API change, BioBlend, the misleading schema description, and omission being unchanged.

Verified the subagent's factual claims directly before using them: library paths `:426`/`:441`, commit dates, npm version, `release_26.1` TS type, the list of required TS fields (it missed `ds_map` and `parameters`; added).

## Left for John (round 1; first two items resolved in round 2)

- The schema's `no_add_to_history` description ("should not be added to the history") is misleading. Fixing it regenerates `schema.ts`, so it's probably `dev`-only follow-up work.
- Defaulted request fields being required in the generated TS type is the client-side root cause. Separate, `dev`-only.
- No library-dataset test case. The description says library inputs follow the flag (verified in code, not by a test). Scope evaluation had rejected widening the matrix.

## Round 2: widened scope (2026-10-15, John's request)

John asked to fix the schema description and the client-type root cause here instead of deferring them to `dev`. Head is now `33be985c49e` on `release_26.2` at `162b71f8185`; an autosquash rebase picked up 85 newer base commits cleanly.

Commits:
1. `9e160f5cbde` no_add_to_history by value (unchanged)
2. `261b0266427` corrected schema description
3. `40d5f0eeaa1` generator
4. `33be985c49e` ds_map value check

### Root cause

openapi-typescript 7.13's `defaultNonNullable` makes defaulted properties required, skipping only paths under `parameters`/`requestBody`/`requestBodies`. Galaxy's request bodies are `$ref`s into `components/schemas`, so they lost the exemption. The OpenAPI document itself never marked them required (checked: `InvokeWorkflowPayload` has no `required`).

The fix is `client/scripts/generate-api-schema.mjs`, using the `transformProperty` hook. It flips defaulted properties to optional only in schemas reachable from request bodies and not from responses.

### Verification

- The stock CLI reproduced the committed `schema.ts` byte for byte, so the 224 (Galaxy) + 2 (Tool Shed) flips are the whole diff.
- Client vue-tsc and Tool Shed typecheck: 0 errors, re-run on the new base.
- api-client vitest passes. The package's own `tsc` errors are identical before and after.

### Checklist round

The first re-run failed "unit tests": the generator had no test and the drift workflow didn't trigger on script changes. Fixed by:
- adding a vitest fixture test (red on escaped property names first, then fixed by JSON-pointer unescaping);
- adding the script to `lint_openapi_schema.yml` path filters.

The same review caught a wrong rejected-alternative claim: Galaxy already runs FastAPI with `separate_input_output_schemas=True`. Corrected.

### ds_map (John: fix here)

The strengthening review found that the old types made a valid call impossible. A minimal `{history_id, inputs}` body fails TS2740 against the old types. Filling in the required `ds_map` default then hits `run_request.py`'s `"ds_map" in payload` presence check and gets a 400. Verified:
- the TS compile, old vs new;
- stubbed `build_workflow_run_configs`;
- an API red run: `null`/`{}` failed with 400, omitted/non-empty passed.

The fix rejects only a non-empty `ds_map` next to non-null `inputs`. 8/8 API cases pass.

### Re-runs

- **Scope evaluation:** keep all four commits in one PR, and the four decisions are recorded.
- **Test challenges:** kept all three tests. Dropped a vitest case on an internal helper, switched to `assert_error_message_contains`, then removed the unreachable `$ref`-name unescape (pydantic normalizes schema names) and the unused export.
- **Checklist:** PASS on `33be985c49e`.

### Backport

[invocation_no_add_to_history_false_26.1](../invocation_no_add_to_history_false_26.1/index.md) carries both server fixes to `release_26.1` (8/8 API locally), queued as `branches_implemented_needs_ci`.

### Left for John

- 80 request/response-shared schemas (176 defaulted props, e.g. `WriteStoreToPayload`) keep required defaults in request types. This is the documented partial fix (John's decision).
- Untested `ds_map` edges: `inputs: {}` + non-empty `ds_map` (still 400), and `inputs: null` + non-empty `ds_map` (was 400, now the legacy path).
- No library-dataset test case for `no_add_to_history`.
- Possible `dev` follow-up: audit other `model_dump(exclude_unset=True)` presence checks if a concrete case turns up.
- Possibly an upstream openapi-typescript issue about `$ref`'d request bodies (not drafted).
- Fork CI on `33be985c49e` still to settle.
