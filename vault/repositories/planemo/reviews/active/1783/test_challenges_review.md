# Test challenges review — planemo #1783

- Profile: generic_test_challenger (`_shared/reviewers/generic_test_challenger.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `431a1bf542a221ef58d5750d4802de3e97511d19`
- Debrief and test plan: [test_challenges_debrief.md](test_challenges_debrief.md)

Verdict: the `HashMirrors` unit tests are good behavioral tests (HTTP mocked with `responses`, malformed-hash and unreachable-mirror cases covered) and should stay. The gap is at the seam with galaxy-tool-util: the `stage_in` tests mock the staging interface away, so the property the PR's safety argument rests on (the mirror URL reaches Galaxy with the declared hashes) is untested. 18 tests pass locally (`test_test_data_mirrors.py` + `test_galaxy_activity.py`).

## P2 1 — Untested: rewritten inputs reach Galaxy's fetch payload with their hashes

The PR's "mirror does not need to be trusted" argument depends on galaxy-tool-util putting the declared `hashes` into the fetch element of every File that `rewrite_job` rewrites. `_rewrite_file` also copies galaxy-tool-util logic (the `location` vs `path` choice, the name taken from the original URL). The three `stage_in` tests patch `PlanemoStagingInterface` wholesale and only assert the kwargs passed to the mock, so a galaxy-tool-util change that dropped `hashes` from URL fetch elements, or changed which key it reads, would pass every test while Galaxy quietly accepted unverified mirror bytes.

A probe with a real `StagingInterface` subclass that captures `_post` confirms the invariant holds today for a top-level File, a list item and both elements of a nested `list:paired`: each element has `src: url`, the mirror `url`, the declared `hashes`, and the original-URL name.

Fix: add a contract test using a small capture fake (subclass `galaxy.tool_util.client.staging.StagingInterface`, override `_post` to record payloads and return a canned `{"id", "outputs", "jobs"}`, `use_fetch_api = True`). Stage a rewritten job and assert `url`/`hashes` per fetch element for the supported shapes, and that record/composite Files keep the origin URL. About 40 lines, no Galaxy needed.

## P3 1 — `stage_in` tests mock around an inline decision; `use_fetch_api` true by accident

`test_stage_in_uses_mirror` leaves `psi.use_fetch_api` as an auto-created `MagicMock` attribute, so the gate under test is truthy by accident (the sibling test sets it `False` explicitly). All three `stage_in` tests repeat the same job-file/runnable/patch setup and call `hash_mirrors.cache_clear()` ad hoc. The patching exists only because the job-kwds decision sits inline in `stage_in`.

Fix: move the decision into a helper, e.g. `staging_job_kwds(job_path, mirrors, use_fetch_api) -> dict` in `test_data_mirrors.py`, and test it directly on a temp job file with no `mock.patch`. If the current tests stay, at least set `use_fetch_api = True` explicitly and put `cache_clear()` in an autouse fixture.

## P3 2 — Optional: Galaxy-backed end-to-end test of the mirror path

The PR describes a manual end-to-end check (unresolvable origin, two mirrors, first 404, second 200; then tampered bytes fail with `Failed to validate upload`). `tests/test_cmd_test.py` already has Galaxy-backed tests under `@skip_if_environ("PLANEMO_SKIP_GALAXY_TESTS")`, and `tests/test_gravity_multiprocessing.py` already starts a local `HTTPServer`. Encoding the positive case there (local mirror serving `sha1/<2>/<hash>`, `--test_data_mirror http://127.0.0.1:<port>/`) would guard the full CLI → staging → Galaxy fetch path. Optional: P2 1 covers planemo's side, and the hash check itself is Galaxy's job. Caveat: Galaxy may refuse loopback URLs unless `fetch_url_allowlist` permits them.

## Not findings

- Option/env-var wiring: probed with `CliRunner`. Space-separated `PLANEMO_TEST_DATA_MIRROR` splits into a tuple as documented. Framework behavior, no test needed.
- `test_rewrite_job` packs ten cases into one test; parametrizing would localize failures, but it's a preference.
