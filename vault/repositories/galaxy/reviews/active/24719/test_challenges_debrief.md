# Test challenges debrief: #24719

Profile: gx_test_challenger. Model: claude-opus-5-5. Effort: medium. Reviewed commit: `e2c3677d3ae`, diffed against merge-base with `origin/dev`.

Recommendations only; the PR was not edited.

## What ran

- Python: not run locally. The worktree has no `.venv`; the sibling venvs tried lack a libpq wrapper, and pytest died at import. None of the new Python tests were executed by this review.
- Vitest: not run locally (no `client/node_modules`).
- CI: `Unit tests / Test (3.14)`, `client-unit-test` and `Test (3.14, galaxy_api)` pass on the PR, which is the only evidence the new tests run.
- `client/src/utils/duration.ts` was copied to the scratchpad and exercised under Node for the rounding values below.
- `effective_storage_duration` logic was re-typed in a scratch script to check the swapped-argument cases below.
- API, integration and Selenium suites not run, per the brief.

## Challenge of each test

| Test | Verdict | Why |
| --- | --- | --- |
| `test_short_term_storage.py::test_effective_duration_matches_new_targets` | Keep; add rows | Goes through real `ShortTermStorageManager.new_target`, so it does hold the "API cannot drift from `new_target`" claim at the unit level. No explicit `duration` row (P3 3). |
| `test_ConfigSerializer.py::test_short_term_storage_effective_duration` | Replace at integration layer | `SimpleNamespace` fake config. Rows repeat the table above and cannot catch swapped arguments (P2 1). |
| `test_configuration.py::test_short_term_storage_effective_duration` | Keep | Covers key exposure to registered and anonymous users. It cannot catch swapped arguments (P2 1). |
| `duration.test.ts` format table | Keep; add rows | Pure function with a second consumer planned, right layer. All rows are exact multiples, so `Math.round` and `Math.max` are unpinned (P3 2). |
| `duration.test.ts` invalid-input table | Keep | The config store is typed `any`, so the `"86400"` row guards a real runtime path despite the cast. |
| `ExportToAnotherGalaxyDialog.test.ts` "states how long the link lasts" | Keep | Asserts visible text from a mocked server response. Not a prop-to-attribute test. |
| `ExportToAnotherGalaxyDialog.test.ts` "says 24 hours when ... does not report" | Keep | Removing the fallback fails it. It does not separately pin "config not loaded yet", since the link arrives after several requests, but the code path is the same `undefined` fallback, so not raised. |

## The swapped-argument check

`effective_storage_duration(default, maximum)` is symmetric whenever both values are set: it returns the smaller either way. It is also symmetric for the server defaults. Results:

| default, maximum | Correct | Swapped |
| --- | --- | --- |
| 86400, 0 (API test) | 86400 | 86400 |
| 604800, 86400 (serializer row) | 86400 | 86400 |
| None, 3600 (serializer row, by inspection) | 3600 | 3600 |
| 172800, 0 (no test at serializer level) | 172800 | 86400 |

So every serializer-level assertion in the PR passes with the arguments swapped in the serializer lambda. Only a non-default default with no maximum tells them apart, and that is the exact configuration of the PR's manual test step 2. The `86400, 0` row in the serializer table is also the coincidental one.

`new_target` wiring in `lib/galaxy/app/__init__.py` (lines 783-793) is separate from the serializer, and no test covers both against a real config.

## E2E

No test in `lib/galaxy_test` and no entry in `client/src/utils/navigation/navigation.yml` or `lib/galaxy/navigation/navigation.yml` touches this dialog; that gap predates the PR. The button requires `enable_celery_tasks`, which `IntegrationTestCase` enables via `UsesCeleryTasks`, so `test/integration_selenium/` fits and can also set the durations. The PR's manual steps 1-2 are already the script.

Value here is modest: one sentence of text. The real seam is the key string, because `GalaxyConfiguration` is `any`, so a mismatch between `configuration.py` and the Vue file passes typing, Vitest and the API test alike. Hence P3, not P2.

## Test plan

1. Delete `test/unit/app/managers/test_ConfigSerializer.py`.
2. Add `test/integration/test_short_term_storage_configuration.py`, modeled on `test_subdomain_switcher_configuration.py`, with two classes (sketch in `test_challenges_review.md`). Allocator access follows `test/integration/test_celery_tasks.py:91`.
3. Optionally add `test/integration_selenium/test_export_to_another_galaxy.py` plus a `navigation.yml` entry for `[data-description="export to another galaxy"]`, on the expanded dataset item.
4. Add rounding rows to `duration.test.ts`.
5. Add explicit-duration rows for `effective_storage_duration`.

## Considered and not raised

- API test's fixed `86400`: would fail against an external server that sets either option, but `test_normal_user_configuration` in the same file already asserts a server-configurable default (`subdomain_switcher == []`), so it follows the file's convention. Loosening it would also weaken an exact assertion.
- Reuse: `client/src/utils/dates.ts` and other duration helpers are out of this profile's scope.
- History and invocation export wizards still saying 24 hours: called out in the PR description.
- `mount` over `shallowMount` in the dialog test: the file already did this, and the assertions need the full dialog body.
- Vitest tests only checking a prop, and Galaxy doctests: excluded by the brief.
- Rounding oddities such as `3599` giving "60 minutes" and `172799` giving "48 hours": harmless given "usually after", noted under P3 2 only as test rows.
