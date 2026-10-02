# pulsar#526 - Fix curl redirect handling, unresumable downloads and TUS action rebuild

- PR: https://github.com/galaxyproject/pulsar/pull/526 (nuwang)
- Worktree: `~/projects/worktrees/pulsar/pr/526` @ `1f7eb9a` (vs fetched `origin/master`)
- Commits: `bf3e3ad` (curl redirects + restart unresumable downloads), `1f7eb9a` (TUS `from_dict`)
- Size: +113/-20 across `pulsar/client/transport/curl.py`, `pulsar/client/action_mapper.py`, two test files

## Summary

There are three staging fixes, and all three bugs are real. I reproduced each one on master using the PR's own tests:

1. The curl `get_file` did not follow redirects. A 302 raised a non-200 error, and the redirect body would have been written into the target file. The requests transport already followed redirects, so behaviour depended on whether pycurl was installed.
2. When a partial file exists, the curl transport resumes with a Range request. Galaxy's job files API ignores Range and answers 200 with the whole file. libcurl then fails with `CURLE_RANGE_ERROR` (33). The partial file stays in place, so every retry fails the same way.
3. `RemoteTransferTusAction.from_dict` returned a plain `RemoteTransferAction`. When the Pulsar server rebuilt actions from the launch config, TUS uploads were silently replaced by a multipart POST.

The fixes are correct and small. `get_file` was split into `get_file` (decides the resume offset, restarts once) and `_download` (one transfer). That split makes the code clearer than the old `success_codes`/`size` juggling.

## Verdict

**Approve with nits.** Nothing here blocks merge. The one thing worth asking for: the redirect-loop test is not red-to-green, so the PR body's claim that "each fails without its fix" is inaccurate. Details and a two-line fix are below.

## Fix 1 - follow redirects (`curl.py:126-127`, `curl.py:87`)

- **Bug is real.** On master, `test_curl_get_file_follows_redirect` fails with `transport code: 302 ... returned status code of 302`.
- **Root cause addressed.** The fix sets `FOLLOWLOCATION` and `MAXREDIRS=5` in `_download`, and `get_size` HEAD now uses `allow_redirects=True`. Without the HEAD change, the size check would see the 302 (`>= 299`) and return -1, so resume would never be attempted behind a redirect.
- **Security check: no header or credential leak found.**
  - `_curl_object_for_url` sets no `HTTPHEADER` or `USERPWD`, so there is nothing to forward to another host.
  - The job key lives in the URL query, so the redirect target sees only what the `Location` header gives it.
  - `AUTOREFERER` is off by default, so the original URL (and its job_key) is not sent as a Referer.
  - `CURLOPT_REDIR_PROTOCOLS` defaults to http/https/ftp(s), so a redirect to `file://` is refused.
  - `requests.head` drops `Authorization` on a redirect to another host.
  - The method stays GET, since only `get_file` follows redirects.
  - `post_file` (`curl.py:68`) correctly still does **not** follow redirects. Following them would turn a 302'd POST into a GET.
- **Coverage across transports.**
  - The requests transport already followed redirects. `test_requests_get_file_follows_redirect` passes on master and is a parity test by design, which is fine.
  - `PycurlTransport.execute` (`curl.py:38`, used for API calls) still does not follow redirects, while the urllib and requests transports do. This is out of scope and non-blocking; noted for parity.
- **Note: HEAD against a presigned URL.** A presigned S3 URL is signed for GET, so the HEAD in `get_size` will likely get a 403 and return -1. The download then restarts from zero instead of resuming. That is a graceful fallback, just worth knowing for the presigned-redirect future the PR body mentions.
- **Nit (test): `test_curl_get_file_redirect_loop_fails` (`client_transport_test.py:171`) is not red-to-green.**
  - It passes on master, because the bare 302 already raises `PulsarClientTransportError`.
  - With libcurl >= 8.3 (local: 8.22), the default redirect cap is already 30, so nothing tests `MAXREDIRS=5` either.
  - I checked on the PR branch: the loop ends with `transport_code == 47` (`E_TOO_MANY_REDIRECTS`), message "Maximum (5) redirects followed", after 6 requests.
  - Suggestion: assert `exc.value.transport_code == pycurl.E_TOO_MANY_REDIRECTS`, which fails on master where the code is 302. Optionally, have `_RedirectApp` count calls and assert `MAX_REDIRECTS + 1` so the cap itself is pinned.

