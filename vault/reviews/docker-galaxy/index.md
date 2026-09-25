# docker-galaxy recovery and modernization plan

State reviewed: 2026-09-21.

Upstream repository: <https://github.com/bgruening/docker-galaxy>

Starting point: <https://github.com/bgruening/docker-galaxy/pull/635>

## Recommendation

Treat PR #635 as a release-rescue effort, not as the modernization PR. Get a tested 26.1 appliance published with the smallest defensible diff, then improve CI, publication, extensibility, and security in small follow-up PRs.

Keep the existing all-in-one image compatible for the 26.1 cycle. Do not simultaneously rewrite it as a distributed production deployment. Establish a tested appliance contract first; use what the tests teach us to decide whether a smaller `galaxy-core` image and a Compose-based appliance are worth supporting for 26.2.

The immediate target should now be Galaxy `v26.1.1`, not `dev`: Galaxy published `v26.1.0` on 2026-08-02 and `v26.1.1` on 2026-08-04. An appliance release must never silently build whatever happens to be on Galaxy's moving `dev` branch.

## What is broken or risky today

- PR #635 is a draft with failed `Single Container Test` runs. The original logs expired from GitHub (HTTP 410). On 2026-09-21, the `26.1` branch was force-rebased onto the unchanged `main` tip and pushed with a tree-identical new commit (`1f07062`). Fresh CI reproduced the failure: the Docker build timed out fetching the unpinned `galaxy-dir-sync.py` helper from `git.embl.de`, before any Galaxy runtime test executed. Commit `03fcaaf` then vendored the user-supplied helper, recorded its upstream URL and SHA-256, and replaced the remote download with a local `COPY`. Both subsequent single-container runs built and booted Galaxy successfully and passed 233 BioBlend tests, but BioBlend 1.7.0 retained two binary-unit quota assertions incompatible with Galaxy 26.1's SI quota units. Commit `07220c3` updated the compatibility suite to BioBlend 1.9.0, which contains the upstream dual-unit assertions, and corrected its declared Galaxy target from 25.1 to 26.1.
- The PR changes the default Galaxy source from `release_26.0` to `dev`. The release workflow does not pass or validate a Galaxy version; it blindly builds the Dockerfile default when a GitHub release is published.
- Galaxy 26.1.1 exists, but the latest docker-galaxy GitHub release and Quay version tag remain 26.0.
- `quay.io/bgruening/galaxy:latest` still resolves to the 25.1 image, while the README's primary commands omit a tag. Users following the quick start therefore do not receive 26.0.
- The Quay 26.0 and `latest` indexes contain `linux/amd64` plus an attestation manifest, not a runnable ARM64 image. Draft PR #634 is useful work, but currently fails because ARM lacks a Mercurial wheel and needs build headers.
- `single_container.yml` runs on both `push` and `pull_request`, so a same-repository PR runs the expensive job twice. Its Python 3.10 matrix does not control the Python inside the image.
- The large Compose workflows are explicitly disabled with `if: false`; they provide no release confidence while still making the checks page look broad.
- The current release workflow publishes directly to the final Quay tag without first running acceptance tests on that exact artifact. It does not update release channels, verify the published digest, scan, sign, or emit an explicit SBOM/provenance policy.
- As of 2026-09-21, the CI actions used by the repository lag the Node 24-compatible major releases. The old check annotations already warned that Node 20 support would be removed on 2026-09-16.
- The image contains fixed development credentials/API keys, starts many services, normally starts as root, installs optional Python dependencies on startup, contains floating downloads such as `@galaxyproject/gx-it-proxy@latest`, and has no OCI `HEALTHCHECK`.
- The README still has stale badges, old repository names, an unversioned quick start, and unclear boundaries between demo, teaching, downstream-flavour, and production use.

## Product contract for a modern appliance

For 26.1, "ready for applications" should mean all of the following are continuously tested:

1. A user can pull an exact version, start it without `--privileged`, wait on a documented health/readiness signal, log in with explicitly supplied bootstrap credentials, upload data, run a small local tool, and stop cleanly.
2. A named `/export` volume survives container replacement. The same release restarts cleanly, and an upgrade from the previous supported release either succeeds through a documented migration command or fails before mutation with a useful message.
3. A downstream Dockerfile can `FROM` the exact image and install a small Tool Shed tool list non-interactively during build. This directly covers issues #622 and #637.
4. A tool can run through each advertised dependency mode. Local/Conda is required for the basic lane; Docker/Apptainer and CVMFS are opt-in capability lanes with explicit host requirements.
5. HTTPS/proxy-prefix, SFTP/FTP, Interactive Tools, Slurm, Grid Engine, CVMFS, and external job/container runners are claimed only when a maintained test exercises them.
6. Every published image can be tied to the docker-galaxy commit, exact Galaxy tag/commit, base image digest, build provenance, SBOM, supported platform, and test run.
7. Exact revision tags are immutable. Moving convenience tags have a documented policy.

