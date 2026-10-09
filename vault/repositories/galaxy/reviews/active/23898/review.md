# galaxy#23898 - Use explicit Pulsar implementation imports

- PR: https://github.com/galaxyproject/galaxy/pull/23898 (draft, mvdbeek, base `dev`)
- Head reviewed: `c6f8234b5e459285e9637c1fa2ed6b985ee41402` (single commit "... and pin source branch"), merge-base `bd282b3900b6`
- Paired Pulsar change: branch `mvdbeek/pulsar@import-fix-no-getattr` at `ee25241a8dc6` (no Pulsar PR opened for it). Alternative is galaxyproject/pulsar#533 (`import-fix-explicit`, same module split plus package-level `__getattr__` compat shims). `ee25241` = #533 head `7600ebb` + one commit deleting the shims.
- Worktree: `~/projects/worktrees/galaxy/pr/23898`

## Verdict

Runner import change is correct and worth landing. Pin + build-variable scaffolding is a draft-only crutch and must be reverted before merge (author says so). Not mergeable as-is; approvable once a Pulsar release containing the split modules exists and the floor is bumped to it.

## What I checked

- `test/unit/app/jobs/test_pulsar_runner.py` against pinned Pulsar (`PYTHONPATH=<ee25241 checkout>:lib`): **30 passed**.
- Same runner against installed `pulsar-galaxy-lib 0.15.15`: `ModuleNotFoundError: pulsar.client.coexecution_manager` - so this is a hard floor bump, not a compatible refactor.
- Module availability: `coexecution_manager`, `staging/inputs`, `staging/models` exist in both #533 and `ee25241`, absent in 0.15.15. Galaxy's new imports therefore work with **either** Pulsar alternative.
- Every other Galaxy pulsar import still resolves at `ee25241`: `pulsar.client.staging.COMMAND_VERSION_FILENAME` (jobs/__init__.py, metadata/set_metadata.py - the latter keeps its try/except fallback), `pulsar.client.manager.ObjectStoreClientManager` (objectstore/pulsar.py), `pulsar.managers.util.{cli,retry,drmaa}` (runners util/cli, rsh, drmaa), `pulsar.client.client.BaseJobClient` (TYPE_CHECKING in runner). No non-import `pulsar.client.*` attribute references in lib/packages. No optional-import guards changed.
- `build_client_manager` from `coexecution_manager` (not `manager`) is the right choice: `manager.build_client_manager` at `ee25241` is the standard-only factory and would silently drop k8s/TES/GCP. Backend modules' SDK imports (`pykube_util`, `gcp_util`, `tes`) remain try/except-guarded, so eager loading in `coexecution_manager` doesn't add hard deps.
- `lib/galaxy/dependencies/__init__.py` has no pulsar-galaxy-lib conditional logic; nothing to update there.
- Side win: `jobs/__init__.py` and `set_metadata.py` import `pulsar.client.staging`, which becomes a constants-only module in the new layout (Pulsar #533 measures ~1.3 s -> ~2 ms).

## Findings (ranked)

1. **Source pin must not merge (blocker, acknowledged).** `pyproject.toml`, `packages/app/pyproject.toml`, and `pinned-requirements.txt` point at `git+https://github.com/mvdbeek/pulsar@ee25241...` - a personal fork commit. A direct-URL dependency in `galaxy-app` metadata is also rejected by PyPI on upload, so `packages/` publishing would break. Plus 6 files of `PULSAR_GALAXY_LIB=1` scaffolding (`[tool.uv.extra-build-variables]` / `[tool.uv.pip.extra-build-variables]` in both pyprojects, `common_startup.sh`, `tox.ini`, `packages/test.sh`). Without that variable Pulsar's `setup.py` builds `pulsar-app` (different dist name, pulls `galaxy-*` packages), so any pip/uv path not covered fails or installs the wrong thing. `common_startup.sh` also exports it into Galaxy's runtime env. All of it should be reverted, not just the three pin lines.
2. **Floor bump required at merge.** Replace pins with `pulsar-galaxy-lib>=<next release>` in root and `packages/app` (currently `>=0.15.15`, which no longer imports). Consequence: this change can't be backported to a release branch without also bumping Pulsar there.
3. **Choosing no-getattr over #533 breaks already-released Galaxy.** Every shipped `galaxy-app` declares `pulsar-galaxy-lib>=0.15.15` with no upper bound and imports `build_client_manager` etc. from `pulsar.client`. If Pulsar releases the no-`__getattr__` variant, any older Galaxy whose env upgrades Pulsar (package installs, admins upgrading Pulsar for a fix) gets `ImportError` at runner load. This Galaxy PR is compatible with both Pulsar variants, so it doesn't force that choice - worth keeping the shims (#533) at least for a deprecation cycle. This is the main one-way door, and it lives on the Pulsar side.
4. **Test nit: `# type: ignore[attr-defined]` on importing `build_client_manager` via `galaxy.jobs.runners.pulsar`** (needed due to `no_implicit_reexport`). Cleaner: import from `pulsar.client.coexecution_manager` and assert `pulsar_runner.build_client_manager is build_client_manager` - pins Galaxy's factory choice without reaching through a non-exported name.
5. **Test nit (proportionate):** the 6 coexecution backend x transport cases largely re-test Pulsar's own `coexecution_manager_test.py`. The Galaxy-specific regression is "runner uses the coexecution factory" plus `get_client` wiring; the 4 standard-transport cases + one coexecution case would cover it. Not blocking - they're real-object tests, fast (~7 s file total), and caught the right thing.

## Conflict with #23850 (local draft)

Textual only: both edit the import block at the top of `test/unit/app/jobs/test_pulsar_runner.py` (`from galaxy.jobs.runners.pulsar import PulsarJobRunner` line). #23850's runner hunks touch different regions and its new instrumenter imports nothing from `pulsar.client`. Trivial rebase either way.

## Merge ordering

1. Pulsar: pick #533 (shims) or the no-getattr branch (needs its own PR); merge; release `pulsar-galaxy-lib`.
2. Galaxy: revert pin + all `PULSAR_GALAXY_LIB` scaffolding; bump floor to that release in `pyproject.toml`, `packages/app/pyproject.toml`, and exact pin in `pinned-requirements.txt`; then merge.

## Risks

Galaxy-side the import change is a two-way door, but it requires a new Pulsar floor, and the paired no-`__getattr__` Pulsar variant would break already-released Galaxy versions with unbounded `pulsar-galaxy-lib` floors.

<details><summary>Risk Details</summary>

- Merging with the git source pin breaks `galaxy-app` publishing (direct URL deps) and any install path that misses `PULSAR_GALAXY_LIB=1`.
- After merge, Galaxy hard-requires the next Pulsar release; 0.15.15 fails at runner import.
- Not backportable to release branches without a Pulsar bump there.
- If Pulsar ships without the `__getattr__` shims, older Galaxy releases break on Pulsar upgrade (`ImportError: cannot import name 'build_client_manager' from 'pulsar.client'`).
- Importing `manager.build_client_manager` instead of `coexecution_manager.build_client_manager` would silently drop k8s/TES/GCP; the PR gets this right and the new tests guard it.

</details>

<details><summary>Risk Review Advice</summary>

The runner diff is mechanical and verified; reviewers should spend time on the Pulsar-side decision (shims vs none) because that determines whether existing Galaxy releases keep working, and on confirming every pin/build-variable line is reverted and the floor bumped in both pyprojects before this leaves draft.

</details>

## Draft review comment

_Posted by Claude (AI assistant) on behalf of jmchilton._

The runner import change looks right to me. I checked it against `ee25241` and against #533. The new paths (`coexecution_manager`, `staging.inputs`, `staging.models`) exist in both, so this Galaxy change works with either Pulsar option. The 30 tests in `test_pulsar_runner.py` pass against `ee25241`. Against 0.15.15 the runner fails with `No module named 'pulsar.client.coexecution_manager'`, so the floor has to move to the next release. Using `coexecution_manager.build_client_manager` is the right call, since `manager.build_client_manager` would drop k8s/TES/GCP without any error. Galaxy's other Pulsar imports (`staging.COMMAND_VERSION_FILENAME`, `manager.ObjectStoreClientManager`, `managers.util.*`) still resolve.

Before this leaves draft:

- Revert all the `PULSAR_GALAXY_LIB` scaffolding along with the three pins: the uv `extra-build-variables` tables in both pyprojects, `common_startup.sh`, `tox.ini`, and `packages/test.sh`. Then set `pulsar-galaxy-lib>=<release>` in the root and `packages/app` pyprojects and the exact pin in `pinned-requirements.txt`. The direct-URL dependency in `galaxy-app` would also be rejected by PyPI.
- On the Pulsar side, I'd lean toward keeping the #533 shims for at least one release cycle. Every released `galaxy-app` declares `pulsar-galaxy-lib>=0.15.15` with no upper bound and imports from `pulsar.client`. Without the shims, upgrading Pulsar under an older Galaxy breaks the runner at import time. This PR doesn't depend on that choice either way.

Small test nits:

- Instead of `from galaxy.jobs.runners.pulsar import build_client_manager  # type: ignore[attr-defined]`, import it from `pulsar.client.coexecution_manager` and assert `pulsar_runner.build_client_manager is build_client_manager`. That still checks which factory Galaxy uses, without importing a name the runner doesn't export.
- The six backend/transport combinations mostly re-test Pulsar's `coexecution_manager_test.py`. One coexecution case plus the four standard transports would cover what Galaxy needs. Up to you.
