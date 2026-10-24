# Normal review debrief

Reviewed `5f0c25b9`; fixes in `3c8f8d5b`. I fixed the real bug: a scan error escaped `register_job_data` and dropped the test's result, so later results got attached to the wrong tests. The check now fails closed with status `error`. I also added an 8-char minimum (shorter secrets are skipped with a warning), wrapped and URL-safe base64 matching, and switched to `galaxy_interactor.api_key`. Unit tests cover each of these, and the integration test passes.

Not acted on:

- Streaming or capping output downloads: `GalaxyInteractorApi._get` takes no `stream` argument, and test outputs are small. Noted for the PR.
- Reusing the interactor's retrying fetcher: it's name-mangled (`__dataset_fetcher`). A scan error now fails the test visibly instead of silently.
- Typing against `DirectCredential`: `galaxy.tool_util_models.testing_types` may not exist at planemo's `galaxy-tool-util>=25.1` floor.
- Moving the check into `galaxy.tool_util.verify`: kept in planemo, per the issue record. An upstream hook is a possible follow-up.
- Checking the API key for every tool, not only `inject="api_key"` ones: a 32+ char key rarely collides. Called out as a decision.
- `extra_files_path`, discovered collection elements, `job_messages` repr escaping, stdio truncation: documented as best effort.
- Duplicate report (stderr plus the `misc_info` copy): harmless, and it shows where viewers see the secret.

<details><summary>Full review</summary>

Verdict: sound approach, small readable code. One real bug: an API error during the scan drops the test from the results. Plain-text matching also needs a minimum length. The base64 alignment logic is correct.

1. bug: a scan error drops the test result (`engine/galaxy.py:135`, `secrets.py:79-86`). It raises inside verify_tool's `finally`, so the append is skipped and `except: pass` swallows the error. `_collect_test_results` then zips the results misaligned. Fix: fail closed and always append.
2. bug/should: short secrets cause false positives. Apply a minimum length to every needle.
3. should: every output is downloaded in full with no cap. Use `stream=True` and chunked scanning, or a size cap.
4. should: private `_get` with no retry. Use the interactor's retrying fetch, or upstream a public helper.
5. should: location and coupling. Secrets come from planemo's `test_case.test_dict`, while the server-side test dict is what runs. Consider an upstream hook. Type against `ToolTestDescriptionDict`/`DirectCredential`.
6. should: the API key is checked for every tool, but the issue scopes it to `inject="api_key"`. Prefer `galaxy_interactor.api_key`. State the fail-vs-warn choice.
7. coverage gaps: extra files, discovered collection elements unverified, `job_messages` repr, stdio truncation, wrapped base64, base64url, `quote_plus`.
8. nit: duplicate report via `misc_info`.
9. nit: make the module constants private.
10. nit: the unit tests importing `_leak_problems` are fine.

</details>
