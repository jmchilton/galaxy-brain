# Issue 498 — replacing `ubuntu-22.04` runners

galaxyproject/pulsar#498 (nsoranzo, 2026-09-10). GitHub begins deprecating the
`ubuntu-22.04` runner image 2026-09-17; fully unsupported 2027-04-17. Three jobs in
`.github/workflows/pulsar.yaml` pin it: `lint`, `test`, `resilience`.

## Headline: DRMAA is not the blocker — Python 3.7 is

The working assumption going in was that the custom slurm-drmaa setup would be the hard
part. It isn't. `ppa:natefoo/slurm-drmaa` already publishes noble:

```
jammy: slurm-drmaa1 1.1.6-1ubuntu1~22.04  Depends: libslurm37  (>= 20.11.2)
noble: slurm-drmaa1 1.1.6-1ubuntu1~24.04  Depends: libslurm40t64 (>= 20.11.2)
```

and noble's archive carries a matching `slurm-wlm`/`slurm-wlm-torque` 23.11.4-1.2ubuntu5,
plus `munge`, `libswitch-perl`, `libgnutls28-dev`. Nate owns that PPA and has already done
the noble build. Every apt line in `.ci/setup_tests.sh` resolves on 24.04.

The actual wall is `actions/setup-python`. From `actions/python-versions`
`versions-manifest.json`:

```
3.7.17 -> linux platforms ['20.04', '22.04']     <- newest 3.7 build, no 24.04
3.8.18 -> ['20.04', '22.04', '24.04']
3.9.25 -> ['22.04', '24.04']
```

There is no 3.7 tool-cache build for noble and there will not be one — 3.7 went EOL
2023-06. So `runs-on: ubuntu-24.04` silently deletes the 3.7 cells from both `lint`
(`python-version: ['3.7']`, tox-envs `lint`/`docs`) and `test` (`test-ci`/`test-unit` at
3.7). That is a Python support-policy decision, not a CI chore, and it is the only thing
in issue 498 that needs a human to decide.

`uv` / python-build-standalone does not rescue this (oldest is 3.8), and deadsnakes has no
noble 3.7. The only ways to keep 3.7 on a supported runner are a `python:3.7-*` container
job or building 3.7 from source — both meaningfully worse than what exists today.

## Residual DRMAA risk — hypothesised, then ruled out

Two things the PPA index could not answer, which is what the spike below was for. **Both
came back clean**; this section is kept so the reasoning is auditable, not because there is
work here.

1. `.ci/setup_tests.sh` hardcodes
   `DRMAA_LIBRARY_PATH=/usr/lib/slurm-drmaa/lib/libdrmaa.so`. That path is a packaging
   detail and can move between distro builds. `dpkg -L slurm-drmaa1` settles it.
2. `scripts/configure_test_slurm.py` emits a slurm.conf written for a much older Slurm.
   jammy ships 21.08; noble ships 23.11. Suspect keys:
   - `ControlMachine=` — superseded by `SlurmctldHost=`.
   - `CryptoType=crypto/munge` — superseded by `CredType=`.
   - `SwitchType=switch/none` — removed in 24.05 (fine on 23.11, will bite at the next LTS).
   - `StateSaveLocation=/tmp` — modern slurmctld is fussier about ownership/permissions here.
   Slurm rejects unknown configuration keys rather than warning, so any one of these would
   be a hard startup failure. In the event 23.11 accepted the file unmodified.

## Spike

Branch `jmchilton/pulsar:ci-noble-spike` (worktree
`~/projects/worktrees/pulsar/branch/ci-noble-spike`), off `origin/master` a335872.
Temp commit; not PR material.

To save Actions minutes the spike deletes `deploy.yaml`, `galaxy_framework.yaml` and
`zizmor.yaml`, sets `on: [push]` only, and reduces `pulsar.yaml` to two jobs:

- `py37-probe` — `setup-python` 3.7 on ubuntu-24.04 with `continue-on-error`, to put the
  manifest claim on the record as a CI result rather than a citation.
- `slurm-probe` — one cell (24.04 / py3.11 / `test-ci`) running the real
  `.ci/setup_tests.sh`, then `dpkg -L slurm-drmaa1`, then a `scontrol show config` /
  `sinfo` / `srun -N1 hostname` smoke test *before* pytest so a slurm.conf rejection fails
  in seconds instead of mid-suite.

It also uncomments `SlurmctldLogFile`/`SlurmdLogFile` in `configure_test_slurm.py` and
dumps them on failure — the script currently calls `slurmctld`/`slurmd` via `subprocess.call`,
which swallows the exit status, so today a failed daemon start is invisible until a job
mysteriously never runs. That change is worth keeping regardless of the runner outcome.

### Results

