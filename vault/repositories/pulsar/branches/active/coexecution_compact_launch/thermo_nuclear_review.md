Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review: coexecution_compact_launch

Reviewed `git diff coexecution_stage_out_failures...HEAD`: parent `24006de`, head `7c57747` (`c778e40` compress long launch messages as `--base64_zlib`; `7c57747` send `pulsar-finish` only the job id). Surrounding code read: `CoexecutionLaunchMixin` and the clients that use it (TES, Kubernetes, GCP, AWS Batch all go through `launch` and `_launch_containers`), `submit.py`, `finish.py` and `run.py` (all three call `add_common_submit_args`), `main.py`'s `--app_conf_base64`, `to_base64_json`/`from_base64_json` and their users, `MessageCLIJobClient`'s `nohup pulsar-submit --base64` path, `integration_test_cli_submit.py`.

## Overall

The change is small and in the right place. The encoding decision sits in one pure function (`job_message_arguments`) in the coexecution module, which owns the container-argument limit. The codec pair sits beside the existing base64 helpers in `util.py`. The decoder is one more option on the scripts' shared parser. No file grows near 1k lines (`coexecution.py` 190, `submit_util.py` 184, `util.py` 351). No conditionals are scattered through the clients: every coexecution client gets the behavior through the mixin. The compatibility constraint holds. A message that fits produces byte-identical `--base64` arguments, and the compressed form is a new flag that old images reject at argparse time. That is a deliberate, documented choice. The findings below are tightening, not structural regressions.

## Findings

1. **Job message options were three independent flags with implicit precedence.** Fixed in `8209081`. `_load_job_config` checked `--base64_zlib`, then `--base64`, then fell back to `--file`, mixing an early return with assign-then-return. A caller passing two would silently get one. The three options now sit in an argparse mutually exclusive group, and `_load_job_config` is a flat three-way dispatch. Not made `required`: a missing message keeps failing inside the logged `try` as before, rather than as an argparse exit 2 (under `--wait` that would change the Kubernetes exit-code behavior). Covered by the existing integration tests for each source.
2. **Two encoders for job messages in `launch`.** Fixed in `e4caffb`. The submit message went through `job_message_arguments`, but the finish message spelled `["--base64", to_base64_json(...)]` inline, so the flag choice lived in two places. Both now go through `job_message_arguments`; a job-id-only message always comes out plain `--base64`, so the wire is unchanged. The parameter was renamed `launch_params` -> `job_message`, and the error now indexes `job_id` instead of `.get` (it is always present).
3. **The launch test rebuilt pulsar-submit's parser by hand.** Fixed in `869d63d`. `_job_config` copied `--wait`/`--no-wait` into a fresh parser behind a `wait_args` flag. It now parses each container's arguments with the real `main()` of the script that container runs (looked up by `container.command`, with the script's runner monkeypatched to capture the parsed args). Checked: removing `--base64_zlib` from the parser fails 4 of the 6 tests. Container locals were renamed so they no longer shadow the `submit`/`finish` script modules.
4. **Considered, refuted: decode at the parse boundary (`type=from_base64_json`, a shared `dest`).** This would delete `_load_job_config` entirely. But argparse would then report decode errors as `invalid ... value: '<whole argument>'`, echoing the full message to stderr, and exit 2 before the app starts. That changes failure semantics and puts the message in logs. Not done.
5. **Considered, left: `_pulsar_script_args` takes a list of message tokens but a raw app-conf string.** The signature is slightly asymmetric, but building the common tail differently would churn argument order for no reader benefit.
6. **Scope note, not a finding: `MessageCLIJobClient`'s `nohup pulsar-submit --base64` goes unchanged.** That path sends one shell command string and has its own, tighter length limit. The remote Pulsar there may be any version, so compressing it would need a version story. It belongs in its own branch if ever needed.
7. **Tests.** The launch tests run Galaxy-shaped messages through the real `CoexecutionLaunchMixin.launch` and decode them with the real script parsers. `submit_util_test` runs real `pulsar-submit`, the tool and `pulsar-finish`, with a hand-built `--base64_zlib` value (which pins the wire format independently of the helper) and with a job-id-only finish. These are integration-level; none are trivial. `test_finish_needs_only_the_job_id` overlaps the compressed test's finish step, but it isolates the plain-submit path most jobs take. Kept.

## Gate (at `869d63d`)

- `make lint` (ruff): all checks passed.
- `.venv/bin/isort --check --diff pulsar test`: clean.
- `pytest test/coexecution_launch_test.py test/submit_util_test.py test/client_test.py test/tes_test.py test/integration_test_cli_submit.py test/client_k8s_test.py test/compatibility_doc_test.py test/pulsar_script_test.py test/scripts_config_test.py`: 79 passed.
- `pytest --doctest-modules pulsar/client/util.py`: 3 passed.
- `mypy` on the five touched Python files: no issues.

Final head: `869d63ded6188d46c4eada2f6062422b81d3e963`. This is the top of the stack, so no later branches were touched. Not pushed.

READY
