# Validation environment

- Client: `pnpm install --frozen-lockfile` in worktree `client/`.
- Host Node exposes experimental webstorage; run tests with `NODE_OPTIONS=--no-experimental-webstorage`.
- Python: isolated `.venv` from `uv sync --frozen --python 3.12 --group test --group dev`.
- Browser: `.venv/bin/playwright install chromium` completed.
- Vite: `pnpm run develop --host 127.0.0.1` in `client/`, port 5173.
- Galaxy server started from worktree using `NO_PROXY='*' GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INSTALL=false GALAXY_SKIP_CLIENT_BUILD=1 GALAXY_RUN_WITH_TEST_TOOLS=1 sh run.sh --skip-wheels --skip-tool-dependency-initialization`, port 8080. Initial imports take time on this host.
- Browser tests should target `GALAXY_TEST_EXTERNAL=http://127.0.0.1:5173/` and `GALAXY_TEST_DRIVER_BACKEND=playwright`, headless. Fresh development database; register a fresh test user rather than reuse credentials.
- Screenshots belong in local ignored `screenshots/`; review notes are committed.
