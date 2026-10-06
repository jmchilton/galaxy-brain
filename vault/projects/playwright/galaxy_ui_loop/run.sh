#!/usr/bin/env bash
# Codex works GTN galaxy-intro-short on test.galaxyproject.org. ARM=B (default): stock playwright-cli.
# ARM=A: the galaxy-ui-driver skill - a gxui daemon with playwright-cli attached as the escape hatch.
# Prereq: $GXUI_LOOP_HOME/auth/galaxy-test-auth.json (see README.md). Usage: ./run.sh   (env: ARM, MODEL, EFFORT, RUN_ID)
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
# Source lives in the vault; login state, node_modules and run artifacts stay outside it.
LOOP_HOME=${GXUI_LOOP_HOME:-$HOME/.cache/gxui-loop}
RUN_ID=${RUN_ID:-$(date +%Y%m%dT%H%M%S)}
RUN=$LOOP_HOME/runs/$RUN_ID
ARM=${ARM:-B}
case $ARM in A|B) ;; *) echo "ARM must be A or B"; exit 1 ;; esac
TUTORIAL=$HOME/projects/repositories/training-material/topics/introduction/tutorials/galaxy-intro-short/tutorial.md

test -f "$LOOP_HOME/auth/galaxy-test-auth.json" || { echo "missing $LOOP_HOME/auth/galaxy-test-auth.json - see README.md"; exit 1; }
if [ ! -d "$LOOP_HOME/node_modules" ]; then
  cp "$HERE/package.json" "$HERE/package-lock.json" "$LOOP_HOME/" && (cd "$LOOP_HOME" && npm ci --silent)
fi
mkdir -p "$RUN/codex-home" "$RUN/work"
# Isolated CODEX_HOME: no global AGENTS.md, memories, skills or plugins; auth shared via symlink.
ln -s "$HOME/.codex/auth.json" "$RUN/codex-home/auth.json"
printf 'model = "%s"\nmodel_reasoning_effort = "%s"\n' "${MODEL:-gpt-6.1-sol}" "${EFFORT:-high}" > "$RUN/codex-home/config.toml"
cp "$TUTORIAL" "$RUN/work/tutorial.md"
tooling=$(echo "$ARM" | tr AB ab)
awk -v f="$HERE/tooling_$tooling.md" '/^\{\{TOOLING\}\}$/ { while ((getline line < f) > 0) print line; next } { print }' \
  "$HERE/prompt.md" > "$RUN/prompt.md"
echo "$ARM" > "$RUN/arm"
ln -s "$LOOP_HOME/node_modules" "$RUN/work/node_modules"
(cd "$RUN/work" && npx --no-install playwright-cli install --skills=agents > /dev/null)

# The browser runs outside Codex's sandbox (Chrome aborts inside it); the agent only talks to
# this already-open session over its socket, and is never given the auth state file.
export PWTEST_DAEMON_SESSION_DIR="$RUN/work/.daemon"
PW="npx --no-install playwright-cli -s=gtn"
if [ "$ARM" = B ]; then
  (cd "$RUN/work" && $PW open https://test.galaxyproject.org --idle-timeout=0 > /dev/null \
    && $PW state-load "$LOOP_HOME/auth/galaxy-test-auth.json" > /dev/null && $PW reload > /dev/null)
  trap '(cd "$RUN/work" && $PW close > /dev/null 2>&1)' EXIT
else
  # gxui needs a Galaxy checkout with UI-skill prereq PRs 1-2 and a Python with Galaxy's deps.
  export GXUI_HOME="$LOOP_HOME/gxui" GXUI_SESSION=gtn GXUI_CLIENT_TIMEOUT=290
  export GXUI_GALAXY_ROOT=${GXUI_GALAXY_ROOT:-$HOME/projects/worktrees/galaxy/branch/gxui_base}
  export GXUI_PYTHON=${GXUI_PYTHON:-$GXUI_GALAXY_ROOT/.venv/bin/python}
  cp -R "$HERE/skill/galaxy-ui-driver" "$RUN/work/.agents/skills/"
  { echo '#!/bin/sh'
    for v in GXUI_HOME GXUI_SESSION GXUI_CLIENT_TIMEOUT GXUI_GALAXY_ROOT GXUI_PYTHON; do eval "echo export $v=\\\"\$$v\\\""; done
    echo "exec \"$HERE/bin/gxui\" \"\$@\""; } > "$RUN/work/gxui" && chmod +x "$RUN/work/gxui"
  (cd "$RUN/work" && ./gxui start --url https://test.galaxyproject.org --idle-timeout 0 \
    --storage-state "$LOOP_HOME/auth/galaxy-test-auth.json" --artifacts "$RUN/gxui" \
    --playwright-cli "npx --no-install playwright-cli" > /dev/null)
  trap '(cd "$RUN/work" && ./gxui stop > /dev/null 2>&1) || true' EXIT
fi

date -u +%Y-%m-%dT%H:%M:%SZ > "$RUN/started_at"
set +e
CODEX_HOME="$RUN/codex-home" \
  codex exec --json --skip-git-repo-check -s workspace-write -c sandbox_workspace_write.network_access=true \
    -C "$RUN/work" -o "$RUN/last_message.txt" - < "$RUN/prompt.md" \
    > "$RUN/events.jsonl" 2> "$RUN/stderr.log"
echo "codex exit $?" >> "$RUN/stderr.log"
set -e
date -u +%Y-%m-%dT%H:%M:%SZ > "$RUN/finished_at"
uv run --no-project --python 3.12 python "$HERE/metrics.py" "$RUN" | tee "$RUN/metrics.json"
echo "run dir: $RUN"
