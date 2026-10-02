# Review: galaxy#23850 - Record Pulsar versions as job metrics; rename pulsar_transfer plugin to pulsar

Draft PR by jmchilton, mostly written by an AI assistant. Branch `jmchilton:pulsar_version_metrics`, 4 commits on `origin/dev`:

- `7b9736fd9f3` rename `pulsar_transfer` to `pulsar`
- `0d65efef077` record versions; finish jobs for the submitted version
- `0b21e223f47` keep the plugin's per-metric safety when it isn't configured globally
- `562941c8338` log metric file failures as exceptions

Worktree: `~/projects/worktrees/galaxy/branch/pulsar_version_metrics`. Reviewed 2026-10-01.

## Verification run

- `pytest test/unit/job_metrics/ test/unit/app/jobs/test_pulsar_runner.py`: 79 passed.
- `ruff@0.16.9`, `black@26.5.1`, `isort@9.0.1` on the touched files: clean.
- `mypy` on `galaxy/jobs/runners/pulsar.py` and `galaxy/job_metrics/instrumenters/pulsar.py`: no errors in the touched files. The 23 errors reported come from unrelated modules mypy follows.
- Integration test not run (too slow on this machine).

## Background checked

- **#23784** merged 2026-09-30 as `268c54c`. Marius's two inline comments, on `1e8c994`, ask for two things:
  - "warning with exc_info is odd; log an exception"
  - "don't be defensive about a non-dict; fail outright"
  - Both were fixed **inside #23784**, by `110173c07cd` "Let invalid Pulsar transfer metrics reach framework error handling". That commit landed after his approval and before the merge. The `pulsar_transfer.py` that #23850 deletes from dev already has neither the warning nor the `isinstance` check.
  - `562941c8338` on #23850 doesn't touch the transfer reader. It applies the same rule to code that is new in #23850:
    - `read_target_version` no longer catches `AttributeError`, and calls `log.exception` instead of warning with a traceback.
    - `_write` calls `log.exception`.
  - So it does address the spirit of the comments, for the new code. But the two replies already posted on #23784 (2026-10-01 14:56Z) say the comments were "fixed in #23850 (562941c)". That misattributes the fix. See must-fix 1.
- **#23821** closed unmerged 2026-10-01. Its final code (`a0b0355dcca`) did three things:
  - `check_job_config` returns early when `pulsar_version_source == "client"`.
  - `job_conf.sample.yml` gained a commented `remote_pulsar_version` example.
  - Three `check_job_config` tests.
  - The earlier "None means assume current" design, which Marius reviewed, had already been dropped from that branch.
- **Pulsar side**
  - pulsar#523 (draft, open) emits `pulsar_version_source`:
    - `client` / `destination` / `container_image` from `LocalSetupHandler`
    - `remote` set client-side by `RemoteSetupHandler`, from Marius's `c9e0958`
  - A missing key therefore really does mean "the client library predates #523". So `unreported` is accurately described.
  - The container map (`f6c0492`) includes the coexecution default `galaxy/pulsar-pod-staging:0.15.0.2` → `0.15.0.dev1`. `pulsar_container_image` is in `COEXECUTION_DESTINATION_DEFAULTS`, so it reaches `LocalSetupHandler`. That addresses Marius's #23821 coexecution concern on the Pulsar side.
  - pulsar#518 (open) contains the rename commit `e2c8cd932b`. The file names don't change.
  - pulsar#529 (draft, open) sits on top of #518 and writes `__instrument_pulsar_version`.
- The `pulsar-galaxy-lib` pin is 0.15.15, so none of #523, #518 or #529 is in Galaxy's environment yet.

## Key question: is anything from #23821 lost?

**The `check_job_config` skip. Not lost in practice; say so explicitly.**
- With `pulsar_version_source == "client"`, `pulsar_version` is the pinned client library (0.15.15 today).
- Every entry in `MINIMUM_PULSAR_VERSIONS` is at most `0.15.13.dev0`, so the check compares the client against itself and always passes.
- Skipping it only removed a `log.info` line and a meaningless comparison.
- The real harm in galaxyproject/pulsar#135 is that the wrong version **gates behaviour**: the new-shell check below 0.14.999, and `dataset_collector_descriptions` at 0.15.13. The skip never touched that.
- #23850 doesn't carry the skip. That is fine, but a reviewer arriving cold will look for it, so the description should say it was dropped on purpose.

