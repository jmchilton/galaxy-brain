#!/usr/bin/env bash
# Phase 0, arm B: Codex + stock playwright-cli on GTN galaxy-intro-short against test.galaxyproject.org.
# Prereq: $GXUI_LOOP_HOME/auth/galaxy-test-auth.json (see README.md). Usage: ./run.sh   (env: MODEL, EFFORT)
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
# Source lives in the vault; login state, node_modules and run artifacts stay outside it.
LOOP_HOME=${GXUI_LOOP_HOME:-$HOME/.cache/gxui-loop}
RUN_ID=${RUN_ID:-$(date +%Y%m%dT%H%M%S)}
RUN=$LOOP_HOME/runs/$RUN_ID
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
cp "$HERE/prompt.md" "$RUN/prompt.md"
ln -s "$LOOP_HOME/node_modules" "$RUN/work/node_modules"
(cd "$RUN/work" && npx --no-install playwright-cli install --skills=agents > /dev/null)

# The browser runs outside Codex's sandbox (Chrome aborts inside it); the agent only talks to
# this already-open session over its socket, and is never given the auth state file.
export PWTEST_DAEMON_SESSION_DIR="$RUN/work/.daemon"
PW="npx --no-install playwright-cli -s=gtn"
(cd "$RUN/work" && $PW open https://test.galaxyproject.org --idle-timeout=0 > /dev/null \
  && $PW state-load "$LOOP_HOME/auth/galaxy-test-auth.json" > /dev/null && $PW reload > /dev/null)
trap '(cd "$RUN/work" && $PW close > /dev/null 2>&1)' EXIT

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
