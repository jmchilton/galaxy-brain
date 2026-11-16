# Thermo-nuclear review — galaxy#24804

- Profile: thermo_review (`_shared/reviewers/thermo_review.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `677cab47347c1b40acf2988bed2f8ae18507ca9e` (base `dev`)
- Scope: reuse and structure only. Code was not run. No bug hunt.

## Summary

The core idea works: one table of runner-state definitions that the resubmit handler, its condition variables, the Pulsar consumer and the CLI runner all read from. It deletes the parallel `MESSAGES` dict, the hard-coded allow-list and the hand-built context entries in `resubmit.py`. The Slurm extraction into `runners/util/slurm` is a faithful move.

The PR only goes halfway, though. The table is the single source of what a reason means, but each consumer still writes its own "look up the definition, set `runner_state`, fall back to `fail_message`" logic, and the native Slurm runner keeps literal copies of the messages the table now owns. The Pulsar tool-failure resubmit path copies a block from the base runner instead of sharing it. The handler adds a second, narrower copy of the "restore resubmits that aren't persisted" logic. The Slurm CLI plugin re-parses `scontrol` and `sacct` output that the new shared module already parses.

No file crosses 1000 lines because of this PR. `pulsar.py` was already 1588 lines on `dev` and grows by about 70.

## Findings

### P2 1 — Consumers re-implement "apply a reason to a job state" instead of the definitions module owning it

The PR description says every consumer "derives from" `register_runner_state`. In practice they derive only the lookup. Each one then hand-rolls the same three steps: set `runner_state`, pick a message (runner-specific detail, else `definition.fail_message`), and log.

- `lib/galaxy/jobs/runners/cli.py:210` `_handle_job_failure_reasons`: `RUNNER_STATE_DEFINITIONS.get(...)`, sets `ajs.runner_state`, `message = message or definition.fail_message`, sets `ajs.fail_message`.
- `lib/galaxy/jobs/runners/pulsar.py:1369` `_apply_remote_runner_state`: the same lookup, sets `job_state.runner_state`, `message or (definition.fail_message if definition else None)`. It also has its own validity rule for unknown names (`REMOTE_RUNNER_STATE`, line 281).
- `lib/galaxy/jobs/runners/slurm.py:28-32, 78-81, 96-97, 110-111`: the native Slurm runner sets `runner_state` by hand next to literal strings. `OUT_OF_MEMORY_MSG` is word-for-word the `MEMORY_LIMIT_REACHED.fail_message` in `runner_state_definitions.py`, and the inline TIMEOUT string is word-for-word `WALLTIME_REACHED.fail_message`. This PR touched these lines (it added `MEMORY_LIMIT_MESSAGES`) but kept the copies. Changing a message in the definitions now leaves DRMAA-Slurm users seeing the old wording.

Suggested restructuring: give the definitions module the one operation everyone performs, e.g.

```python
def apply_runner_state(job_state, runner_state: str, message: str | None = None) -> bool:
    """Record a reported reason on job_state; returns False for a reason that isn't a valid name."""
```

It sets `runner_state`, sets `fail_message` to `message or definition.fail_message` when either exists, and owns the "unknown but well-formed name" rule that sits in `pulsar.py` today. Each of the three call sites then shrinks to a single call. The native Slurm runner drops `OUT_OF_MEMORY_MSG` and the inline walltime string (keeping only the extra "probably exceeded" wording as an override message). Adding a reason then really is one `register_runner_state` call, and the logic sits in one place instead of three slightly different copies. For example, the CLI path drops unknown reasons while the Pulsar path keeps well-formed unknown ones, and nothing in the code says whether that difference is intended.

### P2 2 — Pulsar's tool-failure resubmit duplicates the base runner's block and runs `check_tool_output` twice

`PulsarJobRunner._resubmitted_for_tool_failure` (`pulsar.py:948`) is a near copy of the middle of `AsynchronousJobRunner._finish_or_resubmit_job` (`runners/__init__.py:849-880`). Both call `check_tool_output`, commit the job, map `OUT_OF_MEMORY_ERROR` to `MEMORY_LIMIT_REACHED` (anything else non-OK to `TOOL_DETECT_ERROR`), call `_handle_runner_state("failure", ...)` and return on `runner_state_handled`. `kubernetes.py:870` sets `TOOL_DETECT_ERROR` a third way.

The copy has also diverged from the original:

- The base runner passes the detected state into `job_wrapper.finish(check_output_detected_state=...)`. The Pulsar path throws it away, so `_finish_pulsar_job` -> `job_wrapper.finish` runs `check_tool_output` again (`jobs/__init__.py:2373`). That is two evaluations of stdio rules and two rewrites of `job.job_messages` for every failed job on a destination with resubmits.
- The Pulsar copy is gated on `job_state.job_destination.resubmit`, and the base runner isn't. The gate exists only to avoid that duplicate work, so it is a symptom of the duplication rather than a policy.

Suggested restructuring: pull the shared part into the base runner, e.g. `_resubmit_for_detected_state(job_state, detected_state) -> bool`, holding the detected-state-to-runner-state mapping and the handler call. Use it from `_finish_or_resubmit_job` and from Pulsar. In Pulsar, compute the detected state once in `_complete_staged_job`, call the helper, and pass the state through `_finish_pulsar_job` into `job_wrapper.finish(check_output_detected_state=...)` the way the base runner does. The resubmit gate then has no reason to exist.

### P3 1 — `job_pair_for_id` adds a second, narrower copy of the "restore resubmits that aren't persisted" logic

`handler.py:311-318` re-attaches `resubmit` from the job config with `suppress(KeyError)`. `__recover_job_wrapper` (`handler.py:386-404`) already does this, and also restores `env` and `tags` and logs the dynamic-destination `KeyError` case. Now there are two copies with different coverage and different handling of a missing destination. The next field that turns out not to be persisted will need adding in both places, or one will get missed.

Suggested fix: extract one helper, e.g. `_restore_config_only_destination_fields(job, job_destination)`, and call it from both. Better still, apply it wherever `JobDestination(from_job=job)` is built for a handler-side wrapper (`use_persisted_destination=True` in `JobWrapper.__init__`), so every persisted-destination wrapper gets the same rehydration. `handler.py:1307` builds such a wrapper too.

### P3 2 — The Slurm CLI plugin re-parses `scontrol` and `sacct` output that the new shared module already parses

The PR moves `scontrol -o show job` parsing (key=value splitting that copes with values containing spaces and `=`) and `sacct` state parsing into `runners/util/slurm/__init__.py:44` "to share". The Slurm CLI plugin in the same PR then parses the same `scontrol` output separately with ad-hoc regexes (`\bJobState=(\S+)`, `\bReason=(RaisedSignal\S+)`, `util/cli/job/slurm.py:163-172`) and has its own sacct-line parser (`_state_from_sacct`, line 124). That gives two parsers for one format, side by side in `runners/util`.

The CLI plugin can't call `slurm_job_info` directly, because it returns command strings for a remote shell. But the parsing half can be shared. Split `slurm_job_info` into "build the command" and `parse_scontrol_job_info(stdout) -> dict[str, str]`, and have `parse_failure_reason` / `parse_failure_message` read `info["JobState"]` / `info.get("Reason")` from it. That deletes both regexes and keeps a single parser.

### P3 3 — `register_runner_state` monkeypatches the `runner_states` Bunch shared with Pulsar

`runner_state_definitions.py:327-342` takes a `name` and does `setattr(runner_states, name, value)` on the Bunch in `runners/util/__init__.py`. That module is the one shared with Pulsar, and per the PR it "keeps only the names". Every built-in registration passes `runner_states.X` as its own value, so for existing states the `name` argument and the `setattr` do nothing except a consistency check. For new states, `runner_states.GPU_LOST` exists only after the definitions module has been imported, which makes attribute availability depend on import order. The test fixture has to undo the mutation through `runner_states.__dict__` (`test_resubmit.py:86`), which shows the cost.

This doesn't relitigate the "one call declares a reason" design. Keep the registry and keep it in Galaxy. But let it key on `value` only, and add new names to `runner_states` in `util/__init__.py`, which is already the name registry. That removes the `name` parameter, the `setattr`, the cross-module mutation and the half of the duplicate-check condition that compares names.

## Not raised

- `pulsar.py` size: already over 1000 lines before the PR, and the PR adds about 70. Worth decomposing at some point, but not because of this PR.
- `parse_failure_message` as a new `BaseJobExec` hook is a reasonable, minimal extension point.
- `get_client_from_wrapper` now always injects `resubmission_count` into the destination params copy. It's a small leak of a protocol field into the params dict, and too minor to raise on its own.
