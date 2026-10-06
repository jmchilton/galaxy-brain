Migrate the job files API (`/api/jobs/{job_id}/files`) to FastAPI so that a job runner's upload is written to disk once instead of twice. This is the third attempt, after #8846 and #20235.

Pulsar uploads every remote output through this endpoint, so the earlier review asked for a speed and memory comparison. Here is one 512 MiB upload and one download, measured locally:

| 512 MiB, Pulsar-style request | `dev` | This PR |
| --- | --- | --- |
| POST, wall time | 2.80 s | 1.56 s ✅ |
| POST, bytes written to disk | 1097 MiB (2x) | 559 MiB (1x) ✅ |
| 1000 small appends to `tool_stdout` | ~12 ms each | ~12 ms each |
| GET, wall time | 0.89 s | 0.99 s |
| Server memory | flat | flat |

***These numbers come from macOS with an embedded server, not a Linux gunicorn deployment. The script is below so the comparison can be rerun on Linux.***

`dev` already writes uploads twice: WSGI spools the multipart body into a temp file, then moves it, which is a copy whenever the temp directory and the destination are on different filesystems. A plain FastAPI port keeps that cost: `File` parameters spool into a `SpooledTemporaryFile` and the endpoint copies it out. This PR doesn't declare `File`/`Form` parameters. Pulsar sends `path` and `job_key` as query parameters. When they're there, the endpoint authorizes before reading the body, streams the file part into a named file next to its destination, then renames it (or appends it, for `tool_stdout`/`tool_stderr`).

***Nothing changes for job runners. The URL, query and form parameters, multipart format, HEAD support, TUS and nginx upload sources are all the same, so Pulsar needs no change.***

***This completes the migration. The legacy `JobFilesAPIController`, its routes and the dead WSGI TUS stubs are deleted, and the module drops its mypy exemption.***

Some failures that were 500s on `dev` now return Galaxy's usual error responses:

| Request | `dev` | This PR |
| --- | --- | --- |
| GET a missing file | 500 | 404 |
| GET a directory | 500 | 400 |
| Unknown job id | 500 | 404 |
| TUS `session_id` with no completed upload | 500 | 400 |
| nginx `__file_path` that doesn't exist | 500 | 400 |
| Malformed multipart body | 500 | 400 |

<details><summary>How the upload is handled</summary>

- `JobFilesManager` (`lib/galaxy/managers/job_files.py`) holds job-key authorization, the write-path check (working directory, output dataset or its extra files), the nginx and TUS source checks, and replace-or-append. The endpoint is a thin `@router.cbv` on top of it. The endpoint has no user or session, so it doesn't depend on `trans`.
- With query auth, the upload is staged in a hidden `.job_files_upload_*` directory in the job's working directory, or in the output dataset's directory, never inside an extra files path. That keeps the final rename on one filesystem. The job state is checked again after the body arrives, because a long upload can outlive the job.
- The request's DB connection is released before the body is read, and the authorization, parsing and file work run in the threadpool. python-multipart's public `create_form_parser` writes file parts straight to named files in the staging directory.
- With form-only auth (older clients), uploads are spooled to `new_file_path`, authorized, then moved, as on `dev`.
- The path isn't URL-decoded a second time, which #20235 did. A literal `%2F` in a file name survives the round trip, and there's a test for it.
- HEAD is an explicit `@router.head`, because FastAPI doesn't add it.
- GET uses `GalaxyFileResponse`, which honours `nginx_x_accel_redirect_base`/`apache_xsendfile` just as `dev`'s `send_file` did, and adds Range support.
- The TUS store fallback (`tus_upload_store_job_files` → `tus_upload_store` → `new_file_path`) is now one config property, used by both the TUS router and the endpoint.

</details>

## Risks

The one hard-to-reverse part is that the job files endpoint now appears in Galaxy's OpenAPI schema and generated client, so its documented parameters and new 4xx responses become something clients can read and rely on.

<details><summary>Risk Details</summary>

- The endpoint is in the OpenAPI schema with an "only for job runners, not a stable user API" description.
- `POST /api/job_files/tus_hooks`, a no-op left for tusd `-hooks-http`, is gone and now returns 404. Galaxy never configured it, and the TUS upload route itself is unchanged.
- Responses that were 500s are now 4xx (table above). A runner that retried on any 5xx now gets an error it won't retry.
- A worker killed mid-upload can leave a hidden `.job_files_upload_*` directory in a job's working directory or a dataset directory. Normal errors and rejected uploads clean up after themselves, and there's a test for that.
- With query auth, a large upload that's rejected gets its 403 before the body is read, so some clients see a connection reset instead of the JSON error.

</details>

<details><summary>Risk Review Advice</summary>

Review `create` in `lib/galaxy/webapps/galaxy/api/job_files.py`. Check where the upload is staged, that authorization runs before and after the body is read, and the cleanup in `finally`. `JobFilesManager.authorize_write` is the security boundary for writes. It keeps `dev`'s rules, with `dev`'s `in_directory` checks and `safe_str_cmp` job-key comparison.

</details>

## Context

