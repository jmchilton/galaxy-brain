# compare_runs presentation environment (chickenstraws)

Set up 2026-11-03 for the presentation screenshot pipeline. Galaxy and Vite are left **running** for the next agent.

## Worktree

- `/home/ubuntu/projects/worktrees/galaxy/branch/compare_runs` at `be7415d94dd` (tracking `jmchilton/compare_runs`). No commits were made.
- Uncommitted, by design: `lib/galaxy_test/selenium/test_comparisons_presentation.py`, the capture module. Its versioned copy is [capture_comparisons_presentation.py](capture_comparisons_presentation.py).
- Uncommitted since stage 2: two small product fixes in `client/src/components/Comparison/` (`comparisonQuery.ts`, its test, `ComparisonTable.vue`), recorded in [product_fixes.patch](product_fixes.patch). The capture depends on them (`hide_panels` on `/comparisons`, and the 03 highlight); see [polish_debrief.md](polish_debrief.md).
- Stage 2 rebuilt the demo data (user `j.analyst`, workflows with a readme). `.venv/presentation_state.json` holds the new ids; stage 1's is kept as `.venv/presentation_state.stage1.json`.
- Bootstrapped with the `jmchilton:galaxy-bootstrap` skill: `.venv`, `client/node_modules`, Playwright browsers, and `config/galaxy.yml` (gitignored).

## Servers

| | Port | PID (listener) | Log |
|---|---|---|---|
| Galaxy (gunicorn, `--preload`, sample test toolbox) | 8090 | 3505153 (master), 3507009 (worker) | `<worktree>/.venv/e2e-galaxy.log` |
| Vite dev server (`pnpm run develop --strictPort`) | 5180 | 3505185 (vite), parents 3505158 / 3505171 (pnpm) | `<worktree>/.venv/e2e-vite.log` |

- The ports are recorded in `<worktree>/.venv/e2e.env`, and the Galaxy master PID in `.venv/e2e-galaxy.pid`.
- All the PIDs above have cwd in this worktree (or its `client/`). Check `readlink /proc/<pid>/cwd` before killing anything: other worktrees on this machine run their own servers and chromedrivers.
- Tests target **Vite** (`http://localhost:5180/`), not Galaxy's port. The worktree has no client build.

## Start / stop / run

The `jmchilton:galaxy-playwright` skill's `galaxy_e2e.sh` is zsh, and chickenstraws has no zsh. [galaxy_e2e.bash](galaxy_e2e.bash) is a bash port with the same behaviour plus the Chrome-library and font fixes below. Run it from the worktree root:

```sh
H=/home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/compare_runs/presentation/galaxy_e2e.bash
cd /home/ubuntu/projects/worktrees/galaxy/branch/compare_runs
$H status        # "up: Galaxy :8090, Vite :5180"
$H up            # reuses running servers, else picks a free 8090+N / 5180+N pair
$H down          # kills only listeners whose cwd is this worktree
```

To capture (from the worktree root):

```sh
GALAXY_TEST_PRESENTATION=1 \
PRESENTATION_STATE_FILE=$PWD/.venv/presentation_state.json \
GALAXY_TEST_SCREENSHOTS_DIRECTORY=/home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/compare_runs/screenshots/presentation \
  $H run playwright lib/galaxy_test/selenium/test_comparisons_presentation.py   # optionally: -k test_07
```

- With `PRESENTATION_STATE_FILE` set and present, the run logs in as the saved demo user and reuses its data, taking about 4 minutes for all beats.
- Delete the file to rebuild the data from scratch, which adds about 3 minutes.
- The current state file holds the demo user's email and the workflow and invocation ids. The password is the framework default test password.

## Machine fixes (no sudo used)

- **Missing Chrome libraries.** Playwright's headless shell needs libatk, libatk-bridge, libatspi, libXcomposite, libXdamage, libXfixes, libXrandr, libgbm, libasound, libXrender, libXi and libXRes.
  - None are installed system-wide.
  - I fetched them with `apt-get download` and extracted them with `dpkg-deb -x` into `<worktree>/.venv/chrome-libroot/`. `galaxy_e2e.bash run` exports `LD_LIBRARY_PATH` for them.
  - The same trick another session used, in its own scratchpad.
- **No fonts.** The machine has no `/usr/share/fonts` and no `/etc/fonts`.
  - fonts-dejavu-core, fonts-liberation and fonts-noto-core are extracted into the same libroot.
  - A private `chrome-libroot/fonts.conf` maps sans-serif to Liberation Sans and monospace to Liberation Mono. `run` exports `FONTCONFIG_FILE` for it.
  - Galaxy's own UI font, Atkinson Hyperlegible, is a bundled web font, so body text doesn't depend on these.
- **psycopg.** `pytest-postgresql` failed to import without libpq, so I installed `psycopg-binary==3.3.6` into the worktree venv. A sibling worktree had done the same.
- Node: `client/.node_version` is 22.20.0 and the shell default is 26.13.0. The helper passes `npm_config_use_node_version`, so pnpm runs Vite under 22.20.0.
