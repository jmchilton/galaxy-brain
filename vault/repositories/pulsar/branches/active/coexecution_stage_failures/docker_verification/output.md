# Staging image verification, 2026-11-14T17:02:05Z

New image: wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64 (sha256:dd2377f2f74277a2d974517e4df67eeec7390372b81eb947ba174fa92b37e7a3)
Old image: wes-tes/pulsar-pod-staging:0.16.1.dev0-07051ab (sha256:04065941d40e636f07f7693855087047ee8fbf025f320c9168b27d669044cb2a)
Broker: rabbitmq:4.3.7-management@sha256:8e913a7748f808be4ce117c3df11817935775bcd83934d4de92441a7e93e9899, throwaway credentials, container removed afterwards

## A. Stage-in from an unreachable Galaxy, wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64

$ docker run --rm --read-only -v <staging volume>:/pulsar_staging  wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64 pulsar-submit --no-wait ...
exit code: 1 (8.2 s)
  | 2026-11-14 17:02:12,059 DEBUG [pulsar.messaging.bind_amqp][[manager=_default_]-[action=preprocess]-[job=42]] Publishing Pulsar state change with status failed for job_id 42
  | 2026-11-14 17:02:12,060 ERROR [pulsar.managers.stateful][[manager=_default_]-[action=preprocess]-[job=42]] Failed job preprocessing for job 42:
  | Traceback (most recent call last):
  | pycurl.error: (7, 'Failed to connect to 172.17.0.1:18775 after 0 ms: Could not connect to server')
  | Traceback (most recent call last):
  |     raise PulsarClientTransportError(
  | pulsar.client.exceptions.PulsarClientTransportError: Connection refused (transport code: 7, transport message: Failed to connect to 172.17.0.1:18775 after 0 ms: Could not connect to server)
  | 2026-11-14 17:02:12,062 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:227877c2-e04d-11f1-92ac-ce02fbcdb886] Begin publishing to key pulsarfix_1c176fbc_status_update
  | 2026-11-14 17:02:12,083 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:227877c2-e04d-11f1-92ac-ce02fbcdb886] Have producer for publishing to key pulsarfix_1c176fbc_status_update
  | 2026-11-14 17:02:12,095 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:227877c2-e04d-11f1-92ac-ce02fbcdb886] Published to key pulsarfix_1c176fbc_status_update
  | 2026-11-14 17:02:13,035 INFO  [pulsar.messaging.outbox][status-outbox-_default_-status-outbox] Status update outbox drain thread exiting (dir=/pulsar_staging/persisted_data/_default_-status-outbox)
  | 2026-11-14 17:02:13,036 ERROR [pulsar.scripts.submit_util][MainThread] Job ended with status [failed].
published: status='failed' stderr='Pulsar failed to stage inputs or launch the job: Connection refused (transport code: 7, transport message: Failed to connect to 172.17.0.1:18775 after 0 ms: Could not connect to server)'
CHECK PASS: A: pulsar-submit exits non-zero
CHECK PASS: A: publishes exactly ['failed']
CHECK PASS: A: no command_line written

## B. Same, before the fix: wes-tes/pulsar-pod-staging:0.16.1.dev0-07051ab

