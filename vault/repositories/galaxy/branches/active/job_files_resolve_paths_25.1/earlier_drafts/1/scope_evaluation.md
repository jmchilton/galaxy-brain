Run via Claude Opus 5.5 at low effort.

# Scope evaluation: job_files_resolve_paths_25.1

**Recommendation: modest expansion (scope 2).** Keep the two existing commits. Add one commit that brings dev's upload-source input validation in `JobFilesAPIController.create` back to 25.1. That means the nginx `__file_path` containment check and is-file check, the tus `session_id` format and missing-upload errors, and the missing-file-body error, all returning 400 where 25.1 now gives a 500 or relies on an `assert`. It touches the same function, is the same kind of input validation, stays around 20 more lines with tests, and lets the 26.2 merge take dev's version cleanly. The dev-side `isabs` and log-line port belongs in the merge-forward, not in this branch. Upload bodies staged before the job_key check stay deferred, per John.

Branch is ~14 lines; no decomposition section.

## 1. As implemented

`POST /api/jobs/{id}/files` returns 400 for a non-absolute `path` before the working-directory/output check. The job ports view logs job id and runtime instead of the full request kwargs.

| Pros | Cons |
|---|---|
| - Tiny, obviously correct, red-to-green test<br>- No real client sends relative paths (Pulsar posts absolute paths)<br>- Merges clean to 26.0/26.1 | - Leaves 500s and `assert`-based checks on the upload source a few lines lower in the same function<br>- 26.2 merge still needs hand resolution in `authorize_write` |

## 2. As implemented + dev's upload-source checks in `create` (recommended)

Same as scope 1, plus 400s that match dev's `JobFilesManager.nginx_upload_path` / `tus_upload_path` and the "No file uploaded." check: `__file_path` must be inside `nginx_upload_job_files_store` (`util.in_directory`, not `startswith`) and exist, `session_id` format and missing upload give 400, and a missing `file`/`__file` gives 400. Keep 25.1's `tus_upload_store_job_files or tus_upload_store or new_file_path` lookup; change only the error handling.

| Pros | Cons |
|---|---|
| - Same function, same input-validation theme; reviewers would expect it fixed together<br>- `assert` is stripped under `python -O` and gives a 500; the prefix check accepts sibling dirs such as `/store2` for `/store`<br>- Brings 25.1 in line with dev, so the 26.2 conflict resolution is "take dev"<br>- Error codes already pinned on dev (`a784cbd98ea`), so the expected messages are known | - Grows the PR beyond the original two items<br>- nginx path needs a config-specific integration test (or a unit test with a patched config)<br>- Changes response codes (500 → 400) on 25.1, which is unlikely to matter to clients |

<details>
<summary>Current 25.1 code vs dev</summary>

- nginx: 25.1 has `assert upload_store` and `assert file_path.startswith(upload_store)`. Dev raises `ConfigDoesNotAllowException` when no store is configured, and `RequestParameterInvalidException` when the path is not inside the store or not a file.
- tus: 25.1 raises `ValueError("Invalid session id format.")`, which is a 500, then calls `open()` without checking the file exists. Dev raises `RequestParameterInvalidException` for both cases.
- body: 25.1 calls `payload.get("file", payload.get("__file", None)).file`, which raises `AttributeError` (500) when neither field is sent. Dev raises `RequestParameterMissingException("No file uploaded.")`.
- These checks run after `__authorize_job_access`, so they don't touch the deferred ordering question in scope 7.

</details>

## 3. Same check on reads (`GET` / `index`)

Reject relative `path` on reads too. Considered and declined.

| Pros | Cons |
|---|---|
| - Symmetry with writes | - Reads have no containment check by design (loc files), so absolute-only restricts nothing<br>- Pulsar's unstructured/tool-file reads come from rewritten command lines and could legitimately be relative, so this could break a working path |

## 4. Ports view authorization cleanup

De-duplicate `JobPortsView.__authorize_job_access` (it has a TODO), wrap `job_key` in `str()` the way the job files view does, and settle `job.running` vs `non_ready_states`. Not recommended here.

| Pros | Cons |
|---|---|
| - Touched file; the copy-paste TODO is real | - A refactor, not a fix; changes job-state semantics for interactive-tool ports<br>- Dev moved job files to `JobFilesManager`, so a shared helper would conflict at merge; better done on dev against the manager |

## 5. Move `isabs` into `__check_job_can_write_to_path`

Same behavior, placed in the helper that maps onto dev's `authorize_write`.

| Pros | Cons |
|---|---|
| - 1:1 with where the 26.2 port lands | - Puts a 400 (malformed input) inside a helper that otherwise returns 403; current spot sits next to the sibling empty-path 400<br>- Resolution on 26.2 is by hand either way |

## 6. Dev-side companion in this branch

Dev still lacks the check (`authorize_write` accepts a relative path through `in_directory`, then writes relative to CWD) and still has `log.info(kwd)` in the ports view. Recommended path is the merge-forward, as recorded in `index.md`, not a separate dev PR from this branch.

| Pros | Cons |
|---|---|
| - Dev gets fixed without waiting on merges | - Duplicates what the merge-forward does anyway; the test auto-merges and goes red on 26.2 until the port is added, so the gap can't be missed |

## 7. Upload bodies staged before the job_key check / TUS job files router

Bodies are written to disk before authorization, and the TUS job files router accepts uploads with no job_key. This is a resource-use concern. **Already deferred:** John chose to treat it as a dev-only, later decision.

| Pros | Cons |
|---|---|
| - Closes the remaining resource-use gap on this API | - Needs streaming/ordering changes (dev has partially done this with `authorize_write` before body read) and TUS middleware changes; too large and too risky for 25.1<br>- Explicitly out of scope by John's decision |

## 8. Pulsar-side changes

Tracked separately. No change needed for this branch: Pulsar already posts absolute paths.

## Logging hygiene sweep

Grepped `lib/galaxy/webapps` and `lib/galaxy/job_execution` for `log.*(kw|kwd|kwargs|payload)`. After this branch, nothing else logs raw request kwargs, so there is no further logging item.
