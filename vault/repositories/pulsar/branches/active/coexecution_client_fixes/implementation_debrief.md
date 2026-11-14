# Implementation debrief — `coexecution_client_fixes`

Run via claude-opus-5-5 (nested subagent of the ga4gh_wes_tes stage 3 agent). Parent `coexecution_dependency_dir_default` `e90a555`; head `75185ac`.

## Default staging image (`a65f21c`)

`PULSAR_CONTAINER_IMAGE` in `pulsar/client/coexecution.py` was `galaxy/pulsar-pod-staging:0.15.0.0`. Docker Hub (`hub.docker.com/v2/repositories/galaxy/pulsar-pod-staging/tags`, checked 2026-11-14) has only 0.10.0, 0.12.0, 0.13.0, 0.14.0, 0.14.15.0, 0.15.0.1 and 0.15.0.2. A destination without `pulsar_container_image` would fail to pull. Galaxy passes its own default (`DEFAULT_PULSAR_CONTAINER = "galaxy/pulsar-pod-staging:0.15.0.2"`), so Galaxy users don't hit it. Now `0.15.0.2`, the newest published tag, which is also in `KNOWN_PULSAR_CONTAINER_VERSIONS`.

Caveat: `0.15.0.2` contains Pulsar 0.15.0.dev1 and is broken with Galaxy 26.x for discovered outputs (`docs/compatibility.rst`). It is still the only correct published default until a new image is pushed.

`test/client_test.py:377` still uses the `0.15.0.0` string as an arbitrary fixture; left alone.

## TES state map and docstrings (`75185ac`)

`tes_state_to_pulsar_status` (`pulsar/client/tes.py`) had no `TesState.QUEUED` (pydantic-tes 0.4.0 defines it), so it logged "Unknown tes state" and returned `failed`; `tes_state_is_complete` returned `True`. Only the polling TES client uses these (`raw_check_complete`), so with it any job whose task waited for a worker would be failed by Galaxy. Now `queued` and not complete. Galaxy's `_update_job_state_for_status` treats `queued` as non-terminal.

The docstrings of `TesPollingCoexecutionJobClient` and `TesMessageCoexecutionJobClient` were swapped; fixed to match the Kubernetes and GCP pairs.

## Testing

| Test (`test/tes_test.py`) | Before | After |
| --- | --- | --- |
| `test_default_staging_image_is_published` | fails: `'galaxy/pulsar-pod-staging:0.15.0.0' in {...}` is false | passes |
| `test_queued_tes_task_is_queued_not_failed` | fails: `assert 'failed' == 'queued'` | passes |

Command: `.venv/bin/python -m pytest test/tes_test.py`. `make lint` passes; `client_test.py` and `client_k8s_test.py` pass.

## Not done

- `pulsar/client/aws_batch.py` has the same swapped docstrings, and `AwsBatchMessageCoexecutionJobClient` subclasses `BasePollingCoexecutionJobClient`, so the "message" AWS Batch client polls. Out of scope; worth an issue.