$ docker run --rm --read-only -v <staging volume>:/pulsar_staging  wes-tes/pulsar-pod-staging:0.16.1.dev0-07051ab pulsar-submit --no-wait ...
exit code: 0 (9.1 s)
  |     raise NewConnectionError(
  | urllib3.exceptions.NewConnectionError: HTTPConnection(host='172.17.0.1', port=18775): Failed to establish a new connection: [Errno 111] Connection refused
  | Traceback (most recent call last):
  |     raise MaxRetryError(_pool, url, reason) from reason  # type: ignore[arg-type]
  | urllib3.exceptions.MaxRetryError: HTTPConnectionPool(host='172.17.0.1', port=18775): Max retries exceeded with url: /api/jobs/42/files?job_key=REDACTED&path=/galaxy/files/dataset_1.dat&file_type=input (Caused by NewConnectionError("HTTPConnection(host='172.17.0.1', port=18775): Failed to estab
  | Traceback (most recent call last):
  |     raise ConnectionError(e, request=request)
  | requests.exceptions.ConnectionError: HTTPConnectionPool(host='172.17.0.1', port=18775): Max retries exceeded with url: /api/jobs/42/files?job_key=REDACTED&path=/galaxy/files/dataset_1.dat&file_type=input (Caused by NewConnectionError("HTTPConnection(host='172.17.0.1', port=18775): Failed to es
  | 2026-11-14 17:02:21,876 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:2851fbb4-e04d-11f1-914c-66c6990fccee] Begin publishing to key pulsarfix_542ad923_status_update
  | 2026-11-14 17:02:21,910 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:2851fbb4-e04d-11f1-914c-66c6990fccee] Have producer for publishing to key pulsarfix_542ad923_status_update
  | 2026-11-14 17:02:21,916 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:2851fbb4-e04d-11f1-914c-66c6990fccee] Published to key pulsarfix_542ad923_status_update
  | 2026-11-14 17:02:22,865 INFO  [pulsar.messaging.outbox][status-outbox-_default_-status-outbox] Status update outbox drain thread exiting (dir=/pulsar_staging/persisted_data/_default_-status-outbox)
published: status='failed' stderr=''
CHECK PASS: B: old image exits 0 (the bug)

## C. Stage-in failure with the broker unreachable too, wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64

$ docker run --rm --read-only -v <staging volume>:/pulsar_staging  wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64 pulsar-submit --no-wait ...
exit code: 1 (15.9 s)
  | pycurl.error: (7, 'Failed to connect to 172.17.0.1:18775 after 0 ms: Could not connect to server')
  | Traceback (most recent call last):
  |     raise PulsarClientTransportError(
  | pulsar.client.exceptions.PulsarClientTransportError: Connection refused (transport code: 7, transport message: Failed to connect to 172.17.0.1:18775 after 0 ms: Could not connect to server)
  | 2026-11-14 17:02:30,031 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:2d2e630c-e04d-11f1-ae11-3e84760b945a] Begin publishing to key pulsarfix_81bdff09_status_update
  | 2026-11-14 17:02:30,036 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:2d2e630c-e04d-11f1-ae11-3e84760b945a] Have producer for publishing to key pulsarfix_81bdff09_status_update
  | 2026-11-14 17:02:33,026 DEBUG [pulsar.client.amqp_exchange][MainThread] [publish:2ef77188-e04d-11f1-ad5a-3e84760b945a] Begin publishing to key pulsarfix_81bdff09_status_update
  | 2026-11-14 17:02:33,027 DEBUG [pulsar.client.amqp_exchange][MainThread] [publish:2ef77188-e04d-11f1-ad5a-3e84760b945a] Have producer for publishing to key pulsarfix_81bdff09_status_update
  | 2026-11-14 17:02:36,038 WARNI [pulsar.messaging.outbox][status-outbox-_default_-status-outbox] Outbox publish failed for 00000000000000000000-954de2e25d174652a0558853077ab2be.json; will retry on next drain pass: [Errno 111] Connection refused
  | 2026-11-14 17:02:36,038 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:30c30e6e-e04d-11f1-ae11-3e84760b945a] Begin publishing to key pulsarfix_81bdff09_status_update
  | 2026-11-14 17:02:36,039 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:30c30e6e-e04d-11f1-ae11-3e84760b945a] Have producer for publishing to key pulsarfix_81bdff09_status_update
  | 2026-11-14 17:02:39,030 ERROR [pulsar.scripts.submit_util][MainThread] Job ended with status [failed].
published: nothing
CHECK PASS: C: pulsar-submit exits non-zero with no broker

## D. Success path, read-only root, no PULSAR_CONFIG_TOOL_DEPENDENCY_DIR, wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64

