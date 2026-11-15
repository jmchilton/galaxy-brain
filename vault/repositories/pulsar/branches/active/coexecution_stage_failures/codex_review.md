Run via gpt-6.1-sol at high effort.

# Codex review: coexecution_stage_failures

Independent read-only review in a fresh Codex CLI session (`codex-cli 0.169.0`, `codex exec -s read-only` with the findings schema), coordinated and triaged by Claude Opus 5.5.

## Scope

- Range: `git diff coexecution_publish_running...HEAD`, parent `1a741aa`, head `948fa34`.
- Commits: `8dff9bd` (exit non-zero from `pulsar-submit --no-wait` and `pulsar-finish` on failure), `bf0bb7c` (preprocessing failure in the failed status's stderr), `948fa34` (stage-out test doesn't rely on stopping the test job files server).
- Codex's shell can't run on this host, so the prompt carried the diff, the full post-change `submit_util.py`, `submit.py`, `finish.py`, `stateful.py`, `test/submit_util_test.py`, plus `managers/status.py`, `managers/base/directory.py`, `JobDirectory` from `managers/base/__init__.py`, `managers/__init__.py`, `manager_endpoint_util.py`, `client/coexecution.py`, the `client/client.py` launch excerpt, the `test_utils.py` `server_for_test_app`/`files_server` helpers and the `bind_amqp.py` status publisher. The brief described the intended behavior only; no reasoning or prior findings.

## Findings

Codex returned an empty findings array on two independent runs with the same prompt. Its coverage notes list every supplied file as reviewed and nothing skipped beyond "limited to the supplied excerpts".

Nothing to confirm, refute or decide. Spot check during triage: `setup.py` wires `pulsar-submit`/`pulsar-finish` to `submit:main`/`finish:main` as console scripts, whose wrappers `sys.exit(main())`, so the returned codes reach the process exit status in installed entry points as well as under `python -m`.

## Gate

No code changes, so the gate ran on `948fa34`:

- `make lint` (ruff): passed.
- `.venv/bin/isort --check --diff pulsar test`: clean.
- `.venv/bin/pytest test/submit_util_test.py test/stateful_test.py`: 44 passed.
- `.venv/bin/mypy` on the five touched files: no issues.

## Result

No commits added. Branch head unchanged at `948fa3409e1bfa89c78280d6ed286997755383a8`.

READY
