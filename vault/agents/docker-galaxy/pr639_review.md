# Review: bgruening/docker-galaxy#639 — userspace CVMFS runtime

Reviewed 2026-09-25 at head `5221354` (3 commits on `main@e6c5877`). All CI checks were still queued, so this is a static review. The upstream `cvmfsexec` v4.54 source was checked at the pinned commit.

## Verdict

The design is sound. The approach is right: a pinned cvmfsexec build, an identity subuid map (keeps `/export` ownership the same in every mode), one entrypoint that decides the mode, and the Compose healthcheck gate. The earlier one-ID-namespace problem is fixed correctly. The inner `unshare -U` is dropped and the PID-handshake still signals `ready`. Five problems remain before merge: a startup2 regression, a test that mostly checks its own flag, a silent downstream break, duplicated logic, and CI cost.

## Findings (most severe first)

### 1. startup2 privileged path loses CVMFS tool-data tables (regression)
`startup2.sh` system mode with autofs configured skips the explicit mounts; autofs only mounts once supervisord starts. `cvmfs_config setup` provides `/etc/auto.cvmfs`, so the image always has autofs configured. The new `cvmfs_data_available` check runs before supervisord, so it finds no files and the `/cvmfs/data.galaxyproject.org/.../tool_data_table_conf.xml` paths are never appended. On `main`, `$PRIVILEGED` appended them unconditionally. `startup.sh` is unaffected because it mounts explicitly in system mode.
Fix: in system+autofs mode, `ls` each requested repo to trigger the mount first (needs automount running), or keep appending unconditionally in system mode as before.

### 2. The userspace test mostly checks the startup script's own flag
`CVMFS_READY_FILE` is written by `startup.sh` from the same `-r` checks that gate the config. The smoke test only reads it back. That proves root in the namespace could read `.cvmfspublished` before Galaxy started. It does not prove:
- that Galaxy, running as uid 1450 after `setpriv`/`sudo` inside the userns, loaded the tables;
- that anything under `singularity.galaxyproject.org` is reachable from a job.
The README's claim of verifying "reference-data, tool-data, and tool-container paths" says more than the test checks.
Fix: assert through the API instead, e.g. `GET /api/tool_data` lists a CVMFS-backed table such as `all_fasta` with entries. Then drop the test-only `CVMFS_READY_FILE` hook from the production startup scripts. For the singularity repo, either run a trivial job or drop "tool-container" from the claim until the Interactive Tools/Planemo follow-up covers it.

### 3. Startup without the entrypoint silently loses privileged CVMFS
Mode resolution now lives only in `cvmfs-entrypoint`. If `startup` runs with `CVMFS_RESOLVED_MODE` unset, even under `--privileged`, it hits the `else` branch and prints "unavailable in the resolved runtime mode". That happens with `--entrypoint`, or in a downstream flavour that sets `ENTRYPOINT ["/sbin/tini","--"]` (the old base value). On `main` that setup mounted CVMFS.
Fix: when `CVMFS_RESOLVED_MODE` is unset, fall back to the old `$PRIVILEGED`→system behaviour, or source the resolver from startup.

### 4. The mode handling is duplicated between startup.sh and startup2.sh
About 40 identical lines appear in both files: the mode if/elif chain, the `cvmfs_available`/`cvmfs_data_available` computation, the placeholder-dir loop, the tool-data append, and the ready file. The PR already added `cvmfs-functions.sh`. Move `cvmfs_prepare_mounts` / `cvmfs_tool_data_available` / `cvmfs_create_placeholders` into it so the two startups call one implementation. #1 is exactly the kind of drift this duplication invites.
The same applies to the `1:1:65535` range, which is hardcoded in three places: the Dockerfile's `/etc/subuid` and `/etc/subgid`, the patch, and the entrypoint probe. The probe could read `/etc/subuid`.

### 5. autofs still autostarts in every mode
`supervisor.conf.j2` sets `[program:autofs] autostart=true` and `autorestart=true`.
- Userspace mode: `automount` runs inside the userns, where autofs can't mount. Expect a restart loop that ends FATAL, which is noise in the logs and in `supervisorctl status`. If it ever did mount, it would shadow the bind-mounted repos.
- External mode on the privileged Compose service: autofs mounts over the sidecar-propagated `/cvmfs`. That existed before this PR, but the PR now makes `external` an explicit mode.
Fix: start autofs only when the resolved mode is `system`. Either export `SUPERVISOR_AUTOFS_AUTOSTART` from the entrypoint, or `supervisorctl stop autofs` otherwise.

### 6. CI cost grows several times over
- `cvmfs.yml` now path-triggers on `galaxy/Dockerfile` and both startups. It builds the full Galaxy image and boots it.
- It also runs on both `push: '**'` and `pull_request`; the check rollup already shows two `build_test_publish` jobs.
- A Galaxy-image PR now builds that image about five times: single-container ×2, cvmfs ×2, arm64 ×1. None of those jobs has `timeout-minutes`.
Fix: move the amd64 userspace boot into the single-container job, which already built the image, or pass the image as an artifact. Deduplicate push/PR runs, and add timeouts.

### 7. Smaller items
- The README says the options are "two narrowly scoped security options". `seccomp=unconfined` removes the entire syscall filter. It is still far better than `--privileged`, but say that honestly. `no-new-privileges` (which upstream suggests) can't be used, because `sudo` and the setuid `newuidmap` are needed. Worth one sentence.
- The entrypoint prints `CVMFS mode: …` to stdout for every command, so `docker run img cat x > y` output gets polluted. Send it to stderr.
- The Compose healthcheck hardcodes the two repos, while the sidecar's `CVMFS_REPOSITORIES` can be overridden. `depends_on.required: false` needs Compose ≥ 2.20.2; document that minimum.
- `# shellcheck source=cvmfs-functions.sh` resolves against cwd. Use `# shellcheck source-path=SCRIPTDIR` (SC1091 fires today).
- The `/export/cvmfs-cache` default puts up to 4 GB of disposable cache inside the volume users back up. Consider documenting an exclusion, or defaulting outside `/export` when `/export` is a bind mount.
- In `smoke.sh`, files the container writes to the host cache dir are owned by host root, so `rm -rf` in cleanup silently fails on a non-root runner. That doesn't matter on GH runners, but matters locally.
- Not a regression: under `systempaths=unconfined` cvmfsexec uses `-pf`, and its inner PID-1 bash ignores SIGTERM. `docker stop` still ends in a hard kill of postgres, the same as `main` (old #427). Any future graceful-shutdown fix has to go through that namespace.

## What's good
- Identity subordinate map, so `/export` UIDs are the same in every mode.
- The probe actually switches to both service UIDs instead of assuming.
- `disabled` wins even if `/cvmfs` is readable, and `system` requires CAP_SYS_ADMIN explicitly.
- The pinned tag is checked by exact commit, and the patch is recorded in `VENDORED.md`.
- The Compose healthcheck gate removes the sidecar race.

## Unresolved questions
- Keep startup2 in scope? If so, fix #1 in this PR.
- Is an API-level tool-data check acceptable CI time, given it runs twice per arch?
- Default the cache outside `/export`?
