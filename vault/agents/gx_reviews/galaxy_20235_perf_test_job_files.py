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
