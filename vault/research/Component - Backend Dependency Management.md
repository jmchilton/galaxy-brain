---
type: research
subtype: component
tags:
  - research/component
  - galaxy/lib
status: draft
created: 2026-02-09
revised: 2026-02-09
revision: 1
ai_generated: true
galaxy_areas:
  - lib
---

# Galaxy Backend Dependency Management

This document describes how Galaxy declares, pins, and updates its Python backend dependencies.

## Architecture Overview

Galaxy uses [uv](https://github.com/astral-sh/uv) as its dependency resolver and lockfile manager. Dependencies are declared in `pyproject.toml`, resolved into a `uv.lock` lockfile, and then exported to a set of flat `pinned-*.txt` files under `lib/galaxy/dependencies/`. These pinned files are what Galaxy actually installs from at runtime.

```
pyproject.toml                          # source of truth for all deps
    |
    v
uv lock --upgrade                       # resolves everything
    |
    v
uv.lock                                 # machine-managed lockfile
    |
    v
uv export --frozen ...                  # exports per-group pinned files
    |
    +-> lib/galaxy/dependencies/pinned-requirements.txt       (production)
    +-> lib/galaxy/dependencies/pinned-test-requirements.txt   (test)
    +-> lib/galaxy/dependencies/dev-requirements.txt           (dev, includes test)
    +-> lib/galaxy/dependencies/pinned-typecheck-requirements.txt (mypy stubs)
```

## Dependency Declaration (`pyproject.toml`)

### Production dependencies

Listed under `[project].dependencies`. These are the packages required to run a Galaxy server. Examples include `SQLAlchemy`, `celery`, `fastapi`, `pydantic`, `cwltool`, etc. Version constraints are specified inline with comments explaining why:

```toml
"SQLAlchemy>=2.0.37,<2.1,!=2.0.41",  # issue links
"celery>=5.4.0",  # prefer not downgrading this to upgrading typing-extensions
```

### Dependency groups (`[dependency-groups]`)

uv's `dependency-groups` feature organizes non-production dependencies:

| Group | Purpose | Pinned output file |
|---|---|---|
| `test` | pytest, selenium, playwright, test fixtures | `pinned-test-requirements.txt` |
| `dev` | includes `test` + black, isort, sphinx, codespell, etc. | `dev-requirements.txt` |
| `typecheck` | mypy + type stubs | `pinned-typecheck-requirements.txt` |

The `dev` group uses `{include-group = "test"}` to include all test deps.

### Resolver configuration (`[tool.uv]`)

```toml
[tool.uv]
constraint-dependencies = [...]     # global version constraints
default-groups = []                 # don't install any groups by default
extra-index-url = ["https://wheels.galaxyproject.org/simple"]
index-strategy = "unsafe-best-match"
package = false
```

Key settings:
- **`extra-index-url`**: Galaxy hosts its own wheel index at `wheels.galaxyproject.org` for packages not available on PyPI or that need special builds.
- **`index-strategy = "unsafe-best-match"`**: Allows uv to pick the best matching version across all indexes, not just the first one that has the package.
- **`constraint-dependencies`**: Imposes additional version constraints during resolution without adding new dependencies.
- **`package = false`**: Galaxy itself is not installable as a package; uv only manages its dependencies.

## Conditional Dependencies

Galaxy has many optional integrations (LDAP auth, S3 object stores, DRMAA job runners, etc.) that require additional packages. These are handled by a config-aware system at startup rather than through Python extras.

### How it works

1. **`lib/galaxy/dependencies/conditional-requirements.txt`** lists all optional packages (psycopg2-binary, drmaa, boto3, various filesystem plugins, etc.)

2. **`lib/galaxy/dependencies/__init__.py`** defines `ConditionalDependencies`, which:
   - Parses Galaxy's configuration files (galaxy.yml, job_conf.yml, object_store_conf.xml, auth_config.xml, etc.)
   - Extracts configured job runners, object stores, authenticators, file sources, vault backends, error reporters
   - For each optional package, has a `check_<name>()` method that returns `True` if the config requires it

3. **`scripts/common_startup.sh`** calls this logic during Galaxy startup:
   ```sh
   GALAXY_CONDITIONAL_DEPENDENCIES=$(python -c "import galaxy.dependencies; ...")
   echo "$GALAXY_CONDITIONAL_DEPENDENCIES" | pip install -r /dev/stdin \
       --constraint lib/galaxy/dependencies/conditional-constraints.txt
   ```

4. **`lib/galaxy/dependencies/conditional-constraints.txt`** provides platform-specific constraints for conditional deps (currently used for `zeroc-ice` wheel URLs needed by the OMERO file source plugin).

### Examples of conditional checks

| Config trigger | Package installed |
|---|---|
| `database_connection` starts with `postgres` | `psycopg2-binary` |
| DRMAA/Slurm job runner configured | `drmaa` |
| Kubernetes job runner configured | `pykube-ng` |
| S3 object store configured | `boto3` |
| LDAP authenticator configured | `python-ldap` |
| Celery with Redis broker | `redis` |
| Sentry DSN set | `sentry-sdk` |

## Lint Dependencies (Separate Pipeline)

Linting tools (flake8, ruff) often have dependency conflicts with Galaxy's main dependency tree. They are managed separately:

- **`lib/galaxy/dependencies/lint-requirements.txt`**: Unpinned top-level lint deps (flake8, flake8-bugbear, ruff)
- **`lib/galaxy/dependencies/pinned-lint-requirements.txt`**: Pinned output

The `update_lint_requirements.sh` script resolves these in an isolated virtualenv (using Python 3.9) and freezes the result. This runs as part of `make update-dependencies` (the `update-lint-requirements` target runs first).

## The `requirements.txt` Symlink

At the repository root, `requirements.txt` is a symlink to `lib/galaxy/dependencies/pinned-requirements.txt`. This is what `common_startup.sh` installs via `pip install -r requirements.txt`. The symlink provides a conventional entry point while keeping the actual file co-located with the rest of the dependency management code.

## The Update Pipeline

### `make update-dependencies`

The top-level Makefile target `update-dependencies` orchestrates the full update:

```makefile
update-dependencies: update-lint-requirements
	$(IN_VENV) ./lib/galaxy/dependencies/update.sh
```

It first updates lint deps, then runs `update.sh`.

### `lib/galaxy/dependencies/update.sh`

This script:

1. **Ensures `uv` is available** - uses the system `uv` if present, otherwise creates a temporary venv and pip-installs it
2. **Resolves all dependencies** - runs `uv lock --upgrade` which re-resolves the entire dependency tree to the latest compatible versions, updating `uv.lock`
3. **Exports pinned files** - runs `uv export` four times with different group selectors to produce each pinned requirements file:

```sh
UV_EXPORT_OPTIONS='--frozen --no-annotate --no-hashes'
uv export ${UV_EXPORT_OPTIONS} --no-dev > pinned-requirements.txt
uv export ${UV_EXPORT_OPTIONS} --only-group=test > pinned-test-requirements.txt
uv export ${UV_EXPORT_OPTIONS} --only-group=dev > dev-requirements.txt
uv export ${UV_EXPORT_OPTIONS} --only-group=typecheck > pinned-typecheck-requirements.txt
```

The `--frozen` flag means uv reads from the lockfile without re-resolving. `--no-annotate` omits the "via X" comments. `--no-hashes` omits integrity hashes.

### Single-package updates

The script accepts `-p <pkg>` to upgrade a single package:

```sh
./lib/galaxy/dependencies/update.sh -p sqlalchemy
```

This runs `uv lock --upgrade-package <pkg>` instead of `uv lock --upgrade`, leaving other packages at their current versions.

## Automated Weekly Updates (CI)

### `.github/workflows/dependencies.yaml`

A GitHub Actions workflow runs every Saturday at 3:00 AM UTC (cron: `0 3 * * 6`). It can also be triggered manually via `workflow_dispatch`.

The workflow:
1. Checks out the repository
2. Sets up Python 3.10 and installs uv
3. Runs `make update-dependencies`
4. Uses `peter-evans/create-pull-request` to:
   - Create a commit authored by `galaxybot`
   - Push to a fork (`galaxybot/galaxy`)
   - Open a PR titled "Update Python dependencies" on branch `dev_auto_update_dependencies`
   - Label the PR with `area/dependencies` and `kind/enhancement`
   - Delete and recreate the branch each week (so only one outstanding update PR exists at a time)

This gives maintainers a weekly PR to review, test through CI, and merge.

## Runtime Installation (`common_startup.sh`)

When Galaxy starts (or when a developer runs `common_startup.sh`):

1. A virtualenv is created if needed (preferring `uv venv` if available, falling back to `python -m venv`)
2. `pip install -r requirements.txt` (the symlink to pinned-requirements.txt) installs all production deps at exact versions
3. If `--dev-wheels` is passed, dev-requirements.txt is also installed
4. Galaxy config files are parsed and conditional dependencies are installed with constraints from `conditional-constraints.txt`
5. The Galaxy client (JS/pnpm) is built if needed

## File Summary

| File | Role |
|---|---|
| `pyproject.toml` | Source of truth: all deps, groups, uv config |
| `uv.lock` | Machine-managed lockfile (full resolution) |
| `requirements.txt` | Symlink to `pinned-requirements.txt` |
| `lib/galaxy/dependencies/pinned-requirements.txt` | Pinned production deps (auto-generated by `uv export`) |
| `lib/galaxy/dependencies/pinned-test-requirements.txt` | Pinned test deps (auto-generated) |
| `lib/galaxy/dependencies/dev-requirements.txt` | Pinned dev deps including test (auto-generated) |
| `lib/galaxy/dependencies/pinned-typecheck-requirements.txt` | Pinned mypy/stubs deps (auto-generated) |
| `lib/galaxy/dependencies/lint-requirements.txt` | Unpinned lint tool deps |
| `lib/galaxy/dependencies/pinned-lint-requirements.txt` | Pinned lint deps (auto-generated by `update_lint_requirements.sh`) |
| `lib/galaxy/dependencies/conditional-requirements.txt` | Optional deps installed based on Galaxy config |
| `lib/galaxy/dependencies/conditional-constraints.txt` | Platform constraints for conditional deps |
| `lib/galaxy/dependencies/__init__.py` | Config-aware conditional dependency resolver |
| `lib/galaxy/dependencies/script.py` | CLI for installing conditional deps |
| `lib/galaxy/dependencies/update.sh` | Main update script (uv lock + export) |
| `lib/galaxy/dependencies/update_lint_requirements.sh` | Lint deps update script |
| `.github/workflows/dependencies.yaml` | Weekly automated update CI workflow |
| `scripts/common_startup.sh` | Runtime installation and Galaxy bootstrap |
| `Makefile` | `update-dependencies` and `update-lint-requirements` targets |
