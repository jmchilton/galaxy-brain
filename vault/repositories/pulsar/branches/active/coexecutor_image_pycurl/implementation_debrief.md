# Implementation debrief — `coexecutor_image_pycurl`

Run via claude-opus-5-5 (nested subagent of the ga4gh_wes_tes stage 3 agent). Parent `coexecution_client_fixes` `75185ac`; head `4ccfb64`.

## Problem

`pulsar/client/transport/__init__.py` picks the `get_file` and `post_file` used by `remote_transfer` staging by whether pycurl imports. `PULSAR_CURL_TRANSPORT` only picks the transport class for client API calls. `a87897c` dropped pycurl from `docker/coexecutor/Dockerfile` on the belief that it was opt-in, so staging fell back to `pulsar.client.transport.requests`, whose `post_file` loads the whole output into memory and whose `get_file` doesn't resume. `remote_transfer` is Galaxy's default file action for every coexecution runner.

## Fix

`pip install "$(ls /tmp/pulsar_app-*.whl)[amqp,galaxy_extended_metadata]" pycurl`, and a Dockerfile comment saying why. pycurl 7.49.0's manylinux cp312 wheel bundles libcurl, so the image still needs no compiler.

## Verification

No unit test: this is image content. [transport_check.sh](transport_check.sh) runs `post_file` on a 400 MB file (tmpfs) to a discarding HTTP server on 172.17.0.1:18778 inside each image and reads `ru_maxrss` ([output](transport_check_output.md)):

| Image | Staging transport | Peak RSS after 400 MB upload |
| --- | --- | --- |
| `0.16.1.dev0-4ccfb64` (this branch) | `pulsar.client.transport.curl` | 43 MB |
| `0.16.1.dev0-07051ab` (before) | `pulsar.client.transport.requests` | 835 MB |
| `galaxy/pulsar-pod-staging:0.15.0.2` | `pulsar.client.transport.curl` | 72 MB |

The [docker verification](../coexecution_stage_failures/docker_verification/output.md) (scenarios A and D) also shows the new image staging inputs and outputs over curl.

Build: `make -C docker/coexecutor all IMAGE=wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64` from the worktree (venv shared with `coexecution_publish_running` by symlink). Image `sha256:dd2377f2f74277a2d974517e4df67eeec7390372b81eb947ba174fa92b37e7a3`, 398 MB content size.
