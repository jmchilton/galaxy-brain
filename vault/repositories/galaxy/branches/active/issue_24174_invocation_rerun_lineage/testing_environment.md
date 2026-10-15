# Testing environment

Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24174_invocation_rerun_lineage`.

Isolated dependencies cloned from a recent worktree, with executable prefixes relocated. `pnpm install --offline --frozen-lockfile --ignore-scripts` completed successfully against the current lockfile. Python 3.14.3 imports `galaxy.model` from this worktree. No other worktree environments or servers were changed.

Services used for validation (stopped after successful tests and screenshots; commands below restart them):

- Backend: `http://127.0.0.1:8417`, coordinator PID 74712. Log `/tmp/issue24174-backend.log`.
- Vite: `http://127.0.0.1:5417`, coordinator PID 74669; proxies backend8417. Current `client/vite.config.mjs` reads `GALAXY_URL`.
- Ignored local server configuration: `config/issue24174.yml`. Isolated SQLite and job/data files: `database/issue24174/`.

Backend API version returns `27.0.dev0`. Vite home returns HTTP200 and injects `/@vite/client` and current source entrypoints. Cached Playwright Chromium153 launched successfully. Focused existing migration smoke: one passed (`test_migrations.py -k test_is_at_revision__one_head_one_revision`).

Restart backend from the worktree after Python source changes:

```sh
GALAXY_CONFIG_FILE=config/issue24174.yml \
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true NO_PROXY='*' \
.venv/bin/python -m uvicorn --app-dir lib --factory \
galaxy.webapps.galaxy.fast_factory:factory --host 127.0.0.1 --port 8417 \
> /tmp/issue24174-backend.log 2>&1
```

Start Vite from `client/`:

```sh
VITE_PORT=5417 GALAXY_URL=http://127.0.0.1:8417 \
node node_modules/vite/bin/vite.js --host 127.0.0.1 --strictPort
```

Use the synthetic local test key from the ignored configuration without copying its value into notes:

```sh
export GALAXY_CONFIG_OVERRIDE_MASTER_API_KEY="$(.venv/bin/python -c 'import yaml; print(yaml.safe_load(open("config/issue24174.yml"))["galaxy"]["master_api_key"])')"
```

Run browser tests from the worktree:

```sh
NO_PROXY='*' GALAXY_TEST_EXTERNAL=http://127.0.0.1:5417/ \
GALAXY_TEST_DRIVER_BACKEND=playwright GALAXY_TEST_SELENIUM_HEADLESS=1 \
GALAXY_TEST_TIMEOUT_MULTIPLIER=2 GALAXY_TEST_FILE_DIR="$PWD/test-data" \
.venv/bin/python -m pytest lib/galaxy_test/selenium/TEST_PATH -v --tb=short
```

For API tests targeting this running server, set `GALAXY_TEST_EXTERNAL=http://127.0.0.1:8417/` and retain the exported key. Existing login smoke passed. API client package build, including declarations regenerated after the schema change, passed.

Only terminate PIDs belonging to this task. Do not disturb other Galaxy/Vite services.

Client verification on Node 25 requires disabling experimental Web Storage to avoid its conflict with happy-dom:

```sh
NODE_OPTIONS=--no-experimental-webstorage pnpm exec vitest run \
  src/components/Workflow/Run/WorkflowRunForm.test.ts \
  src/components/Workflow/Run/WorkflowRun.test.js \
  src/components/WorkflowInvocationState/WorkflowInvocationInputOutputTabs.test.ts \
  src/components/WorkflowInvocationState/WorkflowInvocationState.test.ts
pnpm --filter @galaxyproject/galaxy-api-client build
pnpm type-check
```

Final related Vitest run: 4 files / 29 tests passed. Final type check passed. Fresh self-hosted lineage API test run: 2 passed, including the required-context serializer cleanup, without depending on the browser server runtime.

Final screenshot replay passed (1 test, 107.84s); six captures inspected and saved locally under `screenshots/`. Both isolated servers were stopped after validation. Source branch head `e929301db3b` is pushed and clean.
