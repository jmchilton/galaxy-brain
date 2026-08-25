# Handling Package Versions

> Historical deep dive. The canonical package plan is in [`PLAN.md`](PLAN.md); its release floor supersedes the early `galaxy>=26.1` example below.

How Planemo depends on Galaxy once Galaxy runs inside Planemo's own Python environment. Scoped to the `embedded_galaxy` engine; see `PROBLEM_AND_GOAL.md` for the engine itself.

## Context

Planemo already depends on a few Galaxy libraries - `galaxy-tool-util`, `galaxy-tool-util-models`, `galaxy-util` - but has never had to agree with the Galaxy it drives, because every engine to date keeps that Galaxy in a separate environment: its own virtualenv, a container, or a remote server. The embedded engine removes the separation. Planemo's process is the Galaxy process, so Planemo's resolved dependency set and Galaxy's must be one coherent set.

Two facts about Galaxy's PyPI publishing shape everything below:

- The `galaxy` metapackage is a **lock**. Its published wheel declares all 337 requirements with `==`: 24 `galaxy-*` siblings at the exact release, plus 313 third-party packages taken from `lib/galaxy/dependencies/pinned-requirements.txt`. This is intentional - it is a known-good deployment artifact.
- The **individual** distributions are the opposite. `galaxy-app` declares `galaxy-auth`, `galaxy-config`, `galaxy-data`, `galaxy-files`, `galaxy-tool-util`, `galaxy-util` and the rest as bare names with no version constraint at all (`packages/app/pyproject.toml:18-30`).

## Decisions

**1. The extra depends on the `galaxy` metapackage, as a single requirement.**
`planemo[embedded_galaxy]` declares one dependency - `galaxy>=26.1,<26.2` - and nothing else Galaxy-related. Planemo does not enumerate or pin the constituent distributions.

**2. The lock is the reason to use it, not an obstacle.**
Depending on the metapackage means Planemo runs against precisely the dependency set Galaxy released and tested against. It also makes mixed-series installs impossible by construction.

**3. Never assemble the individual distributions by hand.**
Because siblings are declared unpinned, depending on `galaxy-web-apps` and letting the rest resolve transitively silently produces mixed-series environments rather than failing. A verified example: an otherwise-current resolution lands `galaxy-files==25.1.1` alongside `galaxy-app==26.1.1`, dragged back a full year by an unrelated `setuptools<82` bound arriving through Planemo's own `ephemeris` dependency. Exit code 0, no warning. Reconstructing safety would mean Planemo maintaining ~14 pins that duplicate, worse, what the metapackage already gets right.

**4. Accept the version movement the lock causes.**
Measured against Planemo's current `requirements.txt`: the resolution grows from 97 to 350 distributions and moves 34 transitive dependencies backward, with zero conflicts and zero upgrades. Every delta is drift accumulated since Galaxy's release - `certifi 2026.7.22→2026.4.22`, `cwltool 20260720→20260413`, `numpy 2.5.2→2.4.5`, `aiohttp 3.14.3→3.13.5` - not incompatibility. The gap is widest just before a Galaxy release and near zero just after. All of it stays within Planemo's declared ranges, and it applies only to environments that asked for the extra.

**5. Planemo's base `galaxy-*` ceilings must contain the series the extra targets, and move with it.**
This is the one way the dependency breaks outright rather than merely shifting versions. The metapackage pins `galaxy-tool-util` exactly, so when Galaxy 26.2 ships, `galaxy` 26.2.x requires `galaxy-tool-util==26.2.0` while Planemo's base `galaxy-tool-util<26.2` excludes it - an unsatisfiable resolution, not a downgrade. It cannot be repaired from the extra, because an extra only adds requirements and can never relax a bound declared in the base requirements. Bumping the extra's series and the base ceilings is therefore a single commit, always.

**6. Floors stay where they are; only ceilings are coupled.**
`galaxy-tool-util>=25.1` and `galaxy-util>=24.1` are not raised to match the extra. Nothing requires them to agree - the constraint in decision 5 is containment, not equality - and there is no reason to narrow what a plain `pip install planemo` accepts in service of an optional extra.

**7. `galaxy-job-config-init` is not on the Galaxy release train.**
It is `galaxy-*` by name but versioned independently (`>=0.1.4`). Any tooling that reasons about Galaxy version alignment must exempt it explicitly, or it will be flagged forever.

**8. Read the running Galaxy's version from the package, not the filesystem.**
`from galaxy.version import VERSION_MAJOR` - shipped by `galaxy-util`, which Planemo already depends on - replaces the `<galaxy_root>/lib/galaxy/version.py` read for this engine. It reports `galaxy-util`'s version, which is exactly the application's version so long as the metapackage supplies the family, per decision 1.

## Implementation

1. Add the `embedded_galaxy` extra to `pyproject.toml` declaring `galaxy>=26.1,<26.2`. Planemo's `dependencies` are read from `requirements.txt` via `[tool.setuptools.dynamic]`, so the extra needs either its own requirements file following that pattern or a static `[project.optional-dependencies]` entry - pick whichever keeps the two mechanisms from disagreeing.
2. Add a unit test in `tests/` asserting, for every train-riding `galaxy-*` requirement in `requirements.txt`: it declares an upper bound, and its `SpecifierSet` contains the series the extra targets. Exempt `galaxy-job-config-init` explicitly, with a comment saying why. This lands in the existing tox-driven `test` job - no new CI workflow.
3. Add a resolution check that compiles `requirements.txt` plus the extra and fails on conflict. It needs no Galaxy run, so it belongs in a fast job.
4. Introduce the version seam from decision 8 so `get_galaxy_version` has a non-filesystem answer.

The two checks in steps 2 and 3 catch different things and are both worth having. The containment test fails fast with a one-line, actionable message ("bump `galaxy-tool-util` upper bound to `<26.3`"); the resolution check catches everything alignment cannot prevent, such as a third-party floor conflict arriving through an unrelated Planemo dependency.

## Verification

Red-to-green for the containment test: write it first against a deliberately misaligned pair - extra at `galaxy>=26.2,<26.3` while `requirements.txt` still says `galaxy-tool-util<26.2` - and confirm it fails naming the requirement to bump. Restore the aligned bounds and confirm it passes. Parameterizing over `(base specifier, extra series, expected)` keeps the failing case permanently in the suite rather than throwing it away once it goes green.

For the resolution check, `uv pip compile` over `requirements.txt` with and without the extra is enough to reproduce the 97 → 350 figure and confirm zero conflicts; the misaligned-bound case should make it fail outright, which is the behaviour being bought.

## Open Questions

- Extra declared statically in `pyproject.toml` or via a second requirements file, given dependencies are already dynamic?
- Pin the extra to a series (`>=26.1,<26.2`) or to a minimum only, letting it track the newest Galaxy?
- Does the containment test read the extra's series from packaging metadata, or is the target series a constant the test and `pyproject.toml` share?
- Should the resolution check run on a schedule as well as per-PR, so an upstream release that breaks alignment surfaces before someone's PR wears the failure?
