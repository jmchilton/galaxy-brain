# Implementation debrief — `coexecutor_image_modern_base`

Run via claude-opus-5-5 (nested subagent of the ga4gh_wes_tes stage 2 agent). Base `origin/master` `08dedcb`; head `1138cd0`.

## Why

Galaxy's default TES/K8s staging image `galaxy/pulsar-pod-staging:0.15.0.2` dates from 2023 (Pulsar 0.15.0.dev1, Python 3.7, Debian 9). Galaxy 26.x assumes the image matches its own pulsar-galaxy-lib (0.15.15 in v26.1.2), sends `dataset_collector_descriptions`, and the old image silently drops discovered outputs (`docs/compatibility.rst`). The Dockerfile in `docker/coexecutor/` could not rebuild a current image: `FROM conda/miniconda3` can't install current Pulsar, and it looked for a py2.py3 wheel the build no longer produces.

## What changed (2 commits, only `docker/coexecutor/Dockerfile` and `Makefile`)

1. `a87897c`: base `python:3.12-slim-trixie` (digest `sha256:5e2bdb1b...`), Pulsar wheel with `amqp` and `galaxy_extended_metadata` extras. Dropped CVMFS (an unprivileged container can't mount it), Slurm/DRMAA/munge (coexecution never talks to a scheduler) and pycurl (opt-in). Conda init kept for containerless jobs behind `CONDA_INIT`. Makefile takes `IMAGE` and `DOCKER_BUILD_ARGS`.
2. `1138cd0`: `PULSAR_CONFIG_TOOL_DEPENDENCY_DIR=/pulsar_dependencies`. Without it Pulsar creates `dependencies/` relative to `/` at app startup and crashes on a read-only root filesystem (Funnel's default docker template). Commit message wording needs fixing (see index).

## Testing

- `make lint` passes.
- Image facts: Debian 13, Python 3.12.16, pulsar-app 0.16.1.dev0, kombu 5.7.0, galaxy-util/tool-util/job-execution 26.1.2, pydantic-tes 0.4.0; 391 MB content (old image 537 MB).
- Under Funnel v0.12.3, with and without `--read-only`: `pulsar-submit --help`, `pulsar-finish --help`, kombu round trip to the demo RabbitMQ, and `pulsar-submit` with a Galaxy-shaped app config.
- End to end: Galaxy v26.1.2 → PulsarTesJobRunner → Funnel ran fastp and MultiQC from the IWC short-read QC workflow with this image (demo run `runs/2026-11-14-b2563e46ebf0c519/`), outputs verified against the IWC test assertions.

## Open

- Pulsar code should not create `dependencies/` relative to the working directory when no `tool_dependency_dir` is configured; the env var is an image-side workaround.
- Not tested: the Kubernetes coexecution path, containerless (Conda) jobs, discovered outputs through this image.
- No published image tag; Galaxy's `DEFAULT_PULSAR_CONTAINER` still points at `0.15.0.2`.
