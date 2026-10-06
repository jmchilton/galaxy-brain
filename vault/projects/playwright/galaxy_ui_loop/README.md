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
