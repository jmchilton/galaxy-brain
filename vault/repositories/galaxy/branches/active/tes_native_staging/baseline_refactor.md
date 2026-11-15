Run via Claude Opus at high effort.

Seven refactor commits now sit directly on `tes_task_state_polling`, ahead of the design B feature. Six don't change behavior. They move the TES task key, the shared failure summary and the cancel-failure check into `util/tes_task.py`, extract the TES test fakes, and split the job files write and body helpers. The seventh changes behavior on its own: TES state checks use the MINIMAL view with a 30 s timeout, which the parent could take by itself. The branch's tree is unchanged.

# Baseline refactor: tes_native_staging

History rewritten locally, not pushed. Old head `d8668d40690`, kept as local branch `tes_native_staging_pre_baseline`. New head `d54c2284664`, 30 commits on `jmchilton/tes_task_state_polling` (`54d2aa613df`), up from 23.

**Tree equality:** `git diff tes_native_staging_pre_baseline tes_native_staging` is empty. Both heads have tree `3b4a340bee3`. No behavior-restoring change was added.

## Base refactor commits (parent-applicable)

Each one touches only code that exists on `tes_task_state_polling` and knows nothing about the TES-native runner. Any of them could go into the parent branch.

1. `5a648b71bda` **Move tes_task_key and TesTaskKey to util/tes_task.py.** The `pulsar.py` and `tes_task.py` half of the old `9737781e408`. No behavior change.
2. `265b4db2790` **Split describe_ended_tes_task out of describe_tes_task_failure.** The parent-function half of the old `4e0549dfc1b`, in its final form. The intermediate `summarize_tes_task_logs` / `TesTaskLogSummary` (from `cac3197b8f1`, removed again in `4e0549dfc1b`) never appears in the new history. No behavior change.
3. `4369c216116` **Move the TES cancel-failure check into util/tes_task.py** (`log_tes_cancel_failure`, now called by the Pulsar runner). The `pulsar.py`/`tes_task.py` half of `4e0549dfc1b`. No behavior change.
4. `e0a3c8fcd7f` **Move the fake TES server and job fakes into tes_fakes.py.** The old `214eadab4a3` without its TES-native additions (`change_state`, `working_directory`, `job_destination`). It keeps the short `serve_forever` poll interval.
5. `a0c60ba6d80` **Check TES task states with the MINIMAL view and a timeout.** The `tes_task.py`, fake-MINIMAL-view and Pulsar-test half of `36c8a97af9a`. **This changes behavior for the Pulsar TES runner.** Its state checks and failed-cancel checks request `view=MINIMAL` themselves, with a 30 s timeout, instead of BASIC through pydantic-tes. The Pulsar tests' view expectations change to match. The timeout itself isn't tested until the TES-native hang test (`82ca1787304`): no Pulsar-runner hang test existed to move, and adding one would have changed the tree.
6. `947ec4c3473` **Split JobFilesManager's write checks and moves into reusable steps.** `_assert_absolute` and `_write_staging_parent` come from `a94c18517a5`, and `write()`/`replace()` from `72edf42c2bf`. No behavior change. An existing tool stream's directory already exists, so skipping `safe_makedirs` before an append changes nothing.
7. `b1cf1be211a` **Factor job files upload staging and body batching into helpers.** `_new_staging_dir` comes from `a94c18517a5`, and `_body_batches` plus the `PARSER_WRITE_SIZE` → `STREAM_WRITE_SIZE` rename from `36cf4177ce9`/`72edf42c2bf`. One tiny behavior change: the unauthorized-upload staging parent (`new_file_path`) is now created if it's missing, as the authorized one already was. The commit message says so.

After these seven, the feature commits don't touch `pulsar.py`, `test_pulsar_tes_task_checks.py` or the parent's code in `tes_task.py`. Their only change to `tes_task.py` is the module docstring in the runner commit.

## Considered, not moved

- **Baseline tests.** No test added on the branch pins behavior that exists on the base. The job files query-count test and the raw PUT pins exercise new routes and tokens. `test_JobFilesManager.py` ends up unchanged against the base. So there are no "Baseline tests …" commits.
- **The TES-native side of the cancel dedupe stays late** (`30e9c0e897f`). I tried calling `log_tes_cancel_failure` from the cancel commit (`0d2a6384a62`). The `test_tes_runner.py` of that era monkeypatches `tes_runner.fetch_tes_task_state`/`tes_client_from_params`, which the shared helper doesn't use, so two tests failed. Those tests only moved onto the real fake server in `2c72ae62453`. The cancel commit keeps its own copy, and `30e9c0e897f` replaces it, as before.
- **`RAW_BODY_OPENAPI`** (`62be133f364`) and all token/directory authorization: feature-only, left in place.

## Changes to feature commits

