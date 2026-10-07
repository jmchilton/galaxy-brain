# galaxy_ui_loop

Harness for the Galaxy UI skill feedback loop (`../GALAXY_UI_SKILL_LOOP.md`); results go in
`../GALAXY_UI_SKILL_RUNS.md`. Source lives here. Login state, `node_modules` and run artifacts live in
`$GXUI_LOOP_HOME` (default `~/.cache/gxui-loop`), never in the vault.

Phase 0 / arm B: Codex + stock playwright-cli 0.1.22 works through GTN `galaxy-intro-short` on
test.galaxyproject.org. Agent hosts: Codex (`codex exec`, isolated `CODEX_HOME`). Chrome aborts inside
Codex's macOS sandbox, so `run.sh` opens the browser outside it and the agent drives that session.

1. Save a login once (John's single test.galaxyproject.org account - the server forbids more):

       cd ~/.cache/gxui-loop
       PWTEST_DAEMON_SESSION_DIR=$PWD/.login npx --no-install playwright-cli -s=login open https://test.galaxyproject.org/login/start --headed
       # log in in the window, then:
       PWTEST_DAEMON_SESSION_DIR=$PWD/.login npx --no-install playwright-cli -s=login state-save auth/galaxy-test-auth.json
       PWTEST_DAEMON_SESSION_DIR=$PWD/.login npx --no-install playwright-cli -s=login close

2. Run (`MODEL`, `EFFORT`, `RUN_ID` optional): `./run.sh`
3. Verify independently: `uv run --no-project --python 3.12 python verify.py ~/.cache/gxui-loop/runs/<run-id>`

Per run: `events.jsonl`, `codex-home/sessions` (token log), `work/notes.md`, `work/report.md`,
`metrics.json`, `verify.json`.

`spikes/` holds the S1 (shared page over CDP) and S3 (daemon lifecycle) spike scripts recorded in
`../GALAXY_UI_SKILL_DESIGN.md`. Run them with Galaxy's venv Python and, for the Galaxy ones,
`PYTHONPATH=<galaxy worktree>/lib`.

## gxui (MVP, external first)

`gxui/` is the CLI and daemon from `../GALAXY_UI_SKILL_DESIGN.md`; `skill/galaxy-ui-driver/SKILL.md`
is the skill. It needs a Galaxy checkout with prerequisite PRs 1 and 2 and a Python with Galaxy's
deps. That is the standing branch `galaxy_ui_driver` (pushed to `jmchilton`; worktree
`~/projects/worktrees/galaxy/branch/galaxy_ui_driver`). It holds the Galaxy-side changes gxui needs,
saved until the gxui work is a complete motivating example; see `../GALAXY_UI_SKILL_DESIGN.md`. The
worktree has no `.venv` of its own, so always set `GXUI_PYTHON`. Recreate it if it is gone:

    git -C ~/projects/repositories/galaxy fetch jmchilton galaxy_ui_driver
    git -C ~/projects/repositories/galaxy worktree add ~/projects/worktrees/galaxy/branch/galaxy_ui_driver galaxy_ui_driver

Arm A loop run (Codex; same prerequisites as arm B above):

    ARM=A RUN_ID=phase1-runA4 GXUI_PYTHON=~/projects/worktrees/galaxy/branch/playwright_text_table_parity/.venv/bin/python ./run.sh
    uv run --no-project --python 3.12 python verify.py ~/.cache/gxui-loop/runs/phase1-runA4

For arm A count calls from `metrics.json`'s `gxui_layers`/`gxui_gaps` (the gxui transcript), not the
shell-command counts: agents wrap `./gxui` in their own scripts.

Interactive use:

    export GXUI_GALAXY_ROOT=~/projects/worktrees/galaxy/branch/galaxy_ui_driver   # the default
    export GXUI_PYTHON=~/projects/worktrees/galaxy/branch/playwright_text_table_parity/.venv/bin/python
    bin/gxui start --url https://test.galaxyproject.org --storage-state ~/.cache/gxui-loop/auth/galaxy-test-auth.json
    bin/gxui help
    bin/gxui history-items
    bin/gxui stop

State (socket, log, transcript, screenshots, aria snapshots) is in `$GXUI_HOME` (default
`~/.cache/gxui`), per session (`GXUI_SESSION` or `--session`, default `default`). Pass
`--playwright-cli '<command>'` to `start` to have the daemon attach playwright-cli to its browser.

`run.sh` inlines the tutorial's FAQ snippets with `expand_snippets.py`
(`uv run --no-project --with pytest python -m pytest tests/test_expand_snippets.py`).

Tests (browserless verb parsing, plus a daemon driving Galaxy's `basic.html` fixture and a browser
kill/relaunch):

    PYTHONPATH=$PWD:$GXUI_GALAXY_ROOT/lib $GXUI_PYTHON -m pytest tests/test_gxui.py
