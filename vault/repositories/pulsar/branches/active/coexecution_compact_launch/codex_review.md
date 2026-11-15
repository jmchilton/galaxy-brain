Run via gpt-6.1-sol at high effort.

# Codex review: coexecution_compact_launch

Reviewed `git diff coexecution_stage_out_failures...HEAD`. The parent is at `24006de` and the head at `7c57747`. The two commits under review are `c778e40` (compress long launch messages) and `7c57747` (send pulsar-finish only the job id).

## Method

Codex cannot run a shell on this host, so the prompt carried everything it needed (157 KB, passed on stdin). It held the brief, the diff and the full post-change `coexecution.py`, `util.py`, `submit_util.py`, `submit.py`, `finish.py`, `test/coexecution_launch_test.py` and `test/submit_util_test.py`. It also held the surrounding code:

- the TES, Kubernetes, GCP and AWS Batch clients, plus `gcp_job_config` runnable building and `container_job_config`
- `client.py` from `BaseRemoteConfiguredJobClient` to `MessageCLIJobClient`, and `scripts/submit.bash`
- the `main.py` config builders
- `submit_job` in `manager_endpoint_util`
- launch-config persistence in `stateful.py`, and `postprocess` reading it in `staging/post.py`
- `CoexecutionManager`
- `test/client_test.py` launch helpers and `test/integration_test_cli_submit.py`

The prompt contained no reasoning and no prior findings. Codex ran twice with the same prompt and read-only sandbox.

## Findings

Both runs returned an empty findings array, so there was nothing to triage and no commits were added.

Notes from my own pass, none of them defects:

- The default `PULSAR_CONTAINER_IMAGE` is still `galaxy/pulsar-pod-staging:0.15.0.2` (`pulsar/client/coexecution.py:27`). That image does not know `--base64_zlib`. Until a staging image built from this change is published and made the default, a job over the limit fails at argument parsing (argparse exit 2) instead of exec (exit 126). Jobs that fit are unaffected. The compatibility docs already say older images reject it. This is a release-sequencing note, not a code change.
- The plain `--base64` path never contains `//`. `json_dumps` keeps `ensure_ascii`, so every byte has its high bit clear, and twelve consecutive set bits are impossible. Only the compressed form needed the URL-safe alphabet, and that is what the change does.

## Gate (at 7c57747)

- `make lint` (ruff): passed.
- `.venv/bin/isort --check --diff pulsar test`: clean.
- `pytest test/coexecution_launch_test.py test/submit_util_test.py test/client_test.py test/tes_test.py`: 61 passed.
- `pytest --doctest-modules pulsar/client/util.py test/integration_test_cli_submit.py`: 5 passed.
- `mypy` on the five touched Python files: no issues.

Final head: `7c57747c6540b9f8beeb40f4690d34ba5d74d766`, unchanged. No code that later branches modify was touched (this is the top of the stack). No private security report was written.

READY
