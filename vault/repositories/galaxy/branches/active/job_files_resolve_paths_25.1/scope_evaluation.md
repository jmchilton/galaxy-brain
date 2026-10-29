Run via Claude Opus 5.5 at low effort.

# Scope evaluation (round 2, post-rescope): job_files_resolve_paths_25.1

**Recommendation: one more modest expansion (scope 2).** Keep all 4 commits. Add one commit that applies the rest of dev's 4xx handling to the job files API on 25.1:

- **Reads.** A missing file returns 404 and a directory returns 400. Also fix the fall-through where a missing `dataset_*.dat` path with no purged input returns **200 with an empty body**.
- **Unknown job.** Return 404 instead of the `job.state` `AttributeError` 500.

The empty-body 200 is a real correctness bug: Pulsar would stage an empty input without any error. It is in the file this branch already touches. The unknown-job 404 belongs to the same dev commit (`756b283dcaf`) whose upload-source half this branch already ported. The change is about 10 controller lines plus ports of dev's `test_read_missing_file`, `test_read_directory` and `test_unknown_job`. It does not reopen round 1's declined scope 3, which was `isabs` on reads; this is error handling only. Since this is the second evaluation, the workhorse process parks the branch BLOCKED for John's call. The current 4 commits are reviewed and green, so shipping as implemented (scope 1) is also defensible.

## Possible Decompositions

The branch is about +152/−32: roughly 60 controller/view lines and 120 test lines.

- **A. One PR (as is).** Baseline tests → `isabs` → ports log → upload-source 4xx (→ read/unknown-job 4xx if scope 2 is taken).
- **B. Two PRs.**
  1. `isabs` check and the ports log line, with their test and the `_post_job_files` refactor from the baseline commit.
  2. Upload-source 4xx (plus scope 2 if taken), stacked on 1. It needs the baseline's nginx store config and `_write_file`, and its `create` hunks sit next to the `isabs` hunk, so it lands second.
- **C. Baseline tests alone first.** Commit `f9c905af345` passes on base. It can merge as its own "add missing tests" PR, ahead of A or B.

## 1. As implemented

Writes must use absolute `path`s, and the ports view logs the job id and runtime instead of the raw request. Invalid upload sources (no file, bad or unknown tus session, nginx path outside the store or missing, store not set, non-string form values) return 4xx with dev's messages, through `__nginx_upload_path` / `__tus_upload_path`.

| Pros | Cons |
|---|---|
| - Reviewed (normal ×2, Codex, thermo), test-challenged, red-to-green<br>- Matches dev's upload-source half, so the 26.2 merge for that part is "take dev" | - Ports only half of `756b283dcaf`. Unknown job is still a 500<br>- Read path still returns a 200 empty body, or a 500, for a missing file |

## 2. + read errors and unknown job 404 (recommended)

Port dev's `readable_path` outcomes into `index`: a regular file opens as before, an existing non-file gives 400 "Path does not refer to a file.", a purged input still gives `ItemDeletionException`, and anything else gives 404 "File not found." In `__authorize_job_access`, a missing job row gives 404 "Job not found."

| Pros | Cons |
|---|---|
| - Fixes a silent empty-input staging bug in the touched file<br>- Completes the "4xx not 500" theme the rescope started, using dev's own commit as the reference<br>- Tests port directly from dev (`test_read_missing_file`, `test_read_directory`, `test_unknown_job`) | - Second expansion, so it parks the branch BLOCKED<br>- Changes read response codes on a release branch (500/200 → 4xx)<br>- The unknown-job case is rare: it needs a valid job key for a deleted job row |

<details>
<summary>25.1 read path today</summary>

- `index` does `open(path, "rb")`. A directory raises `IsADirectoryError`, which becomes a 500.
- On `FileNotFoundError`: if the basename matches `dataset_*.dat` and some input is purged, the result is `ItemDeletionException`. If it matches but nothing is purged, the `except` block exits without raising and the method returns `None`. `expose_api_raw_*` sends `None` as an empty body (`make_body_iterable`), so the client sees a **200 with no content**. A non-matching name re-raises, which becomes a 500.
- Dev (since `d99ec4de8b0`, the manager extraction) returns 404 in the fall-through. Dev also guards `jtid.dataset` before `.dataset.purged`.
- Prior reviews still apply to the 4 existing commits. New validation would be red/green runs of the three ported tests, plus `test_read_by_state` / `test_read_fails_if_input_file_purged` alone.

</details>

## 3. Contract to `_alt_original_scope`

Drop the upload-source commit and ship only `isabs` plus the log line.

| Pros | Cons |
|---|---|
| - Smallest diff | - Throws away reviewed, tested work that round 1 recommended<br>- Puts back the `assert`/`startswith` nginx checks and the tus 500s |

## 4. Source-path / single `write()` model (thermo, recommend-only)

Each upload source resolves to a `source_path`, and one `write(path, source_path)` moves or appends it. This removes the open-only-to-read-`.name` pattern and the swallowed `close()` `OSError`.

| Pros | Cons |
|---|---|
| - Same shape as dev's `JobFilesManager.write` | - Changes multipart tempfile cleanup on a release branch<br>- The 26.2 merge takes dev's version anyway |

## 5. Port dev's `job_files_tus_upload_dir` config property

Move the `tus_upload_store_job_files or tus_upload_store or new_file_path` fallback into a config property, as dev does.

| Pros | Cons |
|---|---|
| - Same commit as scope 2 on dev | - Touches `config/__init__.py` with no behavior change<br>- Only one caller on 25.1; the merge resolves to dev |

## 6. 26.2+ merge-forward of `isabs`

Add the `isabs` check to `JobFilesManager.authorize_write` when merging 26.1 into 26.2. This is already recorded in `index.md`, and the auto-merged test goes red until it is done. No branch change.

## 7. Error-code assertions (400008/400007)

Assert error codes instead of messages, as dev does. This is test strictness, not scope; it was declined in the rescope review and the 26.2 merge takes dev's tests.

## 8. Ports view auth cleanup / `isabs` in the helper

Round 1 declined both (scopes 4 and 5). Nothing new since.

## 9. Decided by John (not re-argued)

- Upload bodies staged before authorization, and the job files TUS router accepting uploads without a job key: deferred, dev-only.
- Pulsar-side changes: tracked separately.
