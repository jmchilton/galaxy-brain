Reject relative job files write paths and bring 25.1's upload-source validation in line with dev's `JobFilesManager` (4xx instead of 500).

`POST /api/jobs/{job_id}/files` on `release_25.1` trusts its form fields more than dev does. A malformed request from a job runner surfaces as an `AssertionError`, `ValueError`, `TypeError`, `AttributeError` or `FileNotFoundError` 500, and the nginx store check is a string-prefix `startswith` on an unnormalized path. Dev's `JobFilesManager` already resolves and validates each upload source; this ports that validation, with dev's messages and exception classes, into the 25.1 controller. A relative write `path` is worse than a 500: the write check and the write itself disagree about what it means.

***Upload-source checks are a port of dev; the absolute-path check is new on both, and dev gets it at the 26.1→26.2 merge. Dev's FastAPI `JobFilesManager` rewrite is too large for a release branch, so only its validation is ported.***

| Request | Before (`release_25.1`) | After |
| --- | --- | --- |
| Relative `path` | checked as if under the job working directory, then written relative to Galaxy's process cwd 😬 | 400 `'path' parameter must be an absolute path.` ✅ |
| Non-string `path` (e.g. `123`) | 500 `TypeError` 😬 | 400 `'path' parameter must be an absolute path.` ✅ |
| No `file` part, or `file` sent as a plain form field | 500 `AttributeError` 😬 | 400 `No file uploaded.` ✅ |
| tus `session_id` malformed (`not/a-session`, `null`) | 500 `ValueError` / `TypeError` 😬 | 400 `Invalid session id format.` ✅ |
| tus `session_id` well-formed but unknown | 500 `FileNotFoundError` 😬 | 400 `No upload found for session id.` ✅ |
| nginx `__file_path` containing `..` that leaves the store, or relative | accepted when it starts with the store string; relative 500s 😬 | 400 `Filename provided by nginx is not in the configured upload directory.` ✅ |
| nginx `__file_path` in the store but missing | 500 `FileNotFoundError` 😬 | 400 `File provided by nginx does not exist.` ✅ |
| nginx upload with `nginx_upload_job_files_store` unset | 500 `AssertionError` 😬 | 403 naming `nginx_upload_module` ✅ |
| Valid multipart, tus or nginx upload | 200 | 200 (unchanged) |

***Who's affected: only job runners talking to the job files API (Pulsar's remote-transfer staging). Pulsar already sends absolute paths, and deployed nginx upload configs use absolute store paths, so well-formed traffic is unaffected.***

The nginx and tus checks live in two private helpers, `__nginx_upload_path` and `__tus_upload_path`, named after dev's `JobFilesManager.nginx_upload_path` / `tus_upload_path` so the 25.1 and dev code read side by side. The nginx check uses `util.in_directory` on an `abspath`, as dev does. Separately, job ports registration (`JobPortsView.register_container_information`) now logs the job id and container runtime instead of the full request kwargs.

***Writes only. Reads (`GET`) aren't path-restricted, by design, and dev's read-side and unknown-job 404s are not ported here.***

<details><summary>Why the <code>isinstance</code> checks</summary>

`expose_api` JSON-decodes every form value (`__extract_payload_from_request` in `lib/galaxy/web/framework/decorators.py`), so `"null"` arrives as `None` and `"123"` as an `int`. Without the guards those requests still 500. The tests send each of them. Dev's FastAPI route receives plain strings, which is why dev has no such guards.

</details>

## Risks

Low, mostly a two-way door: the one behavior a client could depend on is relative write paths, which are now rejected on a release branch.

<details><summary>Risk Details</summary>

- A job runner that sends relative `path` values gets a 400 where it used to write relative to Galaxy's process cwd. Pulsar sends absolute paths.
- An nginx upload file under the store that symlinks outside it is now rejected. Known deployment configs use absolute store paths.
- Clients that matched on 500s for these cases now see 400/403.

</details>

<details><summary>Risk Review Advice</summary>

Check the `isabs` placement in `create` (after the empty-`path` check, before `__check_job_can_write_to_path`) and the nginx containment check in `__nginx_upload_path`. `test_write_with_nginx_upload_module` is a positive control that passes on the base, so an over-strict nginx check would show up there.

