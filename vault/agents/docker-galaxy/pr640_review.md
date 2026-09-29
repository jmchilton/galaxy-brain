# Review: bgruening/docker-galaxy#640 — CVMFS-backed tool execution via Planemo

Reviewed 2026-09-26 at head `ca065da` (3 commits, stacked on #639 `userspace-cvmfs`). CI green: Single Container, ARM64, Lint.

## Verdict

Good to merge after small fixes. Extracting the routing into `container-functions.sh` is a clean move, the same pattern #639 used for `cvmfs-functions.sh`. The Planemo test is strict in the right ways: `require_container`, a CVMFS-only resolver, `conda_auto_install=False`, an empty-discovery guard, and metric assertions. It closes the gap that #639 finding 2 left open ("tool-container" was claimed but never checked). No correctness bugs found. Five items remain, all small.

## Findings

### 1. Userspace routing ignores which repos are actually requested
`singularity_ok` becomes true whenever `CVMFS_USERSPACE_ACTIVE=true`. If a user sets `CVMFS_REPOSITORIES=data.galaxyproject.org`, every job still goes to `slurm_cluster_singularity` with `--userns`, but no images exist. Jobs fall back to running with no container. That isn't broken, but it's a surprising default change.
Fix: in userspace mode, also require `cvmfs_repository_requested singularity.galaxyproject.org` (it already exists in `cvmfs-functions.sh`). That means calling `cvmfs_set_repositories` before routing, or moving the routing call after line 150 in both startups.

### 2. Unit test name doesn't match what it checks
`test_privileged_routing_keeps_existing_arguments` passes no arguments and asserts `""`. What it really checks is that `--userns` is *not* added in privileged mode. Rename it (e.g. `test_privileged_does_not_add_userns`), or pass `arguments="--writable-tmpfs"` and assert it comes back unchanged.
Also missing: the case with neither privileged nor userspace (no Singularity, no `--userns`). That's the most common path, and a regression there would silently route to Singularity.
`docker_ok` depends on the host (`/usr/bin/docker` exists on GH runners). No test asserts it today, but any future assertion on `GALAXY_DESTINATIONS_DOCKER_DEFAULT` would be flaky. Stub `docker` or set `PATH` to a temp dir.

### 3. startup2 log level downgraded
On `main`, the "no Docker/Singularity detected" message used `log_warn`. It now goes through `log_info`, since only one logger is passed in. Either accept a second warn-logger argument, or have the function return a status and let the caller choose the level.

### 4. README gives two different entry points
The prose runs `test/smoke.sh` directly with `GALAXY_SMOKE_IMAGE=galaxy-cvmfs GALAXY_SMOKE_RUNTIME=userspace-cvmfs`. The test matrix row says `GALAXY_SMOKE_CVMFS_TOOL_TEST=true test/cvmfs/test-userspace.sh`, which is what CI uses. Pick one; `test-userspace.sh` is the better choice because it sets the runtime/port and matches CI. "The security configuration above" is vague, so link the section.

### 5. PR body slightly overclaims
The checklist says "Planemo verifies … CVMFS source image metrics". The metric check (`container_type`, `container_id`, `external_id`) is the Python heredoc in `test-tool-execution.sh`, not Planemo. The README gets this right ("Galaxy's job metrics confirm"); the PR body should match.

## Nits
- `prepare-job-config.py` routes `upload1` to `local_no_container`. Add a one-line comment saying why: `require_container` on the Singularity destination would otherwise fail uploads.
- The test resolver file intentionally differs from production (`container_resolvers_conf.yml.j2` puts docker `cached_mulled` first and also has `/export/...` singularity cache). That's fine because the production file has the same CVMFS entry. Say in the README that the test proves the mechanism, not the production resolver chain.
- The `case " ${ARGS} "` check only dedupes the literal `--userns` token. `-u` would produce a duplicate flag, which is harmless.
- The heredoc uses bare `assert`. It's fine for CI, but a `KeyError` on missing `job_metrics` (metrics plugin disabled) gives a poor message. `metrics.get(...)` plus an explicit message would read better.

## What's good
- Routing is deduplicated between startup/startup2 through a sourced lib, with `source-path=SCRIPTDIR` shellcheck directives (the #639 nit is fixed).
- `--userns` is prepended while user args are kept, and explicit destinations are preserved.
- The `squashfuse`/`fuse3` fix is explained in both the Dockerfile comment and the PR body.
- The test reuses the already-built amd64 image in the Single Container job (the CI-cost concern from #639 finding 6), and reports are uploaded with `if: always()`.
- The in-container `SINGULARITY_NAME` assertion plus the `container_id` metric together prove the job ran in a container *and* that the image came from CVMFS.

## Unresolved questions
- Gate userspace Singularity routing on the requested repos (#1), or accept the fallback?
- Should the routing unit test move to `lint.yml` so it runs without the image build?
