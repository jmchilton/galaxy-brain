# PR 345 — Send stdout and stderr to Galaxy while the job is running

**Repo:** galaxyproject/pulsar · **PR:** [#345](https://github.com/galaxyproject/pulsar/pull/345) (gecage952, opened 2023-11-17, `[WIP]`, last touched 2024-05-15, CONFLICTING) · **Galaxy counterpart:** [galaxy#16975](https://github.com/galaxyproject/galaxy/pull/16975) **merged 2024-11-18** (`8c30a87c5b`, shipped in 24.2) · **Rescue PR:** [#503](https://github.com/galaxyproject/pulsar/pull/503) (draft, opened 2026-09-14) on `jmchilton/pulsar:rescue-345-live-stdout` · **Rebase base:** `323a1bd` · **Reviewed:** 2026-09-14

## Verdict

**On the right track — the direction is correct and the Galaxy half is already merged and
intact on `dev`.** Rebased, defects fixed, read offsets persisted. Opened as draft
[#503](https://github.com/galaxyproject/pulsar/pull/503); #345 left open pending a decision on
closing it.

The shape of the original is right, and non-obviously so:

- Pulsar reads the *remote* `metadata/tool_stdout`, and POSTs to the *Galaxy-side*
  `<jwd>/outputs/tool_stdout`. Those two paths differ, and the asymmetry is load-bearing —
  it matches `command_factory.py`'s `io_directory = "../metadata" if for_pulsar else "../outputs"`.
- It sends deltas, which is what Galaxy's endpoint wants: `job_files.py:142-146` opens the
  target `"ab"` and appends when the path ends in `tool_stdout`/`tool_stderr`. Whole-file
  snapshots would duplicate geometrically.
- It POSTs before `postprocess()` and before the terminal callback, so the file is in place
  on the Galaxy side before `finish_job` reads it.
- Setting `stdout`/`stderr` to `None` is the *correct* sentinel. Galaxy's fallback
  (`runners/pulsar.py:783-794`) only reads from the working directory when the value is
  `None`; omitting the keys yields `""` and the fallback never fires. This is exactly the
  trap [[PR 386 - Drop stdout and stderr from message status]] fell into.

## What the rescue changed

Three commits: the original work rebased with Gregory Cage's authorship preserved, then a
correction commit, then offset persistence.

Rebase conflicts (7): `stateful.py` (5), `managers/__init__.py`, and a whitespace-only one
in `manager_endpoint_util.py` from the original stripping the trailing newline — dropped.
The only semantic trap was `postprocess()` gaining a mandatory `was_cancelled` argument
(`managers/staging/post.py:29-33`); a naive resolution keeps the 2-arg call and `TypeError`s
at runtime. The second original commit also *moves* the `send_stdout` assignments within
`__init__`, so resolving in master's favour silently deletes them — caught and restored.

Defects fixed, each with a regression test (all nine red before, green after):

1. **Silent total loss of tool output.** `full_status` nulled both streams whenever
   `send_stdout_update` was on, but `_post_file` swallowed every HTTP error *and* Galaxy's
   fallback has a bare `except Exception: pass`. Two stacked silent-swallow layers: a run of
   failed POSTs finished the job with no stdout anywhere and nothing logged.
   `is_live_stdout_update` now takes a `job_id` and reports *delivery*, not configuration.
2. **Chunks lost on a multibyte boundary.** The pointer advanced before `diff.decode("utf-8")`,
   so a delta splitting a UTF-8 sequence raised and that chunk was gone permanently. Now posts
   raw bytes; Galaxy appends verbatim and never wanted a decode.
3. **`KeyError` for any recovered job.** Seeking used `.get(job_id, 0)` but the increment used
   bare `[job_id]`, and the map is only populated on the preprocess-success path. Any job
   recovered after a Pulsar restart killed its own live reporting on the first update. Same for
   the unguarded `pop()`. Superseded by the persistence work below — the maps are gone.
4. **File-handle leak**, reopened every interval per running job, never closed — regressing
   [[PR 500 - Close leaked file and transport handles]] three days after it merged. Now
   `contextlib.closing`, matching `stateful.py:146`.
5. **Errors logged as successes** — `_post_file` logged "Successfully posted" regardless of
   status code.
6. **One transient blip abandoned live updates for the job's life.** Now retries, reusing
   `is_transient_http_error`.
7. Dead `job_status` assignment in `ManagerMonitor`; lint (E501/E302/double-space import,
   imports hoisted to module top); options documented in `app.yml.sample`.

### Reuse

The agent review flagged `RemoteTransferAction` + `post_file` as the abstraction being
reinvented. That is **half right**: `post_file(url, path)` is path-oriented and cannot express
"append these bytes", so it does not fit. What did fit was the *conventions* — so the rescue
adds `post_bytes(url, name, data)` beside `post_file` in `pulsar/client/transport/requests.py`,
and the manager calls that instead of `requests.post`. That buys `raise_for_status`, response
closing, and keeps `requests` out of `pulsar/managers/`. URL params now follow
`FileActionMapper.__inject_url`'s query-string convention rather than form fields.

## Design decisions taken

1. **Delivery-confirmed nulling — kept.** `is_live_stdout_update` takes a `job_id` and reports
   delivery rather than configuration, so the completion status only drops the streams once a
   POST actually succeeded. This composes with the open #499: nulled when genuinely streamed,
   capped at 64 KiB otherwise. The rejected alternative was dropping the `full_status` hunk and
   letting #499 own payload size — simpler, but then every live-streamed job still ships its
   whole stdout inline at completion, which is the duplication the feature exists to avoid.
2. **Offsets persisted — done.** This answers jmchilton's 2024-05-15 review comment, the one
   open thread on the PR. Both read positions and the delivered flag now live in a
   `live_output_state` metadata file in the job directory, under the job directory lock so the
   polling thread and the completion flush can't interleave. This is correctness, not just
   continuity: Galaxy appends every POST, so a pointer reset to zero would duplicate
   everything sent before the restart.

## Still open

- **Two uncoordinated switches.** Galaxy gates the *read* side per-destination on
  `live_tool_output_reporting` (`managers/jobs.py:397-400`); Pulsar gates *sending* on the
  server-global `send_stdout_update`. Nothing negotiates. Both must be on, and neither knows
  about the other.
- **No cap on live chunk size**, unlike the `maximum_stream_size` bounding the non-live path.

## Galaxy-side follow-ups (not this PR)

- `live_tool_output_reporting` is **undocumented** — one hit in the whole Galaxy tree, the line
  that reads it. No sample config, no schema entry, no docs.
- The feature has **zero test coverage** on the Galaxy side: nothing for `console_output`,
  nothing for the append branch in `test/integration/test_job_files.py`. It can rot silently.
- `runners/pulsar.py:783-794` has dead code (`if tool_stdout and tool_stderr: pass`), an
  unclosed file handle, a bare `except Exception: pass`, and an unbounded read.

## Verification

Worktree `~/projects/worktrees/pulsar/branch/rescue-345-live-stdout`, venv borrowed from the
`htcondor2` worktree.

- New `test/manager_live_stdout_test.py`: 11 passed, including a simulated restart asserting a
  fresh proxy resumes from the persisted offset. Verified red against the un-fixed rebase —
  failures were `KeyError` on the pointer map and the `is_live_stdout_update` signature, i.e.
  the actual defects.
- Unit suite: **305 passed**, 4 skipped, 4 failed. The 4 failures reproduce **identically on
  clean `origin/master`** (missing `cow` binary) — confirmed by running them in a detached
  master worktree.
- flake8 clean across `pulsar/` and `test/`; mypy clean on the changed modules.
