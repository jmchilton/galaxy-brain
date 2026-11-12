# Test challenges debrief — planemo #1783

- Profile: generic_test_challenger (`_shared/reviewers/generic_test_challenger.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `431a1bf542a221ef58d5750d4802de3e97511d19`

## What was run

In a scratch copy of the PR head (`git archive`, uv venv, py3.11, `dev-requirements.txt`):

- `pytest tests/test_test_data_mirrors.py tests/test_galaxy_activity.py` — 18 passed.
- Probe: `test_data_mirror_option()` under `CliRunner` — `PLANEMO_TEST_DATA_MIRROR="https://a/ https://b/"` gives `('https://a/', 'https://b/')`; repeated flags give a tuple; unset gives `()`. Option wiring works; no test needed (it's click behavior).
- Probe: real `galaxy.tool_util.client.staging.StagingInterface` subclass that captures `_post`, fed a job rewritten by `HashMirrors.rewrite_job`. The fetch payload carries `src: url`, the mirror `url`, the declared `hashes`, and the original-URL-derived `name`, for a top-level File, a list item, and both elements of a nested `list:paired`. So the "Galaxy verifies the mirror copy" invariant holds today; nothing in the PR's tests checks it.

## Per-test challenge

| Test | Verdict | Notes |
| --- | --- | --- |
| `test_mirror_url_prefers_stronger_hash_and_tries_each_mirror` | keep | Behavioral, `responses`-mocked HTTP. Call-count assertion checks documented caching. |
| `test_mirror_url_none_if_no_mirror_has_file` | keep | Covers 404, connection error, unknown function. |
| `test_mirror_url_skips_malformed_hash_values` | keep | Guards URL injection; zero-request assertion is the point. |
| `test_unreachable_mirror_is_not_asked_again` | keep | |
| `test_rewrite_job` | keep (optional parametrize) | Ten cases in one test; one failing case hides the rest. Parametrizing rewritten vs. untouched inputs would localize failures. Not worth a finding. |
| `test_stage_in_uses_mirror` | rewrite | Patches `PlanemoStagingInterface` wholesale and only checks kwargs handed to the mock. `use_fetch_api` is left as an auto-created `MagicMock` attribute, so the gating condition is true by accident. Doesn't show the rewritten job reaches Galaxy with hashes. |
| `test_stage_in_without_fetch_api_does_not_use_mirror` | rewrite | Same mock setup; fine assertion. |
| `test_stage_in_without_mirror_passes_job_path` | rewrite | Same mock setup. |

Mocks: the three `stage_in` tests duplicate a job-file/runnable/patch setup and call `hash_mirrors.cache_clear()` ad hoc (process-global `lru_cache`). The only reason they patch `PlanemoStagingInterface` is that the job-kwds decision sits inline in `stage_in`.

## Test plan (recommendations; PR not edited)

1. **Contract test against real galaxy-tool-util staging (P2 1).** In `tests/test_test_data_mirrors.py`, add a small capture fake: subclass `StagingInterface`, override `_post` to record payloads and return `{"id": ..., "outputs": [{"id": ..., "hid": 1}], "jobs": []}`, `_attach_file` returns the path, `_handle_job` no-op, `use_fetch_api = True`. Stage a rewritten job and assert, for top-level / list / nested collection Files, that each fetch element has `url == mirror_url` and the declared `hashes`. Also stage the record and composite cases and assert they keep the origin URL. ~40 lines. Catches a galaxy-tool-util change that drops `hashes` or changes the `location`/`path`/`name` handling that `_rewrite_file` copies ("same choice as galaxy-tool-util's staging").
2. **Drop the mocks by moving the decision out of `stage_in` (P3 1).** E.g. `staging_job_kwds(job_path, mirrors, use_fetch_api) -> dict` in `test_data_mirrors.py`; `stage_in` calls it with `psi.use_fetch_api`. The three `stage_in` tests become direct calls on a temp job file, no `mock.patch`, no `MagicMock` config. If the patching stays, set `use_fetch_api = True` explicitly in `test_stage_in_uses_mirror` and move `cache_clear()` into an autouse fixture.
3. **Optional Galaxy-backed test (P3 2).** Under `@skip_if_environ("PLANEMO_SKIP_GALAXY_TESTS")` in `tests/test_cmd_test.py`, mirror the PR's manual check: local `http.server` serving `sha1/<2>/<hash>`, a workflow job input at an unresolvable origin (`https://zenodo.invalid/...`) with that SHA-1, `--test_data_mirror http://127.0.0.1:<port>/`; expect pass. Optional negative: wrong bytes on the mirror, expect failure. Caveat: Galaxy may refuse loopback URLs unless `fetch_url_allowlist` covers 127.0.0.1; check before writing.

Not recommended: tests for click env-var splitting (probed, framework behavior), the `job_path is None` branch, timeouts.
