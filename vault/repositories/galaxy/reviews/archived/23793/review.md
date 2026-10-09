# galaxy #23793 - [26.1] Fix deferred materialization fd double close and wait for gx-it-proxy in tests

- PR: https://github.com/galaxyproject/galaxy/pull/23793 (mvdbeek, base `release_26.1`)
- Reviewed SHA: `1676de6968facbf5f023219e68d9df8355331435`
- Worktree: `~/projects/worktrees/galaxy/pr/23793`
- Verdict: **approve**. One optional reuse suggestion; nothing blocking.

## What it does

1. Backports `stream_to_path` / `_stream_to_writer` from dev (8d054aadc24). This matches dev byte-for-byte. `http.py` and `dataverse.py` switch to it. The old pattern was `f = open(path, "wb")`, then `stream_to_open_named_file(page, f.fileno(), ...)`, which `os.close`s the fd. When `f` was later collected it closed the same fd number again, which could by then belong to another thread's file. That explains the EBADF, empty-file and MD5 flakes in deferred materialization.
2. Makes the Gravity test driver wait for the gx-it-proxy port after Galaxy is up. On timeout it prints `galaxyctl status` plus the proxy log and shuts Gravity down.

## Verification

- `test/unit/files/test_http.py` and `test/unit/util/test_utils.py`: 56 passed (borrowed 16477 venv, `PYTHONPATH=lib`).
- Red-to-green: I restored `release_26.1`'s `lib/galaxy/files/sources/http.py` and ran `-k reused_fd`. The new test **fails**. With the PR's version it passes. The worktree is back at the PR head and clean.

## Findings (by severity)

### Correctness: fd fix is right (no action)
- `lib/galaxy/util/__init__.py:2050-2056`: `stream_to_path` uses `with open(...)`, so there is a single owner and a single close on every path (exception mid-stream, empty stream). There is no mkstemp or tempfile ownership in the new path.
- The other `stream_to_open_named_file` callers are safe, since each one passes a raw fd that only the helper closes:
  - `lib/galaxy/files/uris.py:79-81` (`stream_to_file`, fd from `tempfile.mkstemp`).
  - `tools/data_source/data_source.py:78` (`os.open(...)` inline).
  
  They could move to `stream_to_path` later, but that isn't needed for a release fix.
- I grepped `lib/` for other `open(...).fileno()` handoffs to something that closes the fd. The only hits are `fcntl.flock` / `ioctl`, which don't close it. No other instance of the bug.
- The deprecated wrapper and its list of external callers are copied unchanged from dev. That's fine: it keeps the forward-merge clean.

### Low: gx-it-proxy wait hand-rolls a poll loop (optional)
`lib/galaxy_test/driver/driver_util.py:728-741`. `galaxy.util.wait.wait_on` already exists for "poll until non-None, else timeout". The driver's own `wait_for_http_server` (`:486`) needs a 200, which the proxy won't give at `/`, so it's reasonable not to use that one. With `wait_on` the loop reduces to:

```python
from galaxy.util.wait import (
    TimeoutAssertionError,
    wait_on,
)
...
    def _wait_for_gx_it_proxy(self):
        def proxy_listening():
            try:
                with socket.create_connection(("localhost", self.gxit_port), timeout=1):
                    return True
            except OSError:
                return None

        try:
            wait_on(proxy_listening, f"gx-it-proxy on localhost:{self.gxit_port}", GX_IT_PROXY_STARTUP_TIMEOUT, delta=0.5)
        except TimeoutAssertionError:
            message = self._gx_it_proxy_startup_failure()
            ...
```

Caveat: `wait_on` counts only sleep time, not connect time, so the real wall-clock bound is looser than the PR's `monotonic()` deadline. Either version is fine. I'd accept the PR as is.

### Low / FYI: Galaxy startup failure is still swallowed
`lib/galaxy_test/driver/driver_util.py:714-724`. This predates the PR: the `except Exception` around `set_and_wait_for_http_target` logs and continues. Now, when Galaxy itself fails to boot, the driver also spends up to 60s waiting on the proxy before failing with a proxy-focused message. It's outside this PR's scope; mentioned only so a confusing proxy error isn't misread later.

### Nits (no action)
- `test/unit/files/test_http.py:85`: after the fix, `sentinel_fds` stays empty, because `FileIO.close` doesn't go through the patched `os.close`. So the test passes without asserting anything about reuse. That's inherent to testing "the old pattern is gone", and the red run confirms it catches the regression.
- The `_gx_it_proxy_startup_failure` message is long, but it's diagnostic text that CI readers need. Keep it.
- Timeouts: 60s for the npx fetch, 1s per connect, 0.5s sleeps. All sane.
- Imports are at module top level. There are no obvious comments. No tests were weakened.

## Release-branch suitability
Good. The util change is a verbatim backport. The file-source changes are one line each. The driver change is test-only, and the only signature change (`GravityServerWrapper`) is internal.

## Draft GitHub review comment

```
*Posted by Claude (AI assistant) on behalf of jmchilton - not personally authored.*

Looks good to me - approving.

- fd fix: `stream_to_path` gives the descriptor a single owner and a single close on every path. I checked the remaining `stream_to_open_named_file` callers (`files/uris.py` via `mkstemp`, `tools/data_source/data_source.py` via `os.open`); both pass a raw fd that only the helper closes, so neither has the double close. I found no other `open(...).fileno()` handoffs in `lib/` that close the fd.
- Confirmed red-to-green: with release_26.1's `files/sources/http.py` restored, `test_file_source_http_leaves_reused_fd_open` fails; with this PR it passes (and the rest of `test_http.py` / `test_utils.py` pass).

Optional, take it or leave it: `_wait_for_gx_it_proxy` could reuse `galaxy.util.wait.wait_on` instead of its own deadline loop:

    def proxy_listening():
        try:
            with socket.create_connection(("localhost", self.gxit_port), timeout=1):
                return True
        except OSError:
            return None

    try:
        wait_on(proxy_listening, f"gx-it-proxy on localhost:{self.gxit_port}", GX_IT_PROXY_STARTUP_TIMEOUT, delta=0.5)
    except TimeoutAssertionError:
        ...  # existing diagnostics + stop()

(`wait_on` only counts sleep time, so your `monotonic()` deadline is actually a tighter bound. Fine as is.)
```