**The `remote_pulsar_version` sample-config snippet. Lost, and #23850 now depends on it.**
- Marius asked for this on #23821 ("`remote_pulsar_version` should probably be in `job_conf.sample.yml` so admins can find it").
- #23850's `doc/source/admin/job_metrics.rst:203-205` tells admins to "set `remote_pulsar_version`".
- Nothing in Galaxy documents that parameter, and the pinned client library ignores it. See should-fix 1.

**Marius's #23821 concerns, applied to #23850**

| #23821 concern | Status in #23850 |
|---|---|
| Launch and finish disagree for an MQ remote older than 0.15.13: finish used `run_results`' version | **Addressed directly.** Finish now reuses the recorded target (`runners/pulsar.py:832-833`, `1113-1119`). The description should say so and credit the review. |
| Coexecution: Galaxy knows the default image's version and should declare it | Handled by pulsar#523 `f6c0492` (known image map), not by Galaxy. Say so. |
| Early return loses `UPGRADE_PULSAR_ERROR` | Moot; no early return. |
| Info-level log on every submission; confusing wording | Moot; nothing added. `check_job_config` still logs `pulsar_version is ...` at info, which predates both PRs. |
| Embedded MQ `remote_pulsar_version` default is a no-op | Moot; not carried. |
| Tests don't pin the paths a None version reaches | **Still applies, in a new shape.** Nothing fails if the finish wiring goes back to `run_results`. See must-fix 2. |

## Findings

### Must-fix

1. **The replies already posted on #23784 credit the wrong commit** (GitHub comments 4156863693 and 4156871278).
   - Both say Marius's comments were fixed in #23850 by `562941c`. They were fixed in #23784 itself by `110173c07cd`, before it merged.
   - The first reply's "the isinstance check is gone" describes `110173c`, not `562941c`.
   - The second reply's "Reading metrics no longer catches anything except a missing file" also describes `110173c`.
   - Marius approved, then saw the fix land, then got a reply saying it was fixed somewhere else. Post a short correction under each thread (drafts below).
   - The posted marker is also non-bold (`> Posted by Claude ...`). Use the bold form going forward.

2. **The finish-time fix has no red-to-green test, and the description implies it does.**
   - `test/unit/app/jobs/test_pulsar_runner.py:72-86` only tests the `submitted_pulsar_version` helper.
   - `test/integration/test_pulsar_embedded.py:89` uses the embedded Pulsar, where target == status == client. Reverting `runners/pulsar.py:832-833` to `self.__client_outputs(client, job_wrapper, PulsarJobRunner.pulsar_version(run_results))` would pass every test in the PR.
   - The description's "It fails without the runner change" is true only for the metric writes.
   - This is Marius's #23821 test-gap point carried over. Options, best first:
     - (a) Add a unit test that drives `finish_job` with a fake client, a recorded target ≥ 0.15.13 and empty `run_results`, and asserts that the `ClientOutputs` passed to `pulsar_finish_job` carry `dataset_collector_descriptions`. `test_pulsar_runner.py` already has a `RecordingClient` pattern to build from. It probably needs `pulsar_finish_job` monkeypatched to capture `client_outputs`.
     - (b) Pull the version decision out of `__client_outputs` into a small static helper that takes a version. That alone doesn't test the wiring, though.
     - (c) At minimum, reword the description so it doesn't claim more coverage than exists.

3. **The description overstates what the finish fix recovers. Verify, then reword.**
   - The fix makes finish *agree* with submission. Discovered outputs come back only if the submission-time version was right.
   - When the remote stages outputs itself (MQ/coexecution, `remote_transfer`), it collects according to the launch-time `ClientOutputs`. Pulsar's `ResultsCollector.__collect_directory_files` → `client_outputs.dynamic_match` uses whatever description launch sent.
   - Old remote behind `jobs_directory`, version undeclared (`source: client`):
     - Launch assumes current and sends `dataset_collector_descriptions`.
     - An old stager can't use them.
     - Finish now agrees, but the datasets are still missing.
   - Default coexecution image without pulsar#523: same story. Launch uses client 0.15.15; the 0.15.0.2 stager needs legacy patterns.
   - Where it clearly helps:
     - Polling coexecution where submission already knew a ≥ 0.15.13 version (a declared one or a newer image). Finish used to read the missing status version as 0.6.0.
     - Galaxy-pull (`transfer`) destinations, where Galaxy's own `dynamic_match` at finish decides what to download.
   - The description's "remotes older than 0.15.13" bullet should be scoped accordingly. For undeclared old remotes, point to `remote_pulsar_version` (pulsar#523), and to the new `target_version_source: client` metric as the way to spot them.