image Env: ["PATH=/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin","LANG=C.UTF-8","GPG_KEY=7169605F62C751356D054A26A821E680E5FA6305","PYTHON_VERSION=3.12.16","PYTHON_SHA256=b5796915dc45ff745cfb4e990a7e7c93d6f546328a102ce31448d69ebc37575c","PYTHONUNBUFFERED=1","PYTHONDONTWRITEBYTECODE=1","PIP_NO_CACHE_DIR=1","PIP_DISABLE_PIP_VERSION_CHECK=1","PIP_ROOT_USER_ACTION=ignore"]
CHECK PASS: D: image sets no PULSAR_CONFIG_TOOL_DEPENDENCY_DIR
$ docker run --rm --read-only -v <staging volume>:/pulsar_staging  wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64 pulsar-submit --no-wait ...
exit code: 0 (7.2 s)
  | 2026-11-14 17:02:44,671 INFO  [pulsar.messaging.outbox][status-outbox-_default_-status-outbox] Status update outbox drain thread starting (dir=/pulsar_staging/persisted_data/_default_-status-outbox)
  | 2026-11-14 17:02:45,173 DEBUG [pulsar.messaging.bind_amqp][[manager=_default_]-[action=monitor]] Publishing Pulsar state change with status running for job_id 42
  | 2026-11-14 17:02:45,174 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:3634f5f6-e04d-11f1-86e3-aab37579eceb] Begin publishing to key pulsarfix_79e3d2b0_status_update
  | 2026-11-14 17:02:45,176 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:3634f5f6-e04d-11f1-86e3-aab37579eceb] Have producer for publishing to key pulsarfix_79e3d2b0_status_update
  | 2026-11-14 17:02:45,182 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:3634f5f6-e04d-11f1-86e3-aab37579eceb] Published to key pulsarfix_79e3d2b0_status_update
  | 2026-11-14 17:02:45,673 INFO  [pulsar.messaging.outbox][status-outbox-_default_-status-outbox] Status update outbox drain thread exiting (dir=/pulsar_staging/persisted_data/_default_-status-outbox)
tool executor (sh /pulsar_staging/42/command_line): exit code 0
$ docker run --rm --read-only -v <staging volume>:/pulsar_staging  wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64 pulsar-finish --base64 ...
exit code: 0 (8.5 s)
  | 2026-11-14 17:02:52,789 INFO  [pulsar.messaging.outbox][status-outbox-_default_-status-outbox] Status update outbox drain thread starting (dir=/pulsar_staging/persisted_data/_default_-status-outbox)
  | 2026-11-14 17:02:52,799 DEBUG [pulsar.messaging.bind_amqp][[manager=_default_]-[action=postprocess]-[job=42]] Publishing Pulsar state change with status complete for job_id 42
  | 2026-11-14 17:02:52,800 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:3ac0a426-e04d-11f1-8f50-e62f32bc5b17] Begin publishing to key pulsarfix_79e3d2b0_status_update
  | 2026-11-14 17:02:52,803 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:3ac0a426-e04d-11f1-8f50-e62f32bc5b17] Have producer for publishing to key pulsarfix_79e3d2b0_status_update
  | 2026-11-14 17:02:52,808 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:3ac0a426-e04d-11f1-8f50-e62f32bc5b17] Published to key pulsarfix_79e3d2b0_status_update
  | 2026-11-14 17:02:55,292 INFO  [pulsar.messaging.outbox][status-outbox-_default_-status-outbox] Status update outbox drain thread exiting (dir=/pulsar_staging/persisted_data/_default_-status-outbox)
published: status='running' stderr=''
published: status='complete' stderr=''
output received by fake Galaxy: 'cow file contents\n'
CHECK PASS: D: submit, tool and finish exit 0
CHECK PASS: D: publishes ['running', 'complete']
CHECK PASS: D: output staged back

## F. Read-only root without the image's dependency dir ENV, old vs new code

$ docker run --rm --read-only -v <staging volume>:/pulsar_staging  wes-tes/pulsar-pod-staging:0.16.1.dev0-07051ab env -u PULSAR_CONFIG_TOOL_DEPENDENCY_DIR ...
exit code: 1 (2.8 s)
  | Traceback (most recent call last):
  |     sys.exit(main())
  | OSError: [Errno 30] Read-only file system: '/dependencies'
published: nothing
CHECK PASS: F: old code without the ENV fails on the read-only root
$ docker run --rm --read-only -v <staging volume>:/pulsar_staging  wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64 env -u PULSAR_CONFIG_TOOL_DEPENDENCY_DIR ...
exit code: 0 (6.7 s)
  | 2026-11-14 17:03:04,575 INFO  [pulsar.messaging.outbox][status-outbox-_default_-status-outbox] Status update outbox drain thread starting (dir=/pulsar_staging/persisted_data/_default_-status-outbox)
  | 2026-11-14 17:03:05,077 DEBUG [pulsar.messaging.bind_amqp][[manager=_default_]-[action=monitor]] Publishing Pulsar state change with status running for job_id 42
  | 2026-11-14 17:03:05,078 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:4212257e-e04d-11f1-bb49-ee2460336476] Begin publishing to key pulsarfix_78bb0a83_status_update
  | 2026-11-14 17:03:05,082 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:4212257e-e04d-11f1-bb49-ee2460336476] Have producer for publishing to key pulsarfix_78bb0a83_status_update
  | 2026-11-14 17:03:05,089 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:4212257e-e04d-11f1-bb49-ee2460336476] Published to key pulsarfix_78bb0a83_status_update
  | 2026-11-14 17:03:05,577 INFO  [pulsar.messaging.outbox][status-outbox-_default_-status-outbox] Status update outbox drain thread exiting (dir=/pulsar_staging/persisted_data/_default_-status-outbox)
