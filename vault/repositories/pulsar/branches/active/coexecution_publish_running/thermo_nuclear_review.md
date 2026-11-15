Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review: `coexecution_publish_running`

- Range: `coexecutor_image_modern_base` (`acde50a`)...`3c27f58` (one commit, "Publish running from pulsar-submit --no-wait").
- Read alongside: `pulsar/managers/stateful.py` (preprocessing thread, `get_status` state machine, shutdown), `pulsar/managers/status.py`, `pulsar/managers/unqueued.py` (coexecution manager), `pulsar/manager_endpoint_util.py` `submit_job`, `pulsar/scripts/submit.py`, `finish.py`, `run.py`, `pulsar/core.py` shutdown, and how the later stack commits (`3dd2701` through `9036ff3`) change `submit_util.py` and `test/submit_util_test.py`.

## Overall

The change sits in the right layer. Publishing `running` belongs to the stateful manager's `get_status` transition, and the only problem was that the short-lived `--no-wait` app shut down before anything called it. Waiting in the script, the one place that owns the app's lifetime, is the minimal fix. The alternatives are worse: publishing `running` straight after launch would change every manager's semantics (a DRM-queued job would read as running), and turning on a background monitor wouldn't help, since the app still shuts down at once. `submit_util.py` stays at about 120 lines. No file-size, spaghetti or boundary problems.

## Findings

### 1. Two copies of one polling loop (the earlier review's P3 2): fixed, `1a741aa`

`wait_for_job` and `wait_for_launch` were the same poll-sleep loop with different stop conditions. In `3dd2701`, later in the stack, both turn into identical six-line `while True` loops that return the final status, so the copy grows rather than shrinks. Both now call one private `_wait_for_status(manager, job_id, until, poll_time)` that returns the status that ended the wait. `wait_for_job` returning its status doesn't change behavior: the current callers ignore it, and `3dd2701` uses it. The docstrings match what `3dd2701` writes, word for word, so that commit's docstring hunks merge cleanly. The `job_config` parameter (only used for `job_id`) stays, because changing it would touch call sites that `3dd2701` rewrites. Covered by the existing tests: both scripts go through the shared loop. Changing the launch predicate to `lambda status: True` fails two of the three tests.

### 2. `wait_for_launch` is unbounded if the staging thread dies without a marker (the earlier review's P3 1): left as is, needs a decision if wanted

Not a regression, and not fixable well at this layer:

- The sibling path behaves the same way. `wait_for_job` (in `pulsar-finish` and `--wait`) also polls forever if the postprocessing thread dies without writing its marker. Bounding only the launch wait would make the two diverge.
- Bounding it here would need either an arbitrary timeout, which would kill legitimately long input staging, or a handle to the staging thread passed out through `submit_job`/`preprocess_and_launch`, which leaks manager internals into the script.
- The invariant that matters ("a staging thread always leaves `preprocessed` or `preprocessing_failed`") belongs in `StatefulManagerProxy._handling_of_preprocessing_state`, where it would cover every caller. The remaining way to hit it is the failure handler's own `store_metadata` raising, for example on a full volume. Before this branch the same case hung the tool executor instead. An uncaught exception in the staging thread still prints its traceback to stderr through `threading.excepthook`, so the hang can be diagnosed.

If John wants this hardened, it's a separate stateful-manager change.

### Out of scope

- Pre-existing, not touched by this branch: `pulsar-run --server` calls `run_server_for_job(args)`, but `run.py`'s parser defines no `--wait`, so `args.wait` raises `AttributeError`. The base branch has the same line.
- HISTORY entry and stacking (the earlier review's P3 3 and 4): outside this review's remit.

## Restack impact

One hunk changed: `pulsar/scripts/submit_util.py`, the `typing`/`StateLiteral` imports plus the bodies of `wait_for_job`/`wait_for_launch` and the new `_wait_for_status`. Simulated restack (scratch detached worktree, since removed): cherry-picking `3dd2701` onto `1a741aa` gives two small conflict blocks in those two function bodies. Resolve by taking this branch's side. The imports and docstrings merge automatically. All later commits (`8d2e739` through `9036ff3`) then cherry-pick cleanly. At the stack top, `test/submit_util_test.py` passes (16 passed). `test/submit_util_test.py` itself isn't changed, so it doesn't conflict.

## Gate (at `1a741aa`)

- `make lint` (ruff via tox): passed.
- `.venv/bin/isort --check --diff` on both touched files: clean.
- `.venv/bin/mypy pulsar/scripts/submit_util.py test/submit_util_test.py`: no issues.
- `.venv/bin/pytest test/submit_util_test.py`: 3 passed.
- `integration_test_cli_submit.py`, `scripts_config_test.py`, `cli_help_tests.py`, `manager_coexecution_test.py` (venv on `PATH`): 12 passed.

Final head: `1a741aa`.

READY WITH NOTES