- `97804f0d38a` (raw PUT): `_stream_body` uses `_body_batches`, and `_finish_replace` calls `JobFilesManager.replace`, instead of adding an `append_tool_streams` flag and a second copy of the buffering loop. The message is unchanged.
- `4abebd71d25` (runner prototype): `_task_failure` calls `describe_ended_tes_task`, still inside the original try/except. The message's paragraph about `summarize_tes_task_logs` is reworded.
- `193ef5988f0`, `e072fbddf80`: conflicts resolved onto the split manager and API helpers. Messages unchanged.
- `a40fc924df5` (re-key): only `tes.py` and its test. The message's last sentence now says it uses `tes_task_key` from `util/tes_task.py`.
- `09798a08d64` (new): the TES-native fake additions split out of `214eadab4a3`.
- `98a9b5984ae` (fake-server test rewrite): its view assertions expect `MINIMAL` from the start, because the base already checks with MINIMAL.
- `82ca1787304` (new subject): the rest of `36c8a97af9a`, the fake server's `delay` and `test_a_tes_server_that_hangs_does_not_stall_the_monitor`.
- `30e9c0e897f` (renamed "Share TES cancel and failure handling with the Pulsar TES runner"): only the `tes.py` part of `4e0549dfc1b`. The message is rewritten to describe just that part.
- `72edf42c2bf` became empty and was dropped. Its content is now in `947ec4c3473`, `b1cf1be211a` and `97804f0d38a`.
- Trailers are preserved. `127048958fc` (old `0d2a6384a62`) still has only the Co-Authored-By trailer, as the original did. New commits carry both trailers from the brief.

## Old → new commit mapping

| Old | New | Notes |
|---|---|---|
| — | `5a648b71bda` | base: from `9737781e408` |
| — | `265b4db2790` | base: from `4e0549dfc1b` (+ `cac3197b8f1`) |
| — | `4369c216116` | base: from `4e0549dfc1b` |
| — | `e0a3c8fcd7f` | base: from `214eadab4a3` |
| — | `a0c60ba6d80` | base, changes behavior: from `36c8a97af9a` |
| — | `947ec4c3473` | base: from `a94c18517a5`, `72edf42c2bf` |
| — | `b1cf1be211a` | base: from `a94c18517a5`, `36cf4177ce9`, `72edf42c2bf` |
| `36cf4177ce9` | `97804f0d38a` | adapted |
| `cac3197b8f1` | `4abebd71d25` | adapted, message edited |
| `494628858b5` | `193ef5988f0` | conflicts resolved |
| `a94c18517a5` | `e072fbddf80` | helpers moved to base |
| `0d2a6384a62` | `127048958fc` | unchanged |
| `9737781e408` | `a40fc924df5` | runner part only, message edited |
| `253b5cdc2de` | `afeef2ef104` | unchanged |
| `92750ffbefa` | `a12c82158c8` | unchanged |
| `214eadab4a3` | `e0a3c8fcd7f` + `09798a08d64` | split |
| `2c72ae62453` | `98a9b5984ae` | MINIMAL expectations |
| `4c7f419ad43` | `c26484d7d70` | unchanged |
| `95591a24d93` | `507815048a7` | unchanged |
| `863b67bb908` | `c0a5c1d1390` | unchanged |
| `532ea740fbb` | `7ea1b5a1450` | unchanged |
| `04085eef707` | `8fe3f4f46a8` | unchanged |
| `36c8a97af9a` | `a0c60ba6d80` + `82ca1787304` | split |
| `f2bf5a839d1` | `ef5886efe0e` | unchanged |
| `34906cb3cca` | `753ff1be937` | unchanged |
| `75193b32b92` | `1b5094cb960` | unchanged |
| `65e49afdf49` | `9eb64f7004e` | unchanged |
| `4e0549dfc1b` | `265b4db2790` + `4369c216116` + `30e9c0e897f` | split |
| `72edf42c2bf` | — | absorbed, dropped as empty |
| `62be133f364` | `0ec1773c6c6` | unchanged |
| `d8668d40690` | `d54c2284664` | unchanged |

## Tests

- **Every new commit**: whichever of the four unit files existed at that commit (`test_tes_runner.py`, `test_pulsar_tes_task_checks.py`, `test_JobFilesManager.py`, `test_job_files_tokens.py`) passed there. That is 61 passed for each base commit, then 69, 88, 93, 100, 101, 102 and 100–103 through the feature, ending at 103 passed on `d54c2284664`.
- **At `b1cf1be211a`** (top of the base refactors): `test/integration/test_job_files.py`, the base's own version, 32 passed. This covers the `_body_batches`/`_new_staging_dir`/`replace` refactor against the existing POST/GET routes.
- **Final head `d54c2284664`**: unit 103 passed. `test/integration/test_job_files.py` + `test/integration/test_tes_runner.py`: 45 passed (40 + 5).
- ruff, black and isort are clean on every file each base commit and each adapted feature commit touched. The final tree is byte-identical to the old head, so the earlier mypy result for that tree still holds.
