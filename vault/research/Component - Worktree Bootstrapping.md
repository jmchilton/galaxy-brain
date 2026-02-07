---
type: research
subtype: component
tags:
  - research/component
  - galaxy/lib
  - galaxy/client
  - galaxy/testing
status: draft
created: 2026-02-07
revised: 2026-02-07
revision: 1
ai_generated: true
component: worktree_bootstrap
galaxy_areas:
  - lib
  - client
  - testing
---

# Galaxy Worktree Bootstrapping Reference

Research document describing Galaxy's backend and frontend dependency management, configuration, and startup scripts.

---

## Table of Contents

1. [Overview](#overview)
2. [Backend Dependencies](#backend-dependencies)
3. [Frontend Dependencies](#frontend-dependencies)
4. [Configuration System](#configuration-system)
5. [Startup Scripts](#startup-scripts)
6. [Testing Infrastructure](#testing-infrastructure)
7. [Development Workflows](#development-workflows)

---

## Overview

Galaxy uses a multi-layered approach to dependency management and configuration:

- **Backend**: Python 3.10+ with `uv` or `pip` for package management
- **Frontend**: Node.js + pnpm for client build
- **Build Tool**: Vite
- **Process Management**: Gravity (wrapper around supervisor/systemd)
- **Web Server**: Gunicorn with Uvicorn workers (ASGI)

A fresh worktree requires:
1. Virtual environment creation
2. Python dependency installation
3. Client build (optional for dev)
4. Configuration file setup (optional)

---

## Backend Dependencies

### pyproject.toml

Root `pyproject.toml` defines:
- Core dependencies in `[project.dependencies]`
- Dependency groups: `test`, `dev`, `typecheck`
- `uv` configuration under `[tool.uv]`

Key settings:
```toml
requires-python = ">=3.10"

[tool.uv]
extra-index-url = ["https://wheels.galaxyproject.org/simple"]
index-strategy = "unsafe-best-match"
package = false
default-groups = []  # No groups installed by default
```

### Requirements Files

All live under `lib/galaxy/dependencies/`:

| File | Purpose | Generated From |
|------|---------|----------------|
| `pinned-requirements.txt` | Production deps | `uv export --no-dev` |
| `pinned-test-requirements.txt` | Test deps only | `uv export --only-group=test` |
| `dev-requirements.txt` | Dev deps (includes test) | `uv export --only-group=dev` |
| `conditional-requirements.txt` | Config-dependent deps | Manual |

The root `requirements.txt` is a symlink to `pinned-requirements.txt`.

### Conditional Dependencies

`lib/galaxy/dependencies/__init__.py` implements `ConditionalDependencies` class that:
1. Parses Galaxy's config files (galaxy.yml, job_conf.yml, file_source_templates, etc.)
2. Determines which optional packages are needed
3. Returns requirements from `conditional-requirements.txt`

Examples:
- `psycopg2-binary` if database uses PostgreSQL
- `drmaa` if job_conf uses DRMAA runner
- `python-ldap` if auth uses LDAP
- `gcsfs` if file_sources includes googlecloudstorage
- `pydantic-ai` if ai_api_key or inference_services configured

### Updating Dependencies

Run `make update-dependencies` or directly:
```bash
./lib/galaxy/dependencies/update.sh
```

This script:
1. Installs `uv` if not available
2. Runs `uv lock --upgrade` (updates uv.lock)
3. Exports to pinned requirements files

### Python Version Requirements

Minimum: **Python 3.10** (checked by `scripts/check_python.py`)

---

## Frontend Dependencies

### Client Structure

```
client/
├── package.json       # Client dependencies and scripts
├── pnpm-lock.yaml     # Lockfile
├── vite.config.js     # Vite build config
├── src/               # Source code
└── dist/              # Build output (copied to static/dist/)

package.json (root)    # Prebuilt client staging
```

### Package Manager: pnpm

Galaxy uses pnpm (not yarn). Key differences:
- Install: `pnpm install --frozen-lockfile`
- Run scripts: `pnpm run <script>` or `pnpm <script>`
- Config overrides in `package.json` under `pnpm.overrides`

### Two Build Modes

**1. Build from Source (Development)**
```bash
cd client && pnpm install && pnpm build
# or
make client
```

**2. Install Prebuilt Client**
```bash
pnpm install && pnpm run stage
# or
make install-client
```

Root `package.json` references `@galaxyproject/galaxy-client` (npm package) for prebuilt installation.

### Client Scripts

From `client/package.json`:

| Script | Purpose |
|--------|---------|
| `develop` | Vite dev server with HMR (port 5173) |
| `build` | Development build |
| `build-production` | Optimized prod build |
| `build-production-maps` | Prod with sourcemaps |
| `test` | Vitest tests |

### Build Hash Tracking

After client build, `static/client_build_hash.txt` stores the git commit hash. `common_startup.sh` compares this against current HEAD to determine if rebuild is needed.

---

## Configuration System

### Configuration Files

| File | Purpose |
|------|---------|
| `config/galaxy.yml.sample` | Default config (read-only reference) |
| `config/galaxy.yml` | User overrides (create if needed) |
| `config/local_env.sh` | Environment variables for startup |

### galaxy.yml Structure

Two main sections:

**1. `gravity:` - Process Manager Config**
```yaml
gravity:
  gunicorn:
    bind: localhost:8080
    workers: 1
    timeout: 300
  celery:
    enable: true
    concurrency: 2
```

**2. `galaxy:` - Application Config**
```yaml
galaxy:
  database_connection: sqlite:///./database/universe.sqlite
  file_path: database/objects
  tool_config_file: config/tool_conf.xml
```

### Configuration Resolution

1. Environment variables prefixed `GALAXY_CONFIG_` or `GALAXY_CONFIG_OVERRIDE_`
2. `config/galaxy.yml` if exists
3. `config/galaxy.yml.sample` defaults

The `GALAXY_CONFIG_OVERRIDE_*` variants always take precedence over config files.

### Key Config Paths

| Setting | Default | Purpose |
|---------|---------|---------|
| `data_dir` | `database/` | All runtime data |
| `config_dir` | `config/` | Config file location |
| `cache_dir` | `database/cache/` | Caches |
| `file_path` | `database/objects/` | Dataset files |
| `tool_config_file` | Sample tool_conf.xml | Tool definitions |

---

## Startup Scripts

### run.sh

Main entry point. Flow:

```
run.sh
├── source common_startup_functions.sh
├── source config/local_env.sh (if exists)
├── parse_common_args()
├── run_common_start_up()  → calls common_startup.sh
├── setup_python()
├── set_galaxy_config_file_var()
├── find_server()
└── exec galaxy/gunicorn/galaxyctl
```

Command variations:
- `./run.sh` - Start in foreground
- `./run.sh start` or `--daemon` - Background daemon
- `./run.sh stop` - Stop daemon
- `./run.sh restart` - Restart

### common_startup.sh

Heavy lifting for environment setup:

1. **Virtual Environment**
   - Creates `.venv/` if missing
   - Uses Conda's `_galaxy_` env if available
   - Prefers `uv venv` over `python -m venv`

2. **Dependency Installation**
   ```bash
   pip install -r requirements.txt
   # If --dev-wheels:
   pip install -r lib/galaxy/dependencies/dev-requirements.txt
   # Then conditional deps based on config
   ```

3. **Client Build Check**
   - Compares `static/client_build_hash.txt` vs current git HEAD
   - Rebuilds if client/ or config/plugins/visualizations/ changed
   - Uses pnpm for installation and build

4. **Sample File Copying**
   - Copies `*.sample` files if destination doesn't exist

### common_startup_functions.sh

Utility functions:

| Function | Purpose |
|----------|---------|
| `setup_python()` | Activate venv/conda, verify Python version |
| `set_conda_exe()` | Locate conda binary |
| `conda_activate()` | Activate _galaxy_ conda env |
| `find_server()` | Determine which server command to run |
| `set_galaxy_config_file_var()` | Find galaxy.yml or sample |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `GALAXY_VIRTUAL_ENV` | Custom venv path (default: `.venv`) |
| `GALAXY_CONDA_ENV` | Conda env name (default: `_galaxy_`) |
| `GALAXY_CONDA_PYTHON_VERSION` | Python version for conda (default: `3.10`) |
| `GALAXY_CONFIG_FILE` | Path to galaxy.yml |
| `GALAXY_SKIP_CLIENT_BUILD` | Set to 1 to skip client |
| `GALAXY_LOCAL_ENV_FILE` | Custom env file (default: `config/local_env.sh`) |

---

## Testing Infrastructure

### run_tests.sh

Wrapper script with test type selection:

| Flag | Test Type | Location |
|------|-----------|----------|
| `-api` | API tests | `lib/galaxy_test/api/` |
| `-integration` | Integration | `test/integration/` |
| `-unit` | Unit tests | `test/unit/`, `lib/` (doctests) |
| `-selenium` | Selenium E2E | `lib/galaxy_test/selenium/` |
| `-playwright` | Playwright E2E | `lib/galaxy_test/selenium/` |
| `-framework` | Tool tests | `test/functional/tools/` |
| `-toolshed` | ToolShed tests | `lib/tool_shed/test/` |

### Test Execution Flow

```
run_tests.sh
├── Parse arguments (test type, options)
├── ./scripts/common_startup.sh --dev-wheels
├── setup_python()
├── Configure test-specific env vars
└── pytest <args>
```

### Key Test Environment Variables

| Variable | Purpose |
|----------|---------|
| `GALAXY_TEST_DBURI` | Test database connection |
| `GALAXY_TEST_EXTERNAL` | URL to test against external Galaxy |
| `GALAXY_TEST_HOST` | Host for test server |
| `GALAXY_TEST_PORT` | Port for test server |
| `GALAXY_TEST_DRIVER_BACKEND` | `selenium` or `playwright` |
| `GALAXY_TEST_TOOL_CONF` | Tool configs for tests |

### End-to-End Test Configuration

Tests can use a YAML config file for credentials:
```bash
cp lib/galaxy_test/selenium/jupyter/galaxy_selenium_context.yml.sample ./galaxy_selenium_context.yml
```

Config keys map to environment variables:
| Config Key | Environment Variable |
|------------|---------------------|
| `local_galaxy_url` | `GALAXY_TEST_SELENIUM_URL` |
| `login_email` | `GALAXY_TEST_SELENIUM_USER_EMAIL` |
| `login_password` | `GALAXY_TEST_SELENIUM_USER_PASSWORD` |
| `admin_api_key` | `GALAXY_TEST_SELENIUM_ADMIN_API_KEY` |
| `selenium_galaxy_url` | `GALAXY_TEST_EXTERNAL_FROM_SELENIUM` |

Use with:
```bash
GALAXY_TEST_END_TO_END_CONFIG=./galaxy_selenium_context.yml pytest ...
```

### Playwright Setup

After venv is active:
```bash
playwright install --with-deps
```

Then run:
```bash
./run_tests.sh -playwright
# or
GALAXY_TEST_DRIVER_BACKEND=playwright pytest lib/galaxy_test/selenium/
```

### pytest Configuration

`pytest.ini`:
```ini
pythonpath = lib
asyncio_mode = auto
log_level = DEBUG
markers =
  tool: marks test as a tool test
  cwl_conformance: all CWL conformance tests
  # ... many more
```

---

## Development Workflows

### Quick Start (Backend Only)

```bash
# 1. Bootstrap (creates venv, installs deps, skips client)
GALAXY_SKIP_CLIENT_BUILD=1 ./run.sh

# 2. Activate venv for CLI tools
. .venv/bin/activate

# 3. Run server (subsequent starts)
./run.sh
```

### Quick Start (With Frontend Dev)

```bash
# Terminal 1: Start Galaxy without client build
GALAXY_SKIP_CLIENT_BUILD=1 GALAXY_RUN_WITH_TEST_TOOLS=1 ./run.sh

# Terminal 2: Start Vite dev server (HMR)
make client-dev-server

# Browser: http://localhost:5173
```

### Running Tests Against Dev Server

```bash
# Start server with test tools
GALAXY_SKIP_CLIENT_BUILD=1 GALAXY_RUN_WITH_TEST_TOOLS=1 ./run.sh &

# Activate venv
. .venv/bin/activate

# Run specific test against running server
export GALAXY_TEST_EXTERNAL=http://localhost:8080/
pytest lib/galaxy_test/selenium/test_workflow_editor.py -k test_data_input
```

### Useful Make Targets

| Target | Purpose |
|--------|---------|
| `make setup-venv` | Create venv with dev deps |
| `make skip-client` | Run Galaxy, skip client build |
| `make client-dev-server` | Vite HMR dev server |
| `make client` | Development client build |
| `make client-production` | Production client build |
| `make client-test` | Run Vitest client tests |
| `make update-dependencies` | Update all Python deps |
| `make docs` | Build Sphinx docs |

### Minimal Bootstrap Commands

For a completely fresh worktree:

```bash
# Option A: Full auto (builds client)
./run.sh

# Option B: Dev mode (skip client, use prebuilt)
GALAXY_INSTALL_PREBUILT_CLIENT=1 GALAXY_SKIP_CLIENT_BUILD=0 ./run.sh

# Option C: Backend only (no client at all)
GALAXY_SKIP_CLIENT_BUILD=1 ./run.sh
```

---

## Key Files Reference

| Path | Purpose |
|------|---------|
| `run.sh` | Main entry point |
| `run_tests.sh` | Test runner |
| `scripts/common_startup.sh` | Bootstrap logic |
| `scripts/common_startup_functions.sh` | Shell utilities |
| `pyproject.toml` | Python project config |
| `requirements.txt` | Symlink to pinned deps |
| `lib/galaxy/dependencies/` | Dependency management |
| `config/galaxy.yml.sample` | Default config |
| `client/package.json` | Client deps/scripts |
| `Makefile` | Build targets |
| `pytest.ini` | Test configuration |

---

## Notes

- Galaxy uses Gravity (process manager) which wraps supervisor/systemd
- Default server: Gunicorn with Uvicorn workers (ASGI) on localhost:8080
- Celery is enabled by default for async tasks
- The `_galaxy_` Conda environment is auto-created if Conda is available
- Client is built from `client/` using Vite and output to `static/dist/`
- Tests create temporary Galaxy instances with their own databases
- Frontend uses pnpm (not yarn) - see migration cleanup issue for stale references
