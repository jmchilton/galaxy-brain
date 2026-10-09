# pulsar#530 - Confine and fail visibly on unsafe staged-out outputs

Tracking refreshed 2026-10-09: [PR #530](https://github.com/galaxyproject/pulsar/pull/530) remains open at `e9c1838cb21b`, after the reviewed `faedeec` and follow-up `8e56def`. Three Galaxy integration checks are red; the other reported checks pass or skip. The review below is historical; no code re-review or diagnosis of the current failures was performed in this tracking refresh.

- PR: https://github.com/galaxyproject/pulsar/pull/530 (mvdbeek, `mvdbeek:pulsar-confine-work-dir-outputs`)
- Reviewed at: `faedeec` (includes John's merge of `origin/master`, trivial curl.py constants conflict)
- Worktree: `~/projects/worktrees/pulsar/pr/530`

## Verdict

Approve, with small follow-ups. The confinement is correct and reuses the existing check
(`galaxy.util.in_directory` -> `safe_contains`). It adds no new path logic. Every new test
fails on the base and passes with the PR. The open items are a HISTORY wording tweak, one
undocumented extra fix that deserves a test, and the `galaxy.json` sibling, which the PR
already defers.

## What it does

- `verify_is_in_directory` now raises `UnsafePathError` instead of a bare `Exception`.
  `_allow_collect_failure` never downgrades it, so a refused `output_workdir` output fails
  the job and doesn't become an empty dataset.
- `get_mapped_file` now checks the non-nested branch (`config`, `jobdir`, `workdir`,
  `output_jobdir`) and the glob match, not just the pattern.
- New `verify_is_not_special_file`, called in `routes._output_path` and
  `PulsarServerOutputCollector.collect_output`. It refuses FIFOs, sockets and devices.
- `PycurlTransport.execute` now raises `PulsarClientTransportError` on HTTP status >= 400,
  as the urllib transport already does.

## Confinement correctness

- **Symlinks / `..` / prefix bugs.** These are handled by reuse. `in_directory` realpaths
  the trusted directory, and `safe_contains` realpaths the candidate (dangling links too)
  and compares by path component. So `/job/1` vs `/job/10` is not an issue, and neither
  is a symlinked staging root.
- **Glob.** The match is now re-checked after `glob()`. The listing doesn't descend into a
  symlinked directory, so `link*/secret` really was a live escape. Fixed.
- **Coverage across stage-out paths:**
  - Galaxy pulls over HTTP: `download_output` and `path` go through `_output_path`, which
    was already confined and now also has the special-file check.
  - `copy` action: `_output_path` returns the path, then the client copies it. Covered.
  - In-process (`LocalJobManagerInterface`): calls the same route functions, so
    `UnsafePathError` now propagates un-downgraded.
  - Pulsar-side staging: `post.py` goes through `calculate_path` -> `get_mapped_file`. Covered.
- **Write side benefits too.** `upload_file`, `pre.py` and `touch_outputs` share
  `get_mapped_file`, so a pre-placed symlink at a non-nested path is now refused there as
  well.
- **TOCTOU.** There is a window between the check and the read. The PR acknowledges it.
  Stage-out runs after the job exits, so this is acceptable. `O_NOFOLLOW` plumbing through
  every action isn't worth it.

## Findings (ranked)

### 1. HISTORY note is narrower than the actual behaviour change

The note only names `ln -s '$input' out.txt`. The same failure now also hits any
`from_work_dir`, glob, or top-level job-dir output that is a symlink to scratch or shared
storage outside the job directory (e.g. a tool writing to `$TMPDIR` and symlinking the
result). This applies to Pulsar-side staging (MQ, k8s, TES, GCP, coexecution) and
in-process Pulsar.

Galaxy's own local runner still follows such symlinks for regular tools. Only user-defined
tools are confined there. So this is a real Pulsar-vs-local divergence for admins moving a
tool to Pulsar. Widening the boundary from the working directory to the job directory
would not rescue the input case: inputs staged with the `symlink` action resolve to
Galaxy's shared storage anyway. Confining to the working directory is the right call.

Suggested wording:

```rst
  **Note:** an output that is a symlink resolving outside the job's working
  directory - e.g. to one of the job's inputs (``ln -s '$input' out.txt``) or to
  scratch/shared storage - now fails the job with Pulsar-side staging or an
  in-process Pulsar, rather than producing an empty output (it already failed
  when Galaxy downloaded outputs over HTTP). Such tools need to copy instead.
```

Possible follow-up if someone complains: `safe_contains` already takes an `allowlist`.
An admin `staged_output_symlink_allowlist` would be a cheap, reusable escape hatch. Don't
add it pre-emptively.

### 2. `galaxy.json` (`working_directory_file_contents`) is the remaining unconfined sibling

The PR defers this. It's worth knowing the impact, because the read happens in two places:

- `post.realized_dynamic_file_sources`, during postprocessing;
- `manager_endpoint_util.status_dict`, the final full-status response to Galaxy.

So a `galaxy.json` symlink to a host file ships that file's contents to Galaxy in the
status dict. A FIFO named `galaxy.json` blocks the status endpoint and postprocessing,
which is exactly the hang this PR fixes for outputs. Treating it as missing (with a
warning) avoids the "fail the status endpoint" problem the PR body worries about:

```python
def working_directory_file_contents(self, name: str) -> Optional[bytes]:
    working_directory = self.working_directory()
    try:
        path = get_mapped_file(working_directory, name, allow_nested_files=True, mkdir=False)
        verify_is_not_special_file(path)
    except UnsafePathError:
        return None  # already logged by the verify helpers
    if exists(path):
        with open(path, "rb") as f:
            return f.read()
    return None
```

Recommend a follow-up PR, not a blocker here.

### 3. Undocumented extra fix: basename `..` escape (add a test)

The new check in the non-nested branch also closes a case the PR body doesn't mention.
`basename("x/..") == ".."`, so on master:

```
x/.. config        -> <job>/configs/..   (unchecked)
..   workdir       -> <job>/working/..
..   output_jobdir -> <job>/..            (the staging root)
```

With the PR, all three raise `UnsafePathError`. The impact is low: Galaxy is the trusted
caller, and writing to a directory fails anyway. The `path` route does leak the staging
root path, though. A one-line regression test would pin it. It could also be a doctest on
`get_mapped_file` next to the existing `'../cow'` one:

```python
>>> get_mapped_file('/pulsar/staging/101', 'x/..', allow_nested_files=False, mkdir=False)
Traceback (most recent call last):
pulsar.client.exceptions.UnsafePathError: Attempt to read or write file outside an authorized directory.
```

### 4. `verify_is_not_special_file`: use one `stat` call

`exists` + `isfile` + `isdir` makes three stat calls, and the file type can change
between them. One `os.stat` is simpler:

```python
def verify_is_not_special_file(path):
    try:
        mode = os.stat(path).st_mode
    except FileNotFoundError:
        return
    if not (stat.S_ISREG(mode) or stat.S_ISDIR(mode)):
        ...
        raise UnsafePathError(msg)
```

### 5. Tests: two are redundant

All 10 new tests fail on the base and pass with the PR (verified, see below). Imports are
at the top, and `staging_post_test.py` is a good integration-level harness that exercises
the real `ResultsCollector` -> `PulsarServerOutputCollector` -> `JobDirectory` path.

- `client_staging_test::test_collect_output_reraises_unsafe_path_for_workdir_output` fakes
  the collector. Every `staging_post_test` case already proves `UnsafePathError` isn't
  downgraded through the real `_collect_output`. Its docstring says "This is the
  in-process path", but it doesn't exercise in-process (`LocalJobManagerInterface`) at
  all. Drop it, or fix the docstring.
- `job_directory_test::test_calculate_path_refuses_glob_match_outside_working_directory`
  duplicates `staging_post_test::test_glob_matching_under_symlinked_directory_fails_job`.
  Keep the integration one.

### 6. curl transport: no interaction with master's redirect/resume logic

`execute` and `get_file`/`_download` are separate paths. Redirect following
(`FOLLOWLOCATION`/`MAXREDIRS`) and resume (`RESUME_FROM`, the 416 / `E_RANGE_ERROR`
fallback) live only in `_download`, which already checked status. `execute` serves Pulsar
API calls (`download_output` and friends). It sets no redirect option, so a 3xx stays
< 400 and is passed through as before.

- Behaviour change: curl callers that tolerated a 4xx body now get an exception (e.g. a
  404 on `clean`, or `status` for a vanished job). That matches urllib, so it's fine.
  `http_status_code()` picks up `transport_code`, so the 403 "Galaxy refused" tolerance in
  `_collect_output` still applies. The Pulsar server returns 500 for `UnsafePathError`,
  not 403, so it isn't swallowed by that branch.
- Nit: with `output_path`, curl streams into the file, so the error page is already
  written to the dataset path when the exception is raised. urllib only writes on
  success. The job fails anyway, so this is cosmetic. Optionally unlink the file on the
  error path.

### 7. "Visibly" means visible in Pulsar's log

With Pulsar-side staging, the refusal becomes `collected=False` -> `FAILED`, and the
reason only shows up in `log.warn("Failures collecting results ...")` on the Pulsar host.
The Galaxy user sees a generic failure. This is a pre-existing pattern for all collection
failures, so it's out of scope. A follow-up could append collection failure messages to
the job's stderr so the user sees why.

## Reuse

Good. No duplicated containment logic: the PR routes the new checks through the existing
`verify_is_in_directory`. `UnsafePathError` lives beside `PulsarClientTransportError` in
`client/exceptions.py`. `verify_is_not_special_file` is new but small, and galaxy.util has
no equivalent. Its home in `client/job_directory.py`, next to `verify_is_in_directory`,
is reasonable.

## Test results

- PR at `faedeec`: `test/client_staging_test.py test/client_transport_test.py
  test/job_directory_test.py test/routes_test.py test/staging_post_test.py` plus
  `--doctest-modules pulsar/client/job_directory.py`: **55 passed**.
- pycurl isn't in requirements locally. With `--with pycurl`, `client_transport_test -k curl`:
  **14 passed**, including the new `test_pycurl_transport_status_code`.
- Red check: the PR's tests (plus the new `exceptions.py`) run against the merge-base
  sources: **10 failed / 43 passed**. All 10 new tests are red, so they have real
  red-to-green value.
- `..` probe (finding 3) run against both trees: unchecked on base, refused on the PR.

## Resolution (2026-10-03)
- Dropped `client_staging_test::test_collect_output_reraises_unsafe_path_for_workdir_output` in `8e56def` (pushed to mvdbeek branch); client_staging_test.py now identical to master.
