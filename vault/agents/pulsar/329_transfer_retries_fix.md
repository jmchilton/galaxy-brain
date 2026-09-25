# PR 329 — Transfer retries fix

**Repo:** galaxyproject/pulsar · **PR:** [#329](https://github.com/galaxyproject/pulsar/pull/329) (neoformit, opened 2023-07-15) · **State:** OPEN, CONFLICTING/DIRTY · **Commit:** `f549bf9` · **Files:** `pulsar/client/action_mapper.py` +3/-0, `pulsar/managers/staging/post.py` +9/-1 · **Issue:** [#298](https://github.com/galaxyproject/pulsar/issues/298) (open) · **Reviewed:** 2026-09-14

## Conclusion

**A merge commit would not fix this PR.** The conflict is small and mechanical, but resolving it
would reinstate logic that is wrong on its own terms — and that wrongness is almost certainly what
failed CI in 2023, not a test quirk.

The ground has also shifted, favourably: the "right layer" Marius asked for in 2023 now exists, and
the fix at that layer is about three lines. The underlying problem (#298) is still live.

## The problem being solved

Issue #298: `max_retries` on postprocess POSTs is valuable when Galaxy is restarting or busy. But
the same retry loop runs when the output file *doesn't exist on the Pulsar machine*, where retrying
cannot possibly help. With enough expected outputs and a generous retry interval, a user waits over
an hour to learn their job failed. cat-bro added in Dec 2025 that this also inflates the runtime of
jobs that finish green.

## Why a merge commit isn't enough

### The check tests a path on the wrong machine

```python
+    def path_exists(self):
+        return exists(self.path)
```

`BaseAction.path` is `self.source.get("path")` — the **Galaxy-side** path. The transfer writes from
a different variable entirely:

```python
pulsar_path = self.job_directory.calculate_path(name, output_type)
...
action.write_from_path(pulsar_path)
```

Master makes the distinction explicit one line earlier, deriving the name *from* the client path:
`name = os.path.basename(action.path)` (`post.py:133`). So `action.path_exists()` asks whether the
Galaxy path exists on the Pulsar server, which in general it does not — and the guard then skips
transfers that should have happened.

This explains the failure neoformit could not account for in Aug 2023:

> Apparently this change causes the output file transfer test to fail, which I guess must mean that
> the source file path doesn't exist in the test case, which doesn't make any sense to me.

It makes sense: the test was right and the patch was wrong. The check wanted `exists(pulsar_path)`,
which is available at the call site without a new `BaseAction` method at all.

### The conflict

Verified by dry-run merge against `origin/master` (`git merge-tree`): a single content conflict in
`pulsar/managers/staging/post.py`; `action_mapper.py` auto-merges. Master rewrapped the call for
cancellation handling —

```python
def action_if_not_cancelled():
    if self.was_cancelled():
        log.info(f"Skipped output collection '{name}', job is cancelled")
        return
    action.write_from_path(pulsar_path)
...
self.action_executor.execute(action_if_not_cancelled, description)
```

— so the `lambda:` line #329 replaces no longer exists. Resolvable in a minute, but only by
re-committing to the broken predicate.

### It removes the failure entirely

As written, a missing output is logged and skipped — the job never fails. That is the same defect
class as [[339_fail_jobs_when_stage_out_fails]]: a job that did not stage its data out reports green
in Galaxy. Merging the log statement would partially undo the direction of #467 and #505. Marius'
position in Dec 2025 — *"If we think the output should exist but it doesn't we should fail, not log
a warning"* — is the right one, and it is now also the cheaper one.

(Also `log.warn` is deprecated in favour of `log.warning`; master still has one straggler at
`post.py:74`.)

## What changed since 2023

Marius, Aug 2023: *"I didn't think this was quite the right layer to fix this at. You'd probably
want to parameterize this on the job state."* That layer now exists, and it turned out not to need
job state at all:

1. **#444** (mvdbeek, 2026-04-23) added `should_retry` to `RetryActionExecutor` and wired
   `is_transient_http_error` as the default predicate for the preprocess and postprocess executors
   (`stateful.py:91-92`). Retry policy is now a classification question, decided before the loop.
2. **Both transports now raise `FileNotFoundError` for a missing local file.** `requests.post_file`
   always did, via `open(path, "rb")`. `curl.post_file` raised a bare `Exception` until #505
   (2026-09-14) changed it. So the condition is finally uniform and typed.

What is missing is one line of classification. Verified against current master:

```
FileNotFoundError (missing output)   retry=True
```

`is_transient_http_error` falls through to its conservative `return True`, so a missing output still
burns every retry.

## Recommended fix

Classify `FileNotFoundError` as permanent in `pulsar/client/transport/transient.py`, beside the
existing connection-level branch. Roughly:

```python
# A missing local file cannot appear on retry — this is the #298 case, where
# an absent output made a failed job take an hour to report.
if isinstance(exc, FileNotFoundError):
    return False
```

That is the whole change. It:

- resolves #298's actual complaint (the hour-long wait) by failing immediately;
- gives Marius his semantics (fail, don't log) for free;
- needs no `path_exists`, no new `BaseAction` method, and no knowledge of job state;
- applies to preprocess staging as well, where the same reasoning holds;
- keeps working for both transports, since both now raise the same type.

Care needed on one point: `FileNotFoundError` is an `OSError` but not a `ConnectionError`, so it
does not collide with the existing connection-level branch — confirmed by running the predicate.

## Recommendation

Close #329 with credit to neoformit and cat-bro for the diagnosis and the field testing, pointing at
the replacement. Do not merge it, with or without the conflict resolved. Keep #298 open until the
`transient.py` change lands, then close both together.