</details>

## Context

From 26.2 on this API lives in `JobFilesManager`, which already has the upload-source checks; the absolute-path check belongs in `JobFilesManager.authorize_write` and needs a hand port at the 26.1→26.2 merge (26.0 and 26.1 merge cleanly). Alternative kept on 🌿[`job_files_resolve_paths_25.1_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/job_files_resolve_paths_25.1_alt_original_scope) - only the absolute-path check and the ports log line, without the upload-source 4xx handling. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Shipped as implemented; porting dev's read-side and unknown-job 4xx handling was offered and declined.</summary>

- Round 1 expanded the branch from the absolute-path check to dev's upload-source validation, so the 26.2 merge for that part is "take dev".
- Round 2 suggested also porting dev's read errors (missing file 404, directory 400, the `dataset_*.dat` fall-through that returns an empty 200) and unknown-job 404. Kept out of this release-branch PR.
- Considered and not taken: dev's single `write(path, source_path)` model (changes multipart tempfile cleanup on a release branch), dev's `job_files_tus_upload_dir` config property, asserting error codes instead of messages.
- Possible split: the leading baseline-tests commit can merge on its own.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/job_files_resolve_paths_25.1/scope_evaluation/). Run via Claude Opus 5.5 at low effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approved after pulling the nginx and tus validation out of <code>create</code> into helpers.</summary>

- `create` is back to a short dispatch over the upload source; the helpers mirror dev's manager methods one-to-one.
- The `isinstance` guards are needed (JSON-decoded form values), not optionality churn.
- Recommended, not done: dev's single `write()` model, which would remove the open-only-to-read-`.name` pattern. Out of scope on 25.1.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/job_files_resolve_paths_25.1/thermo_nuclear_review/). Run via Claude Opus 5.5 at low effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Strengthened the nginx rejection assertion; the rest held up.</summary>

- `_assert_nginx_upload_rejected` used an OR-check that could never take its first branch; it now asserts the target is still empty, matching dev.
- `test_write_invalid_upload_sources_rejected` bundles several cases, each with its own request, status and message, to keep the release-branch diff small. Each one 500s on the base.
- Every non-baseline test fails on the base at its own status assertion.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/job_files_resolve_paths_25.1/test_challenges_debrief/). Run via Claude Opus 5.5 at low effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex found three remaining 500s from JSON-decoded form values; all fixed with tests.</summary>

- `session_id=null`, `__file_path=null`, and `file` sent as a plain string each still 500'd. Each now gets a 400 and is covered by `test_write_invalid_upload_sources_rejected`.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/job_files_resolve_paths_25.1/codex_review/). Run via gpt-6-sol at medium effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Split a leading baseline-tests commit that passes on the base.</summary>

- It adds the `_post_job_files` helper (used by the existing write tests), the class-level nginx upload store config, and `test_write_with_nginx_upload_module` as a positive control.
- No behavior-neutral controller extraction first: the helpers are extracted and given new validation in the same step.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/job_files_resolve_paths_25.1/baseline_refactor/). Run via Claude Opus 5.5 at low effort.

</details>

## John's Checklist

- [x] What does the user see when it fails? The job runner calling `POST /api/jobs/{id}/files` gets a 400 with a specific message (or a 403 when nginx uploads arrive with `nginx_upload_job_files_store` unset) instead of a 500. No end-user UI involved.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Integration tests assert status, message and filesystem effects (target untouched, outside file kept, relative dir not created), plus a positive nginx-upload control.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The first commit is green on the base; each later commit pairs its change with its red-to-green tests.
- [x] Are the comments free of excess archeology? Yes. The only new comment explains the `isinstance` guard.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test/integration/test_job_files.py`: `test_write_relative_path_rejected`, `test_write_invalid_upload_sources_rejected`, `test_write_with_nginx_upload_module_rejects_path_outside_store` and `..._rejects_relative_path` fail on `release_25.1` (200 or 500) and pass with the change. `test_write_with_nginx_upload_module` passes on both.
- `test_read_fails_if_input_file_purged` fails identically on the base when run with the full class (it depends on test order); untouched here.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
