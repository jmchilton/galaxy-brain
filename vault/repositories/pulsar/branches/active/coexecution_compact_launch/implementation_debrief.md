# Implementation debrief — `coexecution_compact_launch`

Run via claude-opus-5-5 (nested subagent of the ga4gh_wes_tes stage 6 coordinator, item H5, effort high). Parent `coexecution_stage_out_failures` `20b6460`; head `9036ff3`. Demo evidence: `runs/stage6/argv/` in `~/projects/repositories/galaxy-wes-tes` (README there); write-up in its `docs/pulsar-tes-runner.md#argument-size-ceiling`.

## The limit, reproduced

- The launch message is `base64(json.dumps(message))` in one argument of `pulsar-submit` (and, before this branch, of `pulsar-finish`). Linux's `MAX_ARG_STRLEN` is 131 072 bytes including the NUL, so 131 071 bytes is the longest argument; base64 lengths are multiples of 4, so 131 068 base64 bytes from 98 301 bytes of JSON is the longest message.
- Real message: the stage 3 hyphy `collapse_dataset` task (39 inputs), read from a copy of the demo's Funnel database: 36 946 JSON bytes, 49 264 base64. Structure: one `jobdir` entry, 39 `input` entries of 787 bytes each, the job script as a `config` entry (88 bytes per input of `cat "<input>" ;`), outputs and endpoints (2 743 bytes fixed).
- Per staged input: `229 + |name| + 2|P| + |quote_plus(P)| + |dataset id| + 36 + |files endpoint|` plus the tool's script text. Demo: 877 JSON bytes, so 108 inputs fit and 109 don't. The demo's `scripts/argv/launch_message.py` reproduces the real message to the byte at 39 inputs.
- TES level, same results on tesp-api `4bc9b5d` and Funnel 0.12.3: one argument of 131 071 bytes runs, 131 072 doesn't; Galaxy-shaped tasks with Pulsar's own decoder pass at 108 inputs and 98 301 JSON bytes, fail at 109 and 98 302.
- Failure modes: tesp-api `EXECUTOR_ERROR`, exit 126, `docker: Argument list too long`; Funnel `SYSTEM_ERROR` with a fake exit code 0 and the reason only in system logs (`fork/exec /usr/bin/docker: argument list too long`). Stock Galaxy leaves the job `queued`; the Galaxy polling branch fails it ("The task exited with code 126." / "... code 0.", checked with that branch's own `describe_tes_task_failure` on the real tasks).
- TESK (computed from stage 3 sizes): the task JSON annotation (all annotations ≤ 262 144 bytes) holds the message twice plus 1 616 bytes, so ≤ 130 264 bytes per copy: also 108 inputs.
- tesp-api detail found on the way: it joins an executor's arguments into one `sh -c` string when any argument has a shell metacharacter, so the limit then applies to the joined command. Pulsar's executors have none.

## What changed

1. `ea7bc6e` Compress coexecution launch messages too long for one argument.
   - `pulsar/client/coexecution.py`: `MAX_ARGUMENT_LENGTH = 32 * 4096 - 1`; `job_message_arguments(launch_params)` returns `["--base64", plain]` when it fits, else `["--base64_zlib", compressed]`, and raises when even the compressed form is too long. `_pulsar_script_args` takes the message arguments.
   - `pulsar/client/util.py`: `to_base64_zlib_json` / `from_base64_zlib_json` (zlib level 9, URL-safe base64).
   - `pulsar/scripts/submit_util.py`: `--base64_zlib` option; `_load_job_config` reads it first.
   - `docs/compatibility.yml` (+ regenerated `.rst`): the coexecution contract mentions `--base64_zlib`.
2. `9036ff3` Send pulsar-finish only the job id.
   - The finish container gets `--base64 <{"job_id": ...}>`. `run_server_for_job_finish` has read only `job_id` since 0.15.0 (checked at tag 0.15.0); postprocessing reads the persisted `launch_config` from the job directory on the shared volume.

## Decisions

- **Compress only when needed, no option.** The threshold is the kernel limit itself. Every job that started before sends byte-identical arguments, so new Galaxy with an old staging image changes nothing for jobs that worked; jobs that couldn't start still can't, but fail at once with `unrecognized arguments: --base64_zlib` (exit 2) instead of `Argument list too long`. An "always compress" destination option would have needed a version handshake the coexecution path doesn't have (Galaxy can't see the image's Pulsar version). Not added.
- **New flag instead of a prefix in `--base64`.** Old images' `b64decode` ignores non-alphabet characters, so a prefixed value would get as far as `json.loads` and fail later, in ways that differ per image version (older images exit 0 on failure, leaving the task hanging). argparse rejects an unknown flag in every version before doing anything.
- **URL-safe alphabet.** Required by tesp-api's `List[Path]` arguments (`//` collapsed). Measured: a standard-base64 compressed message lost 3 bytes and failed to decode on tesp-api; Funnel passed both. zlib output starts with `0x78`, so the value never starts with `-` (argparse would take it for an option).
- **Fail at launch when too large compressed.** Galaxy then fails the job at submit ("failure running job", the reason in Galaxy's log) instead of creating a task that can't start, which stock Galaxy would show as `queued` forever.
- **Not done:** sending the message as a file (TES `content` input: TES only guarantees 128 KiB there, and TESK puts inputs in the same annotation), or fetching it from Galaxy by job key (needs a Galaxy change and would also be the way to get credentials out of arguments, improvement item 17). Compression is client plus image only, no Galaxy change.

## Tests (fail before, pass after)

- New `test/coexecution_launch_test.py` (client, through `CoexecutionLaunchMixin.launch` with a recording `_launch_containers`, decoding with the real `submit_util` parser): small message stays plain; 300 and 1000 Galaxy-shaped inputs fit in one argument and round-trip; the compressed value has no `/`; `pulsar-finish` gets only the job id; 3000 inputs raise "too large".
- `test/submit_util_test.py`: `test_sequential_coexecution_with_compressed_launch_message` (real `pulsar-submit`/tool/`pulsar-finish` with a hand-built `--base64_zlib` value, pinning the wire format) and `test_finish_needs_only_the_job_id` (passes on `20b6460` too: proof that old images accept the new finish message).
- Before (on `20b6460`): 6 failed, 2 passed. Before the second commit (on `ea7bc6e`): 1 failed. After: the two files plus `compatibility_doc_test.py`, 23 passed. Logs: demo `runs/stage6/argv/pulsar-tests/`.
- Wider run: `tes_test`, `client_k8s_test`, `container_job_config_test`, `client_test`, `coexecution_manager_test`, `manager_coexecution_test`, `pulsar_script_test`, `scripts_config_test`, `integration_test_cli_submit`, `client_imports_test`: 147 passed, 1 failed (`manager_coexecution_test::test_simple_execution`: `python: not found` on this host's PATH; fails identically without the change).
- `make lint` (ruff) clean; isort clean; mypy clean on the touched modules.

## TES-level proof with the real client

`scripts/argv/client-matrix.sh` in the demo launches tasks through `TesMessageCoexecutionJobClient.launch` (the client Galaxy loads), with `message` inputs and kombu's memory broker, so the real staging image stages, runs and finishes without Galaxy. On both servers, 600 inputs: Galaxy's stock 0.15.15 client can't start (279 320-byte argument); the fixed client with image `9036ff3` is `COMPLETE` with all 600 inputs staged (29 KB argument, 260-byte finish argument); the fixed client with the old image exits 2 (argparse); 20 inputs run plain on either image; 6000 inputs raise in the client.

## Galaxy-level check (2026-11-15, demo commit `c070155`)

Galaxy v26.1.2 polling worktree `wes_tes_demo_fixes_v26.1.2` at `8b3166c80fb`, gap job conf, tool `argv_cat_many` (one job, every input named in the command) and `argv_cat_many_new` (routed to the fixed image). `scripts/argv/galaxy-before-after.sh`; evidence `runs/stage6/argv/galaxy/{tesp-2026-11-15T0339Z,funnel-2026-11-15T0353Z}/summary.md`.

- Calibration: 876 JSON bytes per input, 2 764 fixed, so N_max = 109 (it moves by one between histories, as dataset ids grow a digit).
- tesp-api, stock client and image `20b6460`: 10, 40 and 109 inputs `ok`; 110 `error` after 52 s with "TES task … ended in state EXECUTOR_ERROR before Pulsar reported a final job status. The task exited with code 126." (`docker: Argument list too long`).
- tesp-api, fixed client (overlay) and image `9036ff3`: 10 and 40 plain; 109, 110 and 600 compressed (12.8, 12.9 and 65 KB arguments), all `ok` with every input in the output; 600 inputs took 28 s. Task JSON at 110 inputs: 15 KB instead of 266 KB.
- tesp-api, fixed client with the old image: 110 inputs `error` after 49 s, exit code 2, `unrecognized arguments: --base64_zlib`; 20 inputs `ok` (plain, job-id-only `pulsar-finish` on the old image).
- Funnel: 108 inputs `ok` on stock Galaxy; 109 and 110 `error` with the stock client ("SYSTEM_ERROR … The task exited with code 0."); both `ok` with the fix.
- Secret scans (acceptance harness's `scan_evidence`) pass on both evidence directories.

## Demo port

Galaxy v26.1.2 pins pulsar-galaxy-lib 0.15.15 and can't import the 0.16 client (`build_client_manager` is not exported from `pulsar.client` any more). Branch `coexecution_compact_launch_0.15.15` (`f826997`, on tag 0.15.15, pushed to jmchilton) applies the same change to 0.15.15's `client.py`, `util.py` and `submit_util.py`, with the client test (5 failed before, 6 passed after; flake8 clean). Its pulsar-galaxy-lib wheel is installed with `--target` into the demo's `var/s6-argv/pulsar-overlay`; Galaxy's runner tests (`test_pulsar_tes_task_checks.py`, `test_runner_pulsar.py`, 48) pass with and without the overlay. Demo-only; not meant for a PR.

## Open

- Fork CI not checked.