This should be described as a self-contained appliance for development, teaching, evaluation, tool development, and small controlled deployments. It should not claim to replace the normal Galaxy production architecture until its security, upgrade, backup, and scaling contract is intentionally supported.

## Phase 1: get PR #635 across the finish line

### 1. Reset the release target

- Rebase the work on current `main`.
- Set `GALAXY_RELEASE` to the immutable upstream tag `v26.1.1` (or its commit SHA), not `dev` or a moving release branch.
- Add OCI labels for docker-galaxy revision, Galaxy source/ref, version, source URL, and creation time.
- Keep the file-source configuration typo fix and independently verify each Ansible role bump.
- Move the AI documentation addition to a separate docs PR unless it is required to operate 26.1. It is unrelated to diagnosing the image build.
- Remove the 26.0-only `common_startup.sh --skip-client-build` workaround if 26.1 no longer needs it, but prove this in the image build rather than assuming from its comment.

### 2. Make the failed build diagnosable

- First update actions to their Node 24-compatible majors and add `timeout-minutes` and workflow concurrency cancellation.
- Trigger the expensive single-container job only once per PR (`pull_request`) and on direct pushes to `main`, not both events for the same branch commit.
- Split `.github/workflows/single.sh` into named phases: build, boot, schedulers, readiness, HTTPS, transfer, CVMFS, BioBlend, Tool Shed install, Conda, persistence/restart, and image inspection.
- On every failure, upload container logs, Galaxy/Gravity logs, the effective sanitized config, `docker inspect`, disk usage, and relevant service status. Always clean named containers in a final step.
- Replace the unused Python matrix with an architecture/capability label that describes what is actually being tested.
- Do not paper over the failure with four whole-suite retries. Retry only known network fetches; deterministic test failures should fail once with evidence.

The old #635 logs cannot be recovered, but the 2026-09-21 reruns established that the first two blockers were compatibility-infrastructure problems rather than failures in #635's file-source feature: an unavailable remote helper and a stale BioBlend test release. Commits `03fcaaf` and `07220c3` address those in order. Continue through the fresh CI run to expose any Galaxy `dev`, Ansible role, Tool Shed, Conda, persistence, or file-source regressions behind them.

### 3. Require a small release gate

Before merging, require these amd64 checks on the PR-built image:

- build from an empty cache and from the normal cache;
- boot without `--privileged` and return the expected Galaxy version from `/api/version`;
- create/authenticate the configured admin without relying on baked public credentials;
- upload a tiny dataset and execute one local built-in tool;
- install the sample Tool Shed tool, execute it, restart with the same `/export`, and execute or resolve it again;
- build a tiny derived image that runs `install-tools` during `docker build`;
- stop with a bounded graceful timeout and fail the container if the managed Galaxy process dies.

Run the slower privileged Slurm, Grid Engine, Docker/Apptainer, CVMFS, HTTPS, transfer, BioBlend, and Interactive Tools coverage as a maintainer/nightly gate initially. Promote individual lanes to required once they are reliable.

### 4. Publish a release candidate, then promote it

