Run via GPT-6.1 (gpt-6.1-sol) at high effort.

# Codex review: `coexecution_publish_running`

- Range: `coexecutor_image_modern_base` (`acde50a`)...`3c27f58` (one commit, "Publish running from pulsar-submit --no-wait").
- Tool: `codex exec -s read-only`, codex-cli 0.169.0, findings schema from the `codex-review` skill. Its shell sandbox can't start on this host, so the prompt carried everything: the diff, the full post-change `pulsar/scripts/submit_util.py` and `test/submit_util_test.py`, plus `submit.py`, `finish.py`, `managers/stateful.py`, `managers/status.py`, `managers/unqueued.py` (coexecution manager), the `ManagerProxy` base, `manager_endpoint_util.py`, `messaging/__init__.py`, `messaging/bind_amqp.py`, `messaging/outbox.py`, `core.py` (app setup and shutdown), `client/coexecution.py` and `client/client.py` `get_pulsar_app_config` (how the `pulsar-submit` command and app config are built), and the `files_server` test helper. The brief said what the change should do and gave house style. It included no reasoning or earlier findings.
- The prompt is about 137 KB, larger than one argv string can be, so it went in on stdin (`codex exec ... - < prompt`).

## Findings

None. Codex returned an empty findings array. A second run of the same prompt also came back empty. Both runs covered all 18 supplied files.

Nothing to triage, so no code changes and no commits.

For context, the earlier Claude review (`review.md`) has four P3s: an unbounded `wait_for_launch` if the staging thread dies without writing a marker, the polling loop duplicated from `wait_for_job`, stacking on the image branch although the change is independent, and no HISTORY entry. Codex didn't raise any of them. They stay with that review and weren't re-decided here.

## Gate (on `3c27f58`, unchanged)

- `make lint` (ruff via tox): passed.
- `.venv/bin/isort --check --diff` on the two touched files: clean.
- `.venv/bin/pytest test/submit_util_test.py`: 3 passed.
- `.venv/bin/mypy pulsar/scripts/submit_util.py test/submit_util_test.py`: no issues.

Final head: `3c27f58` (no commits added).

READY