## Fix 2 - restart downloads the server cannot resume (`curl.py:98-116`)

- **Bug is real.** On master, `test_curl_get_file_resume_against_server_ignoring_range` fails with `pycurl.error: (33, 'HTTP server does not seem to support byte ranges. Cannot resume.')`.
  - Scenario: an earlier attempt leaves a partial file. The retry sends HEAD, which returns the full size, so the code resumes. Galaxy's job files API ignores Range and answers 200, so libcurl gives error 33. The partial file stays, so every retry repeats the failure.
- **Fix is sound.**
  - It is a single fallback (`_download(url, path, 0)` opens with `'wb'` and truncates), not a loop.
  - It triggers only when `resume_from` is non-zero.
  - It is keyed on the curl error code.
  - libcurl checks the Range response before writing any body, so nothing is appended to the prefix.
- **Nit (optional): `transport_code` holds two kinds of value.** It carries either an HTTP status or a curl error code, and `transient.http_status_code` treats both as HTTP statuses. The check `exc.transport_code == pycurl.E_RANGE_ERROR` (`curl.py:112`) cannot collide in practice, since no HTTP status is 33. Mapping 33 to a named code in `_error_curl_to_pulsar` would be cleaner. The overloading predates this PR, so don't block on it.
- **Related gap, pre-existing (confirmed locally): partial file larger than the remote file.**
  - If the local partial is larger than `remote_size` (e.g. the remote file was regenerated smaller), the code still resumes from `size`.
  - A server that honours Range answers 416. libcurl treats that as CURLE_OK with HTTP code 416, and `_download` raises NOT_200/416.
  - 416 is not transient, so it is never retried. The oversized file stays, and every later attempt fails with 416.
  - Reproduced with `webob.static.FileApp`: partial `abcdefXYZ` against remote `abcdef` fails with 416 twice and the file is unchanged.
  - It is the same class of bug as the one this PR fixes (a leftover partial that can never be completed). A cheap guard would be to resume only when `size < remote_size` and otherwise start over. That fits in the existing `if remote_size != -1` branch at `curl.py:106`. Suggest folding it in here or doing it as a follow-up.
- **Other transports.** The requests `get_file` (`requests.py:43`) never resumes and always writes with `'wb'`, so it is not affected. The ssh transports are unrelated.

## Fix 3 - TUS action rebuild (`action_mapper.py:526`)

- **Bug is real.** On master, `test_tus_action_rebuilt_from_launch_config_uploads_with_tus` fails: `post_file` is called instead of `tus_upload_file`. The `to_dict` output already carried `url`, `source` and `action_type`, so only the class was lost.
- **The one-word fix is correct, but the root cause is copy-paste.**
  - `RemoteTransferTusAction` (`action_mapper.py:507-532`) is a line-for-line copy of `RemoteTransferAction` (`479-504`), differing only in `action_type` and `write_from_path`. The copied `from_dict` kept the original class name.
  - Leaving a reusable shape behind would mean making `RemoteTransferTusAction` subclass `RemoteTransferAction`, overriding only `action_type` and `write_from_path`, and using `cls(...)` in `from_dict`.
  - I checked for `isinstance(`/`type(` checks against `RemoteTransferAction` in `pulsar/` and `test/` and found none, so subclassing is safe.
  - The other `from_dict` implementations hardcode their class names too (`RemoteCopyAction`, `RsyncTransferAction`, ...), but each one is currently correct.
