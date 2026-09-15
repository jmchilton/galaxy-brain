# PR 339 — Fail jobs when output files exist but stage out fails

**Repo:** galaxyproject/pulsar · **PR:** [#339](https://github.com/galaxyproject/pulsar/pull/339) (natefoo, opened 2023-09-21, **draft**) · **State:** OPEN, CONFLICTING · **Commit:** `55130d0` · **Files:** `pulsar/client/exceptions.py`, `pulsar/client/staging/down.py`, `pulsar/client/transport/curl.py` · **Reviewed:** 2026-09-14

**Fix PR:** [#505](https://github.com/galaxyproject/pulsar/pull/505) — *Fail the job when a transport error blocks work-dir stage out* (opened 2026-09-14). Fixes the gap below on top of #467's structure; #339 can be closed once it lands.

## Conclusion

**Partially superseded — and the problem is still live.**

Both halves of #339 have since been built independently, by two different people, and they
**do not meet in the middle**. Marius' #444 gave the curl transport a structured exception;
Keith's #467 taught output collection to re-raise infrastructure errors. But #467's guard keys on
`OSError`, and #444 deliberately kept `PulsarClientTransportError` a plain `Exception`. The two
changes pass each other in the dark.

Net effect on `master` today: on the **curl** transport, a stage-out transport failure for an
`output_workdir` output is still downgraded to a warning. That is natefoo's original symptom —
green job in Galaxy, zero-length outputs — unchanged since 2023.

## The original problem

#258 ("Allow `from_work_dir` output stage out failure", merged 2021-07) stopped failing jobs when
work-dir outputs couldn't be staged out. Good for recovering stdout/stderr from legitimately failing
tools, but it masked genuine transport failures. natefoo: *"successful jobs that fail to stage out
data will show up as green/ok in Galaxy but with zero length outputs."*

## What landed since

**#444 — mvdbeek, merged 2026-04-23, "Fail fast on permanent HTTP errors during staging."**
Its commit 2 is #339's curl hunk, near-verbatim: `curl.py`'s bare
`Exception("...status code N...")` became `PulsarClientTransportError(transport_code=N)`. The PR
body states the design intent explicitly:

> `PulsarClientTransportError` subclasses `Exception`, so `except Exception` callers are unaffected.

That was a deliberate compatibility choice, and it is exactly what defeats #467 five months later.

**#467 — ksuderman, merged 2026-09-04, "Re-raise infrastructure errors during output collection."**
Its commit is #339's `down.py` hunk in spirit: `_allow_collect_failure` now takes the exception and
refuses to downgrade infrastructure failures (see [[467_re_raise_infrastructure_errors_during_output_collection]]).
But it expresses "infrastructure failure" as `OSError`:

```python
def _allow_collect_failure(output_type, exception):
    if output_type not in ['output_workdir']:
        return False
    if isinstance(exception, OSError) and not isinstance(exception, FileNotFoundError):
        return False
    return True
```

## Why the gap is real

Verified against `origin/master`:

```
PulsarClientTransportError MRO: ['PulsarClientTransportError', 'Exception', 'BaseException', 'object']
is OSError subclass? False
pycurl.error MRO: ['error', 'Exception', 'BaseException', 'object']
is OSError? False
```

Feeding each failure kind through master's own policy for an `output_workdir` output:

| failure | `_allow_collect_failure` | outcome |
|---|---|---|
| curl transport error (#339's case) | `True` | **downgraded to warning** |
| `requests.ConnectionError` | `False` | job fails (correct) |
| disk full (`OSError(28)`) | `False` | job fails (correct) |
| missing `from_work_dir` output | `True` | warning (correct, intended) |

So it depends entirely on which transport is in play:

- **requests** — `post_file`/`get_file` call `response.raise_for_status()`, and `requests.HTTPError`
  *is* an `OSError` subclass. #467 catches it. Correct behavior.
- **curl** — raises `PulsarClientTransportError`, or a raw `pycurl.error` from an unwrapped
  `c.perform()`. Neither is an `OSError`. #467 misses both. **Still broken.**

The reachable path is `down.py:95,105` → `_attempt_collect_output('output_workdir', …)` →
`_collect_output` → `collect_output` → `RemoteTransferAction.write_to_path`
(`action_mapper.py:500`) → module-level `get_file`.

## Which transport is actually used — a trap

`pulsar/client/transport/__init__.py` binds the module-level staging functions at import time:

```python
if curl_available:
    from .curl import get_file, post_file
else:
    from .requests import get_file, post_file
```

This is **independent of `PULSAR_CURL_TRANSPORT`**, which only steers `get_transport()` (the
`execute()`-based API/message transport). So despite #453 ("Drop poster, default to requests-based
transport", natefoo, 2026-05-11) making urllib the `get_transport()` default, `RemoteTransferAction`
still uses **curl whenever pycurl is importable**.

pycurl is an optional, undeclared dependency (a bare `try: import pycurl` in `curl.py`; it appears
in no requirements file). So whether stage-out failures fail the job depends on whether an unrelated
package happens to be present in the environment. That is the worst version of this property:
silent, environment-dependent, and invisible in config.

`UrllibTransport` (`standard.py`) also raises `PulsarClientTransportError`, so it shares the blind
spot — it just isn't on the `get_file`/`post_file` staging path.

## Scope note

This only ever concerned `output_workdir`. `_allow_collect_failure` returns `False` for every other
output type, both before and after #467, so ordinary outputs have always failed the job correctly.
#467 narrowed `output_workdir`; it did not widen anything.

## Still unlanded from #339

1. **The `down.py` re-raise** — the core of it. #467's `OSError` test needs to also cover
   `PulsarClientTransportError` and `pycurl.error`.
2. **`FileNotFoundError` instead of bare `Exception`** in curl's `post_file` missing-file guard.
   Cosmetic in 2023; **load-bearing now**, because #467's policy keys on `FileNotFoundError` to
   decide what stays recoverable.
3. **Wrapping `c.perform()` in the staging transfers** — only `PycurlTransport.execute`
   (`curl.py:58`) wrapped `perform` in `try/except error → PulsarClientTransportError`. Both
   `post_file` (`:80`) and `get_file` (`:127`) left it bare, so a connection-level failure in
   either escaped as a raw `pycurl.error`. (An earlier draft of this note said `get_file` was
   already wrapped; it was not — that grep hit `execute`.)
4. **The `NOT_200` code** — master's non-200 raise passes no `code=`, so it defaults to `UNKNOWN`
   and the operator reads *"Unknown transport error (transport code: 500, transport message: POST to
   … failed with status code 500)"*. The code is right there in the message; the classification
   says unknown.

## Recommendation

Don't rebase #339 — two of its four pieces landed elsewhere and the branch is three years stale.
The remaining fix is small and belongs on top of #467's structure: widen the non-downgradable set in
`_allow_collect_failure` to include `PulsarClientTransportError` and `pycurl.error`, then finish
`curl.py`'s `post_file` (items 2-4).

natefoo's draft note still applies too — Galaxy surfaces this as *"Remote job server indicated a
problem running or monitoring this job."* A custom client message was the reason he left it in
draft, and nothing since has addressed it.

Related: [[467_re_raise_infrastructure_errors_during_output_collection]].