Builds on 🔀 #23856, which hardened the legacy endpoint and added the tests this PR keeps unchanged as characterization tests. Replaces 🔀 #20235 by domgz and the closed 🔀 #8846; the route docs and schema follow #20235. Unblocks 🔀 #20598 (ARC job runner), whose raw-body PUT can reuse the same staging and replace-or-append path.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Galaxy's usual JSON errors with 400/403/404 codes (table above). The one gap is an early 403 on a large upload, which can surface as a connection reset.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Integration tests go through HTTP and check status codes, file contents, Pulsar's query mode, form mode, appends and percent-escaped paths. Two streaming tests watch the staged file grow before the request finishes, to show the upload isn't spooled.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] This is a refactoring of components with existing test coverage.

<details><summary>Tests</summary>

- `test/integration/test_job_files.py`: 22 tests. Uploads use Pulsar's query auth by default, and form auth keeps its own tests. New ones cover missing files and directories, unknown jobs, missing TUS and nginx sources, percent-escaped paths, streaming into the working directory or next to an output (never inside its extra files path), and rejected uploads leaving nothing staged.
- `test/integration/test_job_files_tus.py` and `test_job_files_remote_transfer.py` run tool tests through embedded Pulsar with TUS and multipart transfers.
- All of the above pass locally, and fork CI is green.

</details>

<details><summary>Perf script</summary>

Save it as `test/integration/test_zz_job_files_perf.py` on `dev` and on this branch, then run `PERF_MB=1024 PYTHONPATH=lib pytest test/integration/test_zz_job_files_perf.py -k "TestJobFilesPerf and test_perf" -s`.

```python
"""Job files API perf: POST (Pulsar post_file), many small appends (post_bytes style), GET.

Copy to <worktree>/test/integration/test_zz_job_files_perf.py (import becomes `from .test_job_files import`), then:
  PERF_MB=1024 PYTHONPATH=lib pytest test/integration/test_zz_job_files_perf.py -k "TestJobFilesPerf and test_perf" -s
Measures wall time, peak RSS delta of the (embedded server + client) process, block output ops and
system-wide disk bytes written (after sync; noisy). On Linux prefer /proc/<pid>/io write_bytes.
"""

import io
import os
import resource
import threading
import time

import psutil
import requests
from requests_toolbelt import MultipartEncoder

from integration.test_job_files import TestJobFilesIntegration

PERF_MB = int(os.environ.get("PERF_MB", "256"))
APPENDS = int(os.environ.get("PERF_APPENDS", "1000"))


class Sampler:
    def __init__(self):
        self.proc = psutil.Process()
        self.peak = self.base = self.proc.memory_info().rss
        self._stop = threading.Event()
        self._t = threading.Thread(target=self._run, daemon=True)

    def _run(self):
        while not self._stop.is_set():
            self.peak = max(self.peak, self.proc.memory_info().rss)
            time.sleep(0.01)

    def __enter__(self):
        os.sync()
        self.disk = psutil.disk_io_counters().write_bytes
        self.blocks = resource.getrusage(resource.RUSAGE_SELF).ru_oublock
        self.start = time.time()
        self._t.start()
        return self

    def __exit__(self, *args):
        self._stop.set()
        self._t.join()
        self.wall = time.time() - self.start
        self.blocks = resource.getrusage(resource.RUSAGE_SELF).ru_oublock - self.blocks
        os.sync()
        self.disk = psutil.disk_io_counters().write_bytes - self.disk


def report(name, s, nbytes=None):
    extra = f" throughput={nbytes / s.wall / 2**20:.0f}MiB/s" if nbytes else ""
    print(
        f"PERF {name}: wall={s.wall:.2f}s peak_rss_delta={(s.peak - s.base) / 2**20:.0f}MiB "
        f"out_blocks={s.blocks} disk_write={s.disk / 2**20:.0f}MiB{extra}"
    )


class TestJobFilesPerf(TestJobFilesIntegration):
    def test_perf(self):
        job, _, working_directory = self.create_static_job_with_state("running")
        job_id, job_key = self._api_job_keys(job)
        url = self._api_url(f"jobs/{job_id}/files", use_key=False)
        source = os.path.join(self._test_driver.mkdtemp(), "big")
        with open(source, "wb") as f:
            block = os.urandom(2**20)
            for _ in range(PERF_MB):
                f.write(block)
        target = os.path.join(working_directory, "big")
        nbytes = PERF_MB * 2**20

        with Sampler() as s:
            m = MultipartEncoder(fields={"file": ("filename", open(source, "rb"))})
            r = requests.post(
                url, params={"path": target, "job_key": job_key}, data=m, headers={"Content-Type": m.content_type}
            )
            r.raise_for_status()
        assert os.path.getsize(target) == nbytes
        report(f"POST {PERF_MB}MiB", s, nbytes)

        stdout = os.path.join(working_directory, "outputs", "tool_stdout")
        with Sampler() as s:
            with requests.Session() as session:
                for _ in range(APPENDS):
                    r = session.post(
                        url, params={"path": stdout, "job_key": job_key}, files={"file": io.BytesIO(b"y" * 1024)}
                    )
                    r.raise_for_status()
        assert os.path.getsize(stdout) == APPENDS * 1024
        report(f"{APPENDS}x1KiB appends (avg {s.wall / APPENDS * 1000:.1f}ms)", s)

        with Sampler() as s:
            r = requests.get(url, params={"path": target, "job_key": job_key}, stream=True)
            r.raise_for_status()
            received = sum(len(c) for c in r.iter_content(2**20))
        assert received == nbytes
        report(f"GET {PERF_MB}MiB", s, nbytes)
```

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