Run https://github.com/jmchilton/pulsar/actions/runs/35000508030

**`py37-probe` — confirmed, 3.7 is unreachable on noble.** Runner image `ubuntu-24.04`
version `20260907.300.1`:

```
Version 3.7 was not found in the local cache
##[error]The version '3.7' with architecture 'x64' was not found for Ubuntu 24.04.
```

No fallback, no build-from-source path in the action. The manifest reading was right.

**`slurm-probe` — the entire slurm/DRMAA path works on noble, unchanged.** Full
`test-ci` suite, `368 passed, 64 skipped, 8 deselected` in 6m12s. Specifically:

- `slurm-drmaa1` / `slurm-drmaa-dev` `1.1.6-1ubuntu1~24.04` installed from the PPA against
  noble's `slurm-wlm 23.11.4-1.2ubuntu5`.
- The hardcoded `DRMAA_LIBRARY_PATH=/usr/lib/slurm-drmaa/lib/libdrmaa.so` **is still
  correct** — the path did not move. One wrinkle: `dpkg -L slurm-drmaa1` lists only
  `libdrmaa.so.1` and `libdrmaa.so.1.0.8`; the bare `libdrmaa.so` symlink comes from
  `slurm-drmaa-dev`. `setup_tests.sh` installs both, so this is latent, not a bug.
- Slurm 23.11 **accepted the generated `slurm.conf` as written**. `ControlMachine` and
  `CryptoType=crypto/munge` are still tolerated (`scontrol show config` reports
  `CredType = cred/munge`), `StateSaveLocation=/tmp` was fine. `sinfo` showed the `debug`
  partition idle and `srun -N1 hostname` returned. The only log noise is benign:
  invalid `MailProg`, missing PMIx plugin, and a first-boot `Could not open node state
  file /tmp/node_state`.
- The tests that would catch a broken DRMAA actually ran, rather than skipping:
  `test_integration_drmaa[simple|mq|direct]`, `DrmaaManagerTest::{test_cancel,
  test_simple_execution, test_drmaa_state_to_pulsar_status}`, `test_integration_cli_slurm`,
  `test_slurm_cli`, `test_slurm_torque` — all PASSED.

So the DRMAA concern is closed. `SwitchType=switch/none` was removed in Slurm 24.05 and
will matter at the *next* LTS bump, not this one.

Worth keeping from the spike regardless: the `SlurmctldLogFile`/`SlurmdLogFile` lines. The
probe's log dump is the only reason the picture above is legible — `configure_test_slurm.py`
starts the daemons with `subprocess.call`, which discards the exit status, so today a
failed `slurmctld` start is invisible until jobs mysteriously never run. (The journal even
shows the packaged `slurmd.service` failing at install time before the script writes
`/etc/slurm/slurm.conf` — harmless, but it is the sort of thing that reads as the cause of
an unrelated failure.)

## Keeping Python 3.7 signal without a 22.04 runner

Asked whether 3.7 could come out of the matrix while something still proved the syntax
holds. Three candidates; the third wins.

### mypy `--python-version 3.7` — not available

```
mypy: error: argument --python-version: Python 3.7 is not supported (must be 3.10 or higher)
```

Older mypy that accepts it needs `typed-ast`, which does not build on modern Pythons. Dead.

### ruff `--target-version py37` — catches syntax, and we want ruff anyway

Ruff does enforce version-incompatible *syntax*, which was the open question. Verified on a
scratch file with ruff 0.16.7:

```
invalid-syntax: Cannot use named assignment expression (`:=`) on Python 3.7 (syntax was added in Python 3.8)
invalid-syntax: Cannot use positional-only parameter separator on Python 3.7 (syntax was added in Python 3.8)
invalid-syntax: Cannot use `match` statement on Python 3.7 (syntax was added in Python 3.10)
```

Where it stops is stdlib APIs. On a file using `math.lcm` (3.9),
`functools.cached_property` (3.8) and `sqlite3.connect(autocommit=)` (3.12), ruff at
`--target-version py37` reported **none of them** — it is a syntax-level check, not a
typeshed-aware one. Vermin caught all three. So the two are complementary rather than
redundant:

| | syntax (walrus, `match`, posonly) | stdlib API (`math.lcm`, `autocommit=`) | dependency compat |
| --- | --- | --- | --- |
| ruff `py37` | yes | no | no |
| vermin | yes | yes | no |
| real 3.7 interpreter | yes | yes | yes |

### Adopting ruff — scoped, and smaller than expected

