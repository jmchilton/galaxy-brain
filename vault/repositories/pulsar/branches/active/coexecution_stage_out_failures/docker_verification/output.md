# Staging image verification, 2026-11-14T18:32:35Z

New image: wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1 (sha256:9314ab4dfc7509e79ade1ebbb288c739f1be7ec058be2d859a43f6ce9b264676)
Old image: wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64 (sha256:dd2377f2f74277a2d974517e4df67eeec7390372b81eb947ba174fa92b37e7a3)
Broker: rabbitmq:4.3.7-management@sha256:8e913a7748f808be4ce117c3df11817935775bcd83934d4de92441a7e93e9899, throwaway credentials, container removed afterwards

## D. Success path (regression), wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1

$ docker run --rm --read-only -v <staging volume>:/pulsar_staging wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1 pulsar-submit --no-wait ...
exit code: 0 (7.3 s)
tool executor (sh /pulsar_staging/42/command_line): exit code 0
$ docker run --rm --read-only -v <staging volume>:/pulsar_staging wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1 pulsar-finish --base64 ...
exit code: 0 (8.2 s)
published: status='running' stderr=''
published: status='complete' stderr=''
output received by fake Galaxy: 'cow file contents\n'
CHECK PASS: D: submit, tool and finish exit 0
CHECK PASS: D: publishes ['running', 'complete']
CHECK PASS: D: output staged back

## G1. Galaxy down at stage-out, wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1

$ docker run --rm --read-only -v <staging volume>:/pulsar_staging wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1 pulsar-submit --no-wait ...
exit code: 0 (6.2 s)
tool executor (sh /pulsar_staging/42/command_line): exit code 0
stopped the fake Galaxy on 172.17.0.1:18784
$ docker run --rm --read-only -v <staging volume>:/pulsar_staging wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1 pulsar-finish --base64 ...
exit code: 1 (7.8 s)
  | 2026-11-14 18:33:05,141 ERROR [pulsar.managers.stateful][[manager=_default_]-[action=postprocess]-[job=42]] Failed to postprocess results for job id 42
  | Traceback (most recent call last):
  | 2026-11-14 18:33:07,637 ERROR [pulsar.scripts.submit_util][MainThread] Job ended with status [failed].
published: status='running' stderr=''
published: status='failed' stderr='Pulsar failed to stage outputs: Connection refused (transport code: 7, transport message: Failed to connect to 172.17.0.1:18784 after 0 ms: Could not connect to server)'
output received by fake Galaxy: None
CHECK PASS: G1: pulsar-finish exits non-zero
CHECK PASS: G1: publishes ['running', 'failed']
CHECK PASS: G1: failed stderr carries the stage-out error

## G2. Same, before the fix: wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64

$ docker run --rm --read-only -v <staging volume>:/pulsar_staging wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64 pulsar-submit --no-wait ...
exit code: 0 (8.4 s)
tool executor (sh /pulsar_staging/42/command_line): exit code 0
stopped the fake Galaxy on 172.17.0.1:18784
$ docker run --rm --read-only -v <staging volume>:/pulsar_staging wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64 pulsar-finish --base64 ...
exit code: 1 (8.5 s)
  | 2026-11-14 18:33:26,407 ERROR [pulsar.scripts.submit_util][MainThread] Job ended with status [failed].
published: status='running' stderr=''
published: status='failed' stderr=''
output received by fake Galaxy: None
CHECK PASS: G2: old image publishes failed with empty stderr (the bug)

## H. Fake Galaxy answers 500 to uploads, wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1

$ docker run --rm --read-only -v <staging volume>:/pulsar_staging wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1 pulsar-submit --no-wait ...
exit code: 0 (7.1 s)
tool executor (sh /pulsar_staging/42/command_line): exit code 0
$ docker run --rm --read-only -v <staging volume>:/pulsar_staging wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1 pulsar-finish --base64 ...
exit code: 1 (7.8 s)
  | 2026-11-14 18:33:41,261 ERROR [pulsar.managers.stateful][[manager=_default_]-[action=postprocess]-[job=42]] Failed to postprocess results for job id 42
  | Traceback (most recent call last):
  | 2026-11-14 18:33:43,757 ERROR [pulsar.scripts.submit_util][MainThread] Job ended with status [failed].
published: status='running' stderr=''
published: status='failed' stderr='Pulsar failed to stage outputs: Response code not 200 (transport code: 500, transport message: Failed to post_file properly for url http://172.17.0.1:18783/api/jobs/42/files?<query redacted>, remote server returned status code of 500.)'
output received by fake Galaxy: None
CHECK PASS: H: pulsar-finish exits non-zero
CHECK PASS: H: publishes ['running', 'failed']
CHECK PASS: H: failed stderr carries the stage-out error

## I1. Tool writes a directory where its output file belongs, wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1

$ docker run --rm --read-only -v <staging volume>:/pulsar_staging wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1 pulsar-submit --no-wait ...
exit code: 0 (6.3 s)
tool executor (sh /pulsar_staging/42/command_line): exit code 0
$ docker run --rm --read-only -v <staging volume>:/pulsar_staging wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1 pulsar-finish --base64 ...
exit code: 1 (7.7 s)
  | 2026-11-14 18:33:56,291 ERROR [pulsar.managers.stateful][[manager=_default_]-[action=postprocess]-[job=42]] Failed to postprocess results for job id 42
  | Traceback (most recent call last):
  | 2026-11-14 18:33:58,792 ERROR [pulsar.scripts.submit_util][MainThread] Job ended with status [failed].
published: status='running' stderr=''
published: status='failed' stderr='Pulsar failed to stage outputs: Output dataset_2.dat is a directory, not a file'
output received by fake Galaxy: None
CHECK PASS: I1: tool exits 0, pulsar-finish exits non-zero
CHECK PASS: I1: publishes ['running', 'failed']
CHECK PASS: I1: failed stderr names the directory
CHECK PASS: I1: nothing uploaded

## I2. Same, before the fix: wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64

$ docker run --rm --read-only -v <staging volume>:/pulsar_staging wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64 pulsar-submit --no-wait ...
exit code: 0 (7.4 s)
tool executor (sh /pulsar_staging/42/command_line): exit code 0
$ docker run --rm --read-only -v <staging volume>:/pulsar_staging wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64 pulsar-finish --base64 ...
exit code: 0 (9.2 s)
published: status='running' stderr=''
published: status='complete' stderr=''
output received by fake Galaxy: None
CHECK PASS: I2: old image finishes green with nothing staged (the bug)

Summary: 15/15 checks passed