- Push `26.1.1-rc.1` or a digest-addressed candidate after the PR gate passes.
- Test the pulled registry artifact, not merely the local build.
- Ask at least one real downstream flavour/application owner (for example the microbiology-lab image implicated in #630) to build and smoke-test against the candidate.
- Publish an immutable revision such as `26.1.1-r0`, then atomically move documented channels: `26.1.1`, `26.1`, `stable`, and `latest` if the project decides `latest` means the newest supported stable appliance.
- Pull each public tag after publication, compare digests, inspect its platform list, boot it, and attach the result to the GitHub release.

## Phase 2: repair CI and publication

### PR A — CI foundations

- Add `actionlint`, YAML validation, ShellCheck, Hadolint, and lightweight tests for helper scripts.
- Pin third-party actions to reviewed commit SHAs, with Dependabot updates enabled.
- Add path filters so docs-only changes do not rebuild the image.
- Add scheduled weekly builds that detect upstream download/pin breakage before release day.
- Add a workflow summary containing the image digest, Galaxy version, platform, size, duration, and links to diagnostics.

### PR B — acceptance test harness

- Turn the monolithic shell test into composable scripts with explicit setup/teardown and JUnit output.
- Create three lanes:
  - `smoke`: required on image PRs, unprivileged, bounded and deterministic;
  - `capabilities`: nightly/manual tests for privileged schedulers, CVMFS, container runners, proxy/HTTPS, transfer, and Interactive Tools;
  - `upgrade`: persistence and supported-version migration tests.
- Add a downstream-extension fixture Dockerfile and tool list to the repository.
- Test the documented root `compose.yaml` in addition to raw `docker run`.

### PR C — safe publication

- Build each platform once and identify it by digest.
- Test the candidate digest, then promote the same manifest to release tags instead of rebuilding after tests.
- Generate SBOM and provenance attestations; sign release manifests with keyless Sigstore/cosign if Quay's repository policy permits it.
- Add a vulnerability report. Begin report-only with a recorded baseline; block newly introduced critical vulnerabilities once the base is understood.
- Keep Quay canonical for the rescue release. Consider a GHCR mirror only after ownership and retention policy are agreed; do not make dual-registry work block 26.1.
- Add an explicit manual approval environment for final tag promotion and document who can rotate the Quay credential.

### PR D — ARM64

- Rebase and finish #634 after the amd64 release is healthy.
- Install the native compilation prerequisites for packages without ARM wheels and test which heavy services/packages are genuinely portable.
- Use native `ubuntu-24.04-arm` runners for acceptance rather than QEMU for the full runtime test.
- Publish a multi-platform tag only after the same smoke contract passes on both architectures. Until then, publish/label amd64 honestly.

## Phase 3: modernize the image without breaking consumers

### Reproducibility and supply chain

- Pin Galaxy to a tag plus recorded commit, base images by digest, Miniforge and `tini` with checksums, gx-it-proxy to a version, and every downloaded script/source to a reviewed revision.
- Replace remote `ADD` and unauthenticated `curl | sh` patterns where practical with download, checksum/signature verification, and installation steps.
- Record all component versions in a machine-readable `/usr/share/galaxy-appliance/manifest.json` and expose a `galaxy-appliance version` command.
- Make builds fail on HTTP errors; several current `curl` calls use silent mode without `--fail`.

### Runtime contract

- Add separate liveness and readiness checks; an nginx 200 is not sufficient if Galaxy/handlers are dead.
- Ensure PID 1 forwards signals and returns nonzero when the essential Galaxy service fails (related to old issue #427).
- Bake required Python dependencies into the image. Runtime startup should not mutate the Galaxy virtualenv from public package indexes.
- Replace fixed public admin password/API keys with explicit inputs or first-start generated secrets. Preserve an opt-in clearly named demo mode for workshops.
- Add configuration preflight that reports invalid/deprecated `GALAXY_CONFIG_*` names before starting services.
- Define versioned ownership and permissions for `/export`; avoid recursive chowns and destructive copying on every boot.
- Add a read-only-root/filesystem experiment and document the exact writable paths, even if it cannot be the default in 26.1.

### Capabilities and composition

- Keep the compatibility all-in-one image during 26.1, but make optional services explicit profiles rather than an undocumented collection controlled by substring matching in `NONUSE`.
- Prefer the existing CVMFS sidecar for the normal path. Privileged in-container CVMFS should be a legacy/advanced mode.
- Decide whether the disabled legacy `compose/` stack is supported. The recommended short-term choice is to mark it experimental/deprecated and provide one small, tested root `compose.yaml`; restoring its old scheduler/Kubernetes matrix should not block the appliance.
- Prototype a non-root, single-purpose `galaxy-core` image only after the appliance tests exist. A future Compose appliance could combine that image with maintained PostgreSQL, Redis/RabbitMQ, nginx, and CVMFS sidecars. Do not replace the existing image until persistence and extension migrations are demonstrated.

## Documentation work

The docs PR can deliver value independently of image refactoring:

- Replace the untagged quick start with an exact supported tag and add a tested `compose.yaml` quick start.
- State the intended use cases, host requirements, supported architecture, expected startup time/resources, and which features require privileged access or a Docker socket.
- Document bootstrap secrets, TLS/proxy deployment, backup/restore, database migration, rollback, volume ownership, and the compatibility promise for `/export`.
- Publish a capability matrix whose rows map directly to CI lanes.
- Add a tested "extend this image and install tools" tutorial and a tested local-tools tutorial.
- Explain CVMFS visibility inside Apptainer/Docker jobs, including required bind mounts, not merely visibility from the Galaxy container.
- Replace stale Travis/MicroBadger/Gitter badges and old `docker-galaxy-stable` clone URLs.
- Add a release policy: supported Galaxy lines, security rebuild cadence, tag mutability, deprecation window, and where support questions belong.
- Generate reference documentation for supported appliance environment variables from a maintained data file or test it against the Dockerfile/config templates to prevent drift.

## Issue triage tied to tests

- #637 and #622: reproduce with a two-stage downstream Dockerfile; make that fixture a required test. The reported tusd failure is likely in the image's build-time `install-tools` wrapper/config, not something users should work around.
- #636: reproduce the exact multi-package Conda environment, capture resolver commands/config and environment contents, and compare with plain Galaxy 26.0. If it also fails with docker-galaxy's config outside the container, file a minimized Galaxy or galaxy-tool-util issue; otherwise fix the appliance resolver/persistence setup.
- #630: distinguish "CVMFS is mounted in the Galaxy container" from "the tool container binds `/cvmfs`". Add a tool execution assertion that reads a known CVMFS file from inside Apptainer, then fix the generated job configuration or documentation.
- #632: request logs/version/volume details, then cover the identified path with the persistence restart test.
- #618: either add one minimal Interactive Tools smoke test and support it, or clearly mark it outside the basic appliance contract.
- Older Compose/Kubernetes issues: close or label them against an explicit support decision rather than leaving a 2017–2020 design backlog indistinguishable from current appliance bugs.

Create milestones such as `26.1 appliance`, `CI/publication`, `extensibility`, and `future architecture`, and label issues by capability. This gives contributors bounded work and lowers Björn's review burden.

## Work that belongs upstream in Galaxy

Do not begin by filing broad "Galaxy in Docker" issues. First produce a minimal reproducer that does not depend on this image's Ansible/startup layer. Good upstream candidates are:

- a stable machine-readable way to validate config/environment overrides before full startup;
- regressions where a supported Galaxy release changes bootstrap/config behavior without a diagnosable error;
- the multi-requirement resolver failure from #636, if reproduced in a plain release_26.1 checkout with the same configuration;
- reusable health/readiness commands that verify web process, database, handlers, and migrations;
- a release-checklist hook that tests the docker-galaxy release candidate during Galaxy's freeze rather than beginning the appliance bump after Galaxy is published.

The Galaxy 26.1 publication checklist was tracked in galaxyproject/galaxy#22750. For 26.2, volunteer an appliance RC check in that process and report the tested image digest back to the release issue.

## Suggested contribution sequence

1. Comment on #635 with the recovered facts and ask Björn for permission to either push focused commits to his branch or open a replacement PR.
2. Open the Node 24/diagnostics/event-deduplication CI PR first so every later failure is useful.
3. Update #635 (or a replacement) to `v26.1.1`, separate unrelated docs, and get a fresh diagnostic run.
4. Fix only failures required by the amd64 smoke contract; publish and test `26.1.1-rc.1`.
5. Merge and promote the tested digest to the documented release channels; verify Quay from a clean pull.
6. Land the docs/capability matrix and triage current user issues against new tests.
7. Add safe publication, extension, upgrade, and scheduled capability coverage.
8. Finish ARM64.
9. Use the resulting evidence to choose between maintaining the monolith, introducing `galaxy-core`, or both for 26.2.

## Decisions to confirm with Björn

Propose defaults rather than asking open-ended questions:

- Canonical 26.1 product: retain `quay.io/bgruening/galaxy` as the all-in-one compatibility appliance.
- Supported platform at rescue release: amd64; ARM64 follows only when smoke tests pass.
- Primary scope: development, training, demos, tool/flavour authors, and small controlled deployments; not a general production replacement.
- Tag policy: immutable `X.Y.Z-rN`; moving `X.Y.Z`, `X.Y`, `stable`, and `latest` channels documented explicitly.
- Compatibility: support fresh installs plus an automated previous-supported-release `/export` upgrade; do not promise arbitrary old-volume upgrades.
- Legacy Compose stack: experimental/deprecated unless a named maintainer volunteers to restore its matrix.

These defaults preserve current users while creating a credible path to a smaller, safer application image later.