Pulsar currently runs `flake8 --ignore W504` (tox `lint`) and `isort --check --diff .`
(tox `format`, added by #489). Ruff subsumes both, so this is a consolidation rather than a
fourth tool. There is no `pyproject.toml`, so config belongs in a new `ruff.toml`.

Measured against the existing rules — `line-length = 150`, `E,W,F` minus `E203`, plus `I`
for import order — the whole tree produces **8 findings**:

- 5 × `E721` (type-comparison), all in `test/client_transport_test.py:350-354`. Fix or
  ignore the rule; flake8 was not checking this.
- 3 × `I001`, all cosmetic: a blank line between third-party and first-party imports inside
  `if TYPE_CHECKING:` blocks in `pulsar/managers/queued.py` and `queued_condor.py`, and one
  comment adjacency in `test/manager_queued_test.py`.

Getting there depends on mapping `.isort.cfg` correctly — the naive mapping reports 80
`I001`, almost all of them ordering-convention noise. The two options that matter:

```toml
[lint.isort]
order-by-type = false     # .isort.cfg force_alphabetical_sort_within_sections
case-sensitive = false
combine-as-imports = true
known-first-party = ["harness", "recorder"]
relative-imports-order = "closest-to-furthest"   # reverse_relative
no-lines-before = ["local-folder"]
```

With `order-by-type`/`case-sensitive` left at their defaults ruff wants `Job` sorted before
`ensure_pykube` and `Dict` before `cast`, which would churn ~80 import blocks for no reason.

One genuine gap: **ruff's isort has no `force_grid_wrap`**, and `.isort.cfg` sets
`force_grid_wrap=2`. Ruff will preserve the existing exploded style via the magic trailing
comma but will not *enforce* it on new imports. Either accept that, or keep `isort` for the
`format` env and use ruff only for linting.

### vermin — works, but needs suppressions and misses dependencies

`uv tool run --from vermin vermin -t=3.7- --violations pulsar` — 0.5s, no 3.7 interpreter
needed. On master it reports exactly two violations, **both false positives**:

- `pulsar/cache/persistence.py:32` — `sqlite3.connect(autocommit=True)` is 3.12+, but it is
  behind `if type(db).__module__ != "dbm.sqlite3": return`, which can only be true on 3.13+.
  Vermin does not evaluate runtime guards.
- `pulsar/client/container_job_config.py:392` — `authorization: Literal["none", "basic"]`.
  The import is `from typing_extensions import Literal`, correct for 3.7; vermin's "literal
  variable annotations require 3.8" rule fires on the annotation regardless of import
  source, and `--backport typing_extensions` does not suppress it.

Two `# novermin` comments would make it green, after which it guards the stdlib-API
dimension ruff cannot see. The limitation both share: **dependency** incompatibility.
`dev-requirements.txt` already carries `importlib-metadata<5.0.0` and `kombu<=5.2.4`
markers for 3.7 — that is where 3.7 support actually rots, and no static checker sees it.

### A real 3.7 interpreter in a container — recommended

`container: python:3.7.17-bookworm` on `ubuntu-24.04`. Verified green on the spike:

| tox env | result | wall clock |
| --- | --- | --- |
| `lint` | PASSED | 37s |
| `docs` | PASSED | 71s |
| `test-unit` | `303 passed, 75 skipped` | 2m25s |

An actual interpreter on a supported runner, catching everything vermin cannot, for about
the same wall clock as the current 22.04 cells.

Two things learned the hard way:

- **Use bookworm, not bullseye.** The first attempt with `python:3.7-bullseye` failed — not
  on Python, but because Debian bullseye's security pool has rotted out from under the
  image's baked-in apt index (404 on `libssl-dev`, `libssl1.1`, `libcurl4`). Bookworm is
  Debian 12, supported to 2028, and installs cleanly. Pin the full tag (`3.7.17-bookworm`);
  consider pinning by digest to match how `galaxy/simple-job-files` is pinned in the same
  file.
- **Only `test-unit` needs apt at all** (`libcurl4-openssl-dev libssl-dev`, for `pycurl`).
  `lint` and `docs` run with no system packages, so gate the apt step on the matrix cell.

Container mechanics are otherwise unremarkable: `actions/checkout@v7` works, the runner
mounts its own node20 into the container, no glibc problem on bookworm.

**Coverage caveat:** this gives 3.7 `lint`, `docs`, `test-unit` — *not* `test-ci`. The
integration tests need slurm daemons on the host, which a job container is the wrong shape
for. That is the same loss as the "test-unit-only 22.04 holdover" idea, with the difference
that the container does not expire on 2027-04-17.

## Plan

Three PRs, deliberately decoupled so the migration doesn't wait on the 3.7 decision.

Status: **PR 1 implemented** on `jmchilton/pulsar:ci-runners-24-04` (worktree
`~/projects/worktrees/pulsar/branch/ci-runners-24-04`), pushed, not opened.

### PR 1 — move what has no Python-version exposure

- `resilience` → `ubuntu-24.04`. Pure docker-compose, py3.11, all images pinned by tag or
  digest. One line.
- `mypy` is already `ubuntu-latest` (= 24.04 today), so it needs nothing.
- While in the file: delete the commented-out `tes-test` block. It pins `ubuntu-20.04`,
  which is already gone, and `actions/setup-go@v2`. It has been dead since the comment
  explaining why was written.

Red-to-green: the resilience job is its own signal — it passes on 24.04 or it doesn't.

Both landed in one commit; diff is +1/-29.

### PR 2 — move `test` (and `lint`'s non-3.7 cells) to 24.04

The spike says this is nearly a one-line change; no `setup_tests.sh` or
`configure_test_slurm.py` fixes are required to make it pass.

- `runs-on: ubuntu-24.04` — pinned, not `ubuntu-latest`, so the next image bump is a
  deliberate PR rather than a surprise on someone else's branch. (See open question on
  whether to normalize `mypy` the same way.)
