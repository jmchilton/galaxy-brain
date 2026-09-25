# Branch review — Give a missing file its own staging retry budget

**Verdict: request changes. The direction and abstraction are good, but the new
"per-exception" budget is charged for every earlier retry, not for retries of that
exception. A Galaxy outage can therefore consume the missing-file budget before the
first `FileNotFoundError`, defeating the stated NFS grace period.**

**Repo:** `jmchilton/pulsar` · **Branch:**
[`missing-file-retry-budget`](https://github.com/jmchilton/pulsar/tree/missing-file-retry-budget)
· **Commits:** `2bc7d19`, `158488a` · **Base:** `upstream/master` at `40879f3`
· **Reviewed:** 2026-09-22

Two commits, 7 files, +197/-13. No corresponding PR was established locally; the
review is against the branch's merge base with `upstream/master`/`origin/master`.

## What it does

The branch extends `RetryActionExecutor` with a generic `max_retries_for(exc)` hook,
adds a `missing_file_retry_budget()` policy for `FileNotFoundError`, and wires that
policy into both stateful staging executors. Managers that opt into a large global
staging budget get a default cap of five retries when the current failure is a missing
file. The cap is configurable independently for pre- and postprocessing, and `0`
restores the old shared-budget behavior.

This is the right layer for issue #298 and a useful evolution of the recommendation in
[[pulsar_329_transfer_retries_fix]]: it keeps transfer actions free of policy, preserves the
failure rather than silently skipping it, and leaves behind a reusable retry-policy
hook instead of a one-off path check.

## Findings, by severity

### 1. Blocking: the "own budget" is the total action retry count, not retries spent on missing files

`pulsar/managers/util/retry.py:149-164` has one `retries` counter for the whole
execution. `max_retries_for(exc)` selects a limit, but the selected limit is compared
against that global counter. Earlier failures of a different kind therefore consume
the missing-file allowance.

That is especially relevant to the exact scenario this branch describes. A staging
action may first fail while Galaxy is restarting, then reach the file operation after
Galaxy recovers and discover that the tool never produced the output. With a global
budget of 100 and a missing-file budget of 2:

```text
attempt 1: ConnectionError
attempt 2: ConnectionError
attempt 3: FileNotFoundError -> propagated immediately
```

I reproduced this with `RetryActionExecutor(max_retries=100,
max_retries_for=missing_file_retry_budget(2))`: **3 total attempts, only 1 missing-file
attempt**. The two connection failures exhausted the supposed missing-file budget.
With the default cap of 5, any five earlier transient failures eliminate the promised
NFS close-to-open grace period completely.

This contradicts the public descriptions in several places:

- `stateful.py:84-87`: missing files "get their own" budget;
- `docs/job_managers.rst:199`: it "caps the retries spent on" a missing file;
- `docs/error_handling.rst:291-294`: it is a "separate" budget;
- commit `2bc7d19`: a retry limit "for one exception."

Either track matching failures separately (and retain the global counter as the outer
cap), or rename and document this as a total-attempt ceiling selected by the current
exception. The former matches the feature's stated semantics. Add a regression test
whose action changes from a transient exception to `FileNotFoundError`; all current
tests use only one exception class for an entire execution, so they cannot expose this.

### 2. Non-blocking: five retries do not substantiate the documented NFS guarantee

`retry.py:20-23` says the default is long enough for attribute caches "typically capped
at 30-60s." With the default 2/2/30 interval settings, five retries occur after 2, 4,
6, 8, and 10 seconds: the final attempt is at about **30 seconds**, not 60. Sites can
also configure much shorter intervals while retaining the default attempt cap.

The count-based knob is reasonable, but the docs at `retry.py:31-35` and
`job_managers.rst:203-205` should not promise that it absorbs NFS lag independent of
the interval policy. State the default's approximate 30-second window, explain that
admins with longer cache windows must tune the count/intervals together, or choose a
time-based budget if the intended contract is elapsed-time protection.

## Reuse, imports, and test quality

- **Reuse/structure:** good overall. Extending the existing `RetryActionExecutor` is
  preferable to teaching individual staging actions about retry policy, and the hook
  can support future exception-specific policies. Fixing finding 1 would make the
  abstraction match its name and documentation.
- **Imports:** clean and module-level. No buried imports were added.
- **Tests:** no tests were weakened. The new tests cover tightening, preserving the
  global budget for other exceptions, the no-retry default, classification, disabling
  the special policy, and manager-option plumbing. The important missing case is an
  exception transition within one execution. The two stateful tests only inspect
  callback return values; they do not execute a staged retry loop.
- **Documentation/history:** unusually thorough and included in the same branch.

## Verification

Focused suite on Python 3.14:

```text
.venv/bin/pytest -q test/retry_action_test.py test/stateful_test.py
18 passed in 1.83s
```

Lint on all changed Python files:

```text
.venv/bin/ruff check --no-cache pulsar/managers/util/retry.py \
  pulsar/managers/stateful.py test/retry_action_test.py test/stateful_test.py
All checks passed!
```

Pytest emitted only a sandbox-related cache-write warning; it did not affect execution.