published: status='running' stderr=''
CHECK PASS: F: new code without the ENV starts and submits

## E. Stage-out failure (fake Galaxy answers 500 to uploads), wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64

$ docker run --rm --read-only -v <staging volume>:/pulsar_staging  wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64 pulsar-submit --no-wait ...
exit code: 0 (6.7 s)
  | 2026-11-14 17:03:11,448 INFO  [pulsar.messaging.outbox][status-outbox-_default_-status-outbox] Status update outbox drain thread starting (dir=/pulsar_staging/persisted_data/_default_-status-outbox)
  | 2026-11-14 17:03:11,950 DEBUG [pulsar.messaging.bind_amqp][[manager=_default_]-[action=monitor]] Publishing Pulsar state change with status running for job_id 42
  | 2026-11-14 17:03:11,951 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:462ae24a-e04d-11f1-adfb-da55a91ab4fa] Begin publishing to key pulsarfix_8f7ed75a_status_update
  | 2026-11-14 17:03:11,954 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:462ae24a-e04d-11f1-adfb-da55a91ab4fa] Have producer for publishing to key pulsarfix_8f7ed75a_status_update
  | 2026-11-14 17:03:11,959 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:462ae24a-e04d-11f1-adfb-da55a91ab4fa] Published to key pulsarfix_8f7ed75a_status_update
  | 2026-11-14 17:03:12,450 INFO  [pulsar.messaging.outbox][status-outbox-_default_-status-outbox] Status update outbox drain thread exiting (dir=/pulsar_staging/persisted_data/_default_-status-outbox)
tool executor (sh /pulsar_staging/42/command_line): exit code 0
$ docker run --rm --read-only -v <staging volume>:/pulsar_staging  wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64 pulsar-finish --base64 ...
exit code: 1 (11.4 s)
  | 2026-11-14 17:03:20,745 INFO  [pulsar.messaging.outbox][status-outbox-_default_-status-outbox] Status update outbox drain thread starting (dir=/pulsar_staging/persisted_data/_default_-status-outbox)
  | 2026-11-14 17:03:20,757 WARNI [pulsar.managers.staging.post][[manager=_default_]-[action=postprocess]-[job=42]] Failures collecting results [PulsarClientTransportError()]
  | 2026-11-14 17:03:20,757 DEBUG [pulsar.messaging.bind_amqp][[manager=_default_]-[action=postprocess]-[job=42]] Publishing Pulsar state change with status failed for job_id 42
  | 2026-11-14 17:03:20,758 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:4b6ac5fe-e04d-11f1-8a36-dec7a9b178e4] Begin publishing to key pulsarfix_8f7ed75a_status_update
  | 2026-11-14 17:03:20,768 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:4b6ac5fe-e04d-11f1-8a36-dec7a9b178e4] Have producer for publishing to key pulsarfix_8f7ed75a_status_update
  | 2026-11-14 17:03:20,773 DEBUG [pulsar.client.amqp_exchange][status-outbox-_default_-status-outbox] [publish:4b6ac5fe-e04d-11f1-8a36-dec7a9b178e4] Published to key pulsarfix_8f7ed75a_status_update
  | 2026-11-14 17:03:23,248 INFO  [pulsar.messaging.outbox][status-outbox-_default_-status-outbox] Status update outbox drain thread exiting (dir=/pulsar_staging/persisted_data/_default_-status-outbox)
  | 2026-11-14 17:03:23,248 ERROR [pulsar.scripts.submit_util][MainThread] Job ended with status [failed].
published: status='running' stderr=''
published: status='failed' stderr=''
CHECK PASS: E: submit exits 0
CHECK PASS: E: pulsar-finish exits non-zero
CHECK PASS: E: publishes ['running', 'failed']

Summary: 14/14 checks passed