- Fold in the CI-diagnostics improvements, which stand on their own merits:
  `SlurmctldLogFile`/`SlurmdLogFile` in `configure_test_slurm.py` plus a dump-on-failure
  step, and `subprocess.check_call` instead of `call` so a dead `slurmctld` fails the setup
  step rather than the test suite ten minutes later.
- Optional, cheap hardening while in the file: derive `DRMAA_LIBRARY_PATH` from
  `dpkg -L slurm-drmaa1` rather than hardcoding it. Not needed for 24.04 — the path is
  unchanged — so this is a judgement call about 26.04, not a fix.

That leaves where 3.7 goes. Two shapes, both verified to work — **pending decision**:

**(a) Shrunken 22.04 holdover.** A minimal `ubuntu-22.04` job running `test-unit` only.
`test-unit` passes `--ignore-glob='*integration*.py'`, so it needs no slurm, no DRMAA and no
`simple-job-files` service — checkout + setup-python + tox, nothing distro-coupled. Dated
comment naming 2027-04-17. Simplest diff; expires on a known date.

**(b) `python:3.7.17-bookworm` container on 24.04.** Same coverage (`lint`, `docs`,
`test-unit`), same wall clock, on a runner that isn't being deprecated. Costs a `container:`
line and an apt step gated to the `test-unit` cell. Recommended — it turns a dated
obligation into something that just keeps working.

Either way `test-ci` on 3.7 goes away; the slurm integration path stays on 3.11+.

### PR 3 — drop Python 3.7 (separate; user's call)

Enumerated so the decision is cheap rather than exploratory. Touches:

- `.github/workflows/pulsar.yaml` — 3.7 out of the `lint` and `test` matrices; delete the
  22.04 holdover job from PR 2.
- `setup.py` — drop the `Programming Language :: Python :: 3.7` classifier. Note there is
  no `python_requires` at all today; adding one (`>=3.8`) would be the honest version of
  this change, and is arguably worth doing either way.
- `dev-requirements.txt` — the `importlib-metadata<5.0.0; python_version == '3.7'` and
  `kombu<=5.2.4; python_version == '3.7'` pins collapse into an unconditional `kombu`.
- Unaffected: `pulsar-relay-client>=0.2.1; python_version >= "3.10"` and the
  `fastapi`/`uvicorn`/`a2wsgi`; `python_version >= '3.8'` markers — those are about newer
  floors, not the 3.7 one.

Nothing in `pulsar/` itself is gated on 3.7 in a way that would change; this is packaging
metadata and CI only. The real question is deployment reality, not code: Pulsar exists to
run on HPC head nodes, and 3.7 is there for RHEL/CentOS 7 era hosts (EOL 2024-06).

## Cost

The spike run was ~7 min of Actions time for the slurm job (6m12s of it the test suite)
plus ~20s for the 3.7 probe. Deleting `deploy.yaml` / `galaxy_framework.yaml` /
`zizmor.yaml` and dropping `pull_request` from the trigger kept it to that.

Tear down when done: `ghwt rm pulsar ci-noble-spike`, and delete the remote branch —
nothing on it is PR material.

## Unresolved questions

1. Drop 3.7, or keep it? (Nate/Nicola input — who still deploys Pulsar on a 3.7 host?)
2. If kept: 22.04 holdover (a) or `python:3.7.17-bookworm` container (b)? Container
   recommended.
3. OK to lose `test-ci` on 3.7 either way — unit + lint + docs only?
4. Pin `ubuntu-24.04` everywhere, or move to `ubuntu-latest`? File currently mixes both
   (`mypy` is `latest`). Normalize, or leave alone?
5. Add `python_requires` to `setup.py` (absent today) as part of PR 3?
6. Pin the container by digest, matching how `galaxy/simple-job-files` is pinned in the
   same file?