4. **The description doesn't mention #23821 at all, and gives the wrong framing for `target_version_source`.**
   - Marius reviewed #23821 two days ago and it was closed without a word about what replaced it. The closing comment only says "this would all be more actionable with job metrics".
   - The description needs a short "Relation to #23821" paragraph:
     - what was dropped (the check skip, and why it's a no-op);
     - what was addressed (launch/finish agreement, from his review);
     - what moved to Pulsar (the container image map).
   - It also needs a "what you'll see today" note. Until a pinned `pulsar-galaxy-lib` contains pulsar#523, **every job records `target_version_source: unreported`**. Until pulsar#529 ships, polling coexecution jobs record no `server_version`. Otherwise someone enabling the plugin on dev will think it's broken.

### Should-fix

1. **`job_metrics.rst:203-205` points admins at a parameter nobody documents and today's client ignores.**
   - Carry #23821's `job_conf.sample.yml` snippet (under the `jobs_directory` example, ~line 969), marked as needing a `pulsar-galaxy-lib` with pulsar#523.
   - Or reword the rst to "declare the remote's version with `remote_pulsar_version` (needs a Pulsar client library release containing pulsar#523; see Pulsar's Galaxy configuration docs)".
   - Don't tell admins to set something that silently does nothing.
   - Marius's #523 commit `a3a58f1` already documents it in Pulsar's `galaxy_conf.rst`. Link there instead of repeating it.

2. **Reuse: `_path` re-derives the file-name convention** (`instrumenters/pulsar.py:149-150`).
   - `InstrumentPlugin._instrument_file_name` / `_instrument_file_path` already own `__instrument_<plugin_type>_<name>`. #23784's reader used them; #23850 swapped in a module-level copy so the runner-side writers could share it.
   - Suggested shape: make `_instrument_file_name` and `_instrument_file_path` classmethods. `plugin_type` is a class attribute on every concrete plugin, and this is the same move the PR already makes for `safety`. Then have the helpers use `PulsarPlugin._instrument_file_path(...)`.
   - Better still, make `write_version_target` / `write_version_status` / `read_target_version` classmethods on `PulsarPlugin`. The runner then calls `PulsarPlugin.write_version_target(...)`. That also removes the awkward state where the runner imports public names that aren't in `__all__` (`:174-175`).

3. **The safety logic reads inverted** (`instrumenters/pulsar.py:94-103`).
   - `default_safety = POTENTIALLY_SENSITVE`, but `safety()` returns `SAFE` for everything that isn't a version key.
   - The comment then explains the override rather than the default.
   - Suggest keeping `default_safety = Safety.SAFE`, as on dev, and returning `Safety.POTENTIALLY_SENSITVE` for `VERSION_LABELS` keys. The plugin then reads "transfer metrics are public as before; versions are admin-only", and the comment can go.
   - If the intent is "unknown future keys default to sensitive", say that in the comment instead.

4. **`read_target_version`'s `ValueError` catch exists only because `_write` isn't atomic** (`:139-146`, `:164-171`).
   - Marius's #23784 point was "don't be defensive about things we don't expect". Writing to a temp file in the same directory and `os.replace`-ing it would make a partial file impossible, and the catch and its test could go.
   - I didn't find an atomic-write helper in `galaxy.util` (grep for `atomic`), so this would be a few lines in `_write`. Optional; the current code is defensible as-is.

5. **`queue_job` recomputes `pulsar_version`** (`runners/pulsar.py:442`).
   - `__prepare_job` computes the same value at `:622`, and `check_job_config` computes it again.
   - Not wrong, but `queue_job` now has a local `pulsar_version` sitting right next to `client_outputs=self.__client_outputs(client, job_wrapper, pulsar_version)`.
   - Fine to leave. Mention only if touching it anyway.

### Nits

- **The target file goes to the remote and comes back.** `write_version_target` writes `__instrument_pulsar_version_target` into `working/metadata` before launch. `__upload_metadata_directory_files` stages that whole directory to the remote, and the `__instrument_*` dynamic pattern stages it back at finish, overwriting the local copy with identical content. Harmless; a docstring line would stop the next reader wondering.
- **`_job_metrics_directory` naming** (`runners/pulsar.py:106`). `__client_outputs` uses it as the outputs' `metadata_directory` (`:1029`), so the name says less than the role. `_metadata_directory` might fit both uses. Also, the `metadata_strategy == "legacy"` branch at `:493` still builds its own path. Leave it unless renaming.
- **Comment on the finish wiring** (`:831`): "Describe outputs as at submission - the remote collected them that way." Good; it explains *why*. Keep.
- **`# Submitted before Galaxy recorded it.`** (`:1118`) is borderline-obvious but cheap. Keep or drop.
- **Shared config caveat.** The plugin docs could warn that a job metrics file shared with Pulsar and naming `pulsar` will stop a Pulsar without #518's "skip unknown plugins" from starting. This predates #23850 (#23784 had the same issue), so it's optional here.
- **Mixed fixtures.** `test/unit/job_metrics/test_pulsar.py` uses `tmpdir` throughout while the runner tests use `tmp_path`. It was inherited from #23784; not worth churn.

### Things that are fine

- Moving `InstrumentPlugin.safety` to a classmethod and using it in `JobMetrics.dictifiable_metrics` (`job_metrics/__init__.py:125`) fixes a real gap. Before, a plugin configured only per destination lost any per-metric safety. It's covered by `test_version_metrics_are_only_for_admins[configured1]`, which would fail if reverted.
- Writing the status version *after* `pulsar_finish_job` (`:842-843`) means staged-back files can't clobber it. Correct ordering.
- The `unreported` default matches pulsar#523's semantics (with `c9e0958`, a missing key really means an old client).
- "Either side can land first" holds for non-breakage:
  - The transfer file names don't change.
  - Galaxy tolerates missing files.
  - Pulsar's tests only depend on its own skip logic.
  - The rename is safe because `268c54c` is only on `origin/dev` (checked with `git branch -r --contains`), never in a release.
  - The description should still say what's *visible* before the Pulsar pieces ship (must-fix 4), and that a dev config naming `pulsar_transfer` will fail to load after the rename.
- Imports are at module top. No buried imports.
- Tests aren't weakened. The renamed transfer tests carry over unchanged in substance.

## Proposed revised PR description

```markdown
> **Drafted by Claude (AI assistant) on jmchilton's behalf.**

Follows #23784 (Pulsar transfer job metrics). Replaces #23821, which I closed: knowing
which Pulsar version Galaxy assumed, and which one actually ran, seemed more useful than
more version logic. This also fixes the launch/finish disagreement Marius found reviewing
that PR.

Pulsar side: galaxyproject/pulsar#518 (transfer metrics, includes the matching rename),
galaxyproject/pulsar#529 (Pulsar records its own version, on top of #518), and
galaxyproject/pulsar#523 (`pulsar_version_source`). Either side can land first. Nothing
breaks without the other, but see "What you'll see before the Pulsar side ships" below.

**Renames the `pulsar_transfer` job metrics plugin to `pulsar`.** #23784 is only on `dev`,
so nothing released uses the old name. A `dev` job metrics config that names
`pulsar_transfer` will now fail to load. One plugin now reports everything Pulsar-related.
The files it reads keep their names: `transfer_<phase>` under plugin `pulsar` is still
`__instrument_pulsar_transfer_<phase>`.

**Records Pulsar versions as job metrics.** These are admin-only; the transfer figures stay
public.

| metric | meaning |
|---|---|
| `client_version` | Galaxy's `pulsar-galaxy-lib` |
| `target_version` | the remote version Galaxy submitted the job for |
| `target_version_source` | how Galaxy knew it (from pulsar#523): `remote`, `destination` (`remote_pulsar_version`), `container_image` (a published staging image), `client` (unknown, so the client library's version stands in), or `unreported` (a client library that predates pulsar#523) |
| `server_version` | the Pulsar that actually ran the job |
| `server_version_source` | `status` (reported in the finished job's status) or `job_files` (written by Pulsar into the job's files, pulsar#529; the only report from polling Kubernetes, TES, GCP Batch and AWS Batch runners) |

The runner writes the target at submission and the status version at finish. For now these
only record a mismatch; nothing warns about it.

**Finishes jobs for the version they were submitted for.** `finish_job` described outputs
using the version in the finished job's status, while submission used the version from
setup. Marius found two places these disagree:
- a `jobs_directory` (MQ) remote, where setup never asks the remote and the status reports
  the real version;
- polling coexecution, whose status carries no version at all, so it read as `0.6.0`.

Finishing now reuses the recorded target version, so it describes outputs the way the
remote was told to collect them. If the target itself was wrong, that is, an old remote
whose version Galaxy couldn't know (`target_version_source: client`), outputs can still go
missing. The fix there is declaring `remote_pulsar_version` (pulsar#523). The new metric is
how to spot those destinations. Jobs submitted before this change fall back to the old
behaviour.

**Relation to #23821.** That PR skipped `check_job_config`'s minimum-version check when the
version came from the client library. This one doesn't. With `pulsar_version_source:
client` the compared version is the pinned client library, which meets every entry in
`MINIMUM_PULSAR_VERSIONS`, so the skip only removed a log line. The coexecution concern
from that review (Galaxy knows the default staging image's version) is handled on the
Pulsar side by pulsar#523's map of published images.

**What you'll see before the Pulsar side ships.** With today's pin (`pulsar-galaxy-lib`
0.15.15), every job records `target_version_source: unreported`. Polling coexecution jobs
record no `server_version` until pulsar#529 is released. Transfer figures need pulsar#518.

Tests:
- unit tests for the plugin: reading, which server version source wins, admin-only
  visibility (including when the plugin is only configured per destination), formatting,
  and logged failures;
- a unit test for picking the submitted version at finish;
- an embedded Pulsar integration test that checks every version metric is recorded and that
  server, target and client versions agree.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

If must-fix 2 is addressed with a real finish-path test, add a bullet:
"- a unit test that finishing a job submitted for ≥ 0.15.13 sends dataset collector
descriptions even when the status reports no version (fails without the runner change);"

If should-fix 1 adds the sample config snippet, add a line under "Finishes jobs...":
"Documents `remote_pulsar_version` in `job_conf.sample.yml`, as Marius suggested on #23821."

## Drafted replies (not posted)

### #23784, thread on the warning/exc_info comment (reply under 4130643382 / our 4156871278)

```markdown
> **Posted by Claude (AI assistant) on jmchilton's behalf**, not written by John personally.

A correction to my reply above: this was fixed here in #23784, before it merged, by 110173c07cd. Reading transfer metrics catches only a missing file, and anything else goes to `JobInstrumenter.collect_properties`, which logs it with `log.exception`. #23850 (562941c8338) applies the same rule to the two helpers it adds. Sorry for the confusion.
```

### #23784, thread on the "don't be defensive" comment (reply under 4130647070 / our 4156863693)

```markdown
> **Posted by Claude (AI assistant) on jmchilton's behalf**, not written by John personally.

A correction to my reply above: the `isinstance` check went away here in #23784 before it merged (110173c07cd), not in #23850. #23850 (562941c8338) removes the matching guard from code it adds, the reader for the target-version file Galaxy writes. It keeps one catch, for a truncated write, because a metrics file shouldn't fail a job's finish.
```

If the user would rather make one correction than two, post only the second one and edit the first reply instead. Editing our own comment is less noisy, but it is still an edit on GitHub, so ask first.

### #23821 (closed), follow-up comment

```markdown
> **Posted by Claude (AI assistant) on jmchilton's behalf**, not written by John personally.

How your review here carried into #23850:

- **Launch/finish disagreement:** fixed there. The runner records the version it submitted a job for, and finishing reuses it rather than the version in the status.
- **Coexecution default image:** handled on the Pulsar side. galaxyproject/pulsar#523 maps the published `pulsar-pod-staging` images, including the default 0.15.0.2, to the Pulsar they were built from.
- **Skipping `check_job_config` for a client-reported version:** dropped. With today's client library it compares the client against itself, which always passes, so the skip only removed a log line.
- **What's new:** #23850 records the assumed (`target_version`, `target_version_source`) and actual (`server_version`) Pulsar versions as admin-only job metrics. A destination with the wrong version is now visible per job instead of failing quietly.
```

If should-fix 1 isn't taken, add a bullet:
"- `remote_pulsar_version` in `job_conf.sample.yml`: not carried yet; it's documented in Pulsar's `galaxy_conf.rst` (pulsar#523)."

### pulsar#523 body: proposed edit (Pulsar side, for awareness)

Its last paragraph still points at `jmchilton/galaxy:pulsar_version_source` (the closed #23821) and describes "log at info, skip the minimum check", which was never final. Suggested replacement:

```markdown
On the Galaxy side, galaxyproject/galaxy#23850 records `pulsar_version_source` as the `target_version_source` job metric, alongside the version Galaxy submitted for and the version that actually ran. Galaxy's behaviour doesn't change based on the key. It does nothing until a Pulsar release sends it.
```

## Follow-ups

- [x] Post the #23784 corrections: both replies edited in place 2026-10-01, with an "Edited" note.
- [x] Finish-path test added in 49bc391b74f; fails (0.6.0) with the old line.
- [x] #23850 description updated (this proposal plus the test and docs lines).
- [ ] Post the #23821 follow-up comment.
- [x] pulsar#523 body updated: all four sources, validation, docs location, #23850.
- [x] `remote_pulsar_version` docs: rst reworded, links to Pulsar's galaxy_conf docs (no sample config).

Also done in 49bc391b74f: should-fix 2 (InstrumentPlugin file naming is now classmethods; helpers are PulsarPlugin classmethods) and 3 (default SAFE, version keys sensitive). Should-fix 4/5 and nits not taken.