- **Test.** The mock-based test is justified: the test suite has no TUS server (the `tus` grep hits in `test_utils.py` are all "status"), so a real TUS round trip isn't practical. A cheap guard would catch the next copy-paste slip:
  - Add one parametrized test over `DICTIFIABLE_ACTION_CLASSES` asserting `type(from_dict(a.to_dict())) is type(a)`.
  - That covers every dictifiable action, where the current test covers only TUS.
  - Optional; not required for merge.

## Style and focus checks

- Imports: the new test imports are at module top, and there are no imports inside functions.
- Comments:
  - `MAX_REDIRECTS` explains *why* it is bounded (libcurl < 8.3 loops forever), which is useful.
  - The `FOLLOWLOCATION` comment ("Galaxy may redirect ... presigned") is borderline but explains motivation.
  - The `log.info` on restart is appropriate.
- No tests or assertions were weakened. The tests are integration-style against real WSGI servers (`server_for_test_app`), not mocks, except the TUS one, which is justified above.
- `_RedirectApp` is a small reusable test helper. It could live next to `_FlakyApp` in the same file, which it already does.

## Test results

- PR branch: `pytest test/client_transport_test.py test/transfer_action_test.py test/action_mapper_test.py` gives **31 passed**.
- `ruff check .`: **All checks passed**.
- Red check: a temp copy of HEAD with master's `curl.py` and `action_mapper.py`, run with `-k "redirect or range or tus_action_rebuilt"`, gives **4 failed, 2 passed**.
  - Failed as expected: `test_curl_get_file_follows_redirect` (302), `test_get_size_follows_redirect`, `test_curl_get_file_resume_against_server_ignoring_range` (curl 33), `test_tus_action_rebuilt_from_launch_config_uploads_with_tus`.
  - Passed on master: `test_requests_get_file_follows_redirect` (a parity test, expected) and `test_curl_get_file_redirect_loop_fails` (not red; see the Fix 1 nit).
- Ad-hoc checks on the PR branch (scratch scripts, not committed):
  - The redirect loop ends with curl code 47 after 6 requests.
  - The 416 scenario for a partial file larger than the remote is confirmed.
- Environment: PycURL 7.48.0 / libcurl 8.22.0, Python 3.14.

## Suggested asks for the author (proportionate)

1. Make the redirect-loop test assert `E_TOO_MANY_REDIRECTS`, so it is actually red-to-green and pins the cap. Adjust the PR body's "each fails without its fix".
2. Optional: have `RemoteTransferTusAction` subclass `RemoteTransferAction` and use `cls(...)` in `from_dict`, plus a parametrized type round-trip test over `DICTIFIABLE_ACTION_CLASSES`.
3. Optional or follow-up: start over when `size > remote_size`, which removes the 416 dead end.

## Follow-up pushed to the PR (2026-09-30)

At John's request, two commits on top of `1f7eb9a`:
- `bb67e45`: resume only a partial file smaller than the remote one; treat a 416 on resume as "start over". The redirect-loop test now asserts curl's too-many-redirects error (code 47) and `MAX_REDIRECTS + 1` requests.
- `9f19f90`: `BaseRemoteTransferAction` shared by the POST and TUS actions (`from_dict` returns `cls(...)`). Parametrized round-trip test over `DICTIFIABLE_ACTION_CLASSES`.

All new tests fail against master's `curl.py`/`action_mapper.py`. Full suite: 434 passed, 2 k8s failures (no cluster).

## CI fix pushed (2026-10-01, commit 43bdf61)

All 8 test jobs were red on one test, `test_get_size_follows_redirect` (`-1 == 9`), from nuwang's 1f7eb9a onward. CI points `files_server()` at the pinned `galaxy/simple-job-files` image (the only one ever published, 2022-10-12, simple-job-files 0.1.1), which has no HEAD handler, so `get_size` got a 500. Reproduced locally by serving 0.1.1 as `PULSAR_TEST_EXTERNAL_JOB_FILES_URL`. The test now serves its file from a local `JobFilesApp`, like the resume tests. Bumping the image to 0.2.x would let the external-server path cover HEAD as well; worth doing separately.
