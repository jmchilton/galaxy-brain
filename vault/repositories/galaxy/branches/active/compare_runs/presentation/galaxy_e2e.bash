#!/usr/bin/env bash
# Bash port of the jmchilton:galaxy-playwright skill's galaxy_e2e.sh (which needs zsh;
# chickenstraws has no zsh). Same behaviour: per-worktree Galaxy + Vite on free ports,
# state in .venv/e2e.env, logs in .venv/e2e-{galaxy,vite}.log. Run from the Galaxy worktree root.
#   galaxy_e2e.bash up | status | down
#   galaxy_e2e.bash run playwright <pytest targets...>
# Extra env passes through (e.g. GALAXY_TEST_SCREENSHOTS_DIRECTORY=...).
set -u
WT=$PWD
STATE=$WT/.venv/e2e.env
KEY=e2e-master-key
ADMIN=test@bx.psu.edu

[[ -f run.sh && -d lib/galaxy_test ]] || { echo "run from a Galaxy worktree root" >&2; exit 2; }
[[ -d .venv ]] || { echo "no .venv: run /galaxy-bootstrap first" >&2; exit 2; }

listening() { lsof -ti tcp:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
up_ok() { [[ -f $STATE ]] && source "$STATE" && curl -sf "http://127.0.0.1:${GALAXY_PORT}/api/version" >/dev/null && curl -sf "http://127.0.0.1:${VITE_PORT}/" >/dev/null; }

wait_for() {  # url seconds log
  local i
  for ((i = 0; i < $2; i++)); do curl -sf "$1" >/dev/null && return 0; sleep 1; done
  echo "timed out waiting for $1; tail of $3:" >&2; tail -20 "$3" >&2; return 1
}

cmd_up() {
  if up_ok; then echo "reusing Galaxy :$GALAXY_PORT, Vite :$VITE_PORT"; return 0; fi
  [[ -d client/node_modules ]] || { echo "no client/node_modules" >&2; exit 2; }
  local n found=
  for ((n = 0; n < 30; n++)); do
    if ! listening $((8090 + n)) && ! listening $((5180 + n)); then found=1; break; fi
  done
  [[ -n $found ]] || { echo "no free port pair in 8090-8119 / 5180-5209" >&2; exit 1; }
  GALAXY_PORT=$((8090 + n)); VITE_PORT=$((5180 + n))
  printf 'GALAXY_PORT=%s\nVITE_PORT=%s\n' "$GALAXY_PORT" "$VITE_PORT" > "$STATE"

  PYTHONPATH=lib NO_PROXY='*' GALAXY_SKIP_CLIENT_BUILD=1 \
  GALAXY_CONFIG_OVERRIDE_TOOL_CONFIG_FILE=test/functional/tools/sample_tool_conf.xml \
  GALAXY_CONFIG_OVERRIDE_ADMIN_USERS=$ADMIN \
  GALAXY_CONFIG_OVERRIDE_MASTER_API_KEY=$KEY \
  GALAXY_CONFIG_OVERRIDE_BOOTSTRAP_ADMIN_API_KEY=$KEY \
  GALAXY_CONFIG_OVERRIDE_LIBRARY_IMPORT_DIR=$WT/test-data \
  GALAXY_CONFIG_OVERRIDE_BUILDS_FILE_PATH=shared/ucsc/builds.txt.sample \
  GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
  setsid nohup .venv/bin/gunicorn 'galaxy.webapps.galaxy.fast_factory:factory()' \
    -k galaxy.webapps.galaxy.workers.Worker -b 127.0.0.1:$GALAXY_PORT \
    --config python:galaxy.web_stack.gunicorn_config --preload > .venv/e2e-galaxy.log 2>&1 &
  echo $! > .venv/e2e-galaxy.pid

  (cd client && GALAXY_URL=http://127.0.0.1:$GALAXY_PORT VITE_PORT=$VITE_PORT \
    npm_config_use_node_version=$(cat .node_version) \
    setsid nohup pnpm run develop --strictPort > ../.venv/e2e-vite.log 2>&1 & echo $! > "$WT/.venv/e2e-vite.pid")

  wait_for "http://127.0.0.1:$GALAXY_PORT/api/version" 300 .venv/e2e-galaxy.log || exit 1
  wait_for "http://127.0.0.1:$VITE_PORT/" 120 .venv/e2e-vite.log || exit 1
  echo "Galaxy :$GALAXY_PORT, Vite :$VITE_PORT (logs in .venv/e2e-*.log)"
}

cmd_run() {
  local backend=${1:-}; shift || true
  [[ $backend == playwright && $# -gt 0 ]] || { echo "usage: run playwright <targets>" >&2; exit 2; }
  up_ok || { echo "servers not up: run 'galaxy_e2e.bash up'" >&2; exit 2; }
  source .venv/bin/activate
  export PYTHONPATH=lib GALAXY_TEST_FILE_DIR=$WT/test-data GALAXY_TEST_TIMEOUT_MULTIPLIER=2 \
    GALAXY_TEST_EXTERNAL=http://localhost:$VITE_PORT/ \
    GALAXY_CONFIG_MASTER_API_KEY=$KEY GALAXY_TEST_SELENIUM_ADMIN_API_KEY=$KEY \
    GALAXY_TEST_SELENIUM_ADMIN_USER_EMAIL=$ADMIN \
    GALAXY_TEST_DRIVER_BACKEND=playwright GALAXY_TEST_SELENIUM_HEADLESS=1
  unset GALAXY_TEST_END_TO_END_CONFIG
  # chickenstraws lacks Chrome's GTK/X libs system-wide; they were apt-get download'ed and
  # dpkg-deb -x'ed (no sudo) into .venv/chrome-libroot, along with fonts and a private fonts.conf
  # (the machine has no /etc/fonts and no /usr/share/fonts)
  if [[ -d $WT/.venv/chrome-libroot ]]; then
    export LD_LIBRARY_PATH=$WT/.venv/chrome-libroot/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}
    export FONTCONFIG_FILE=$WT/.venv/chrome-libroot/fonts.conf
  fi
  pytest -p no:asyncio "$@" -W ignore::DeprecationWarning -W ignore::PendingDeprecationWarning --tb=short -rA
}

cmd_down() {
  [[ -f $STATE ]] || { echo "nothing recorded"; return 0; }
  source "$STATE"
  local p pid
  for p in $GALAXY_PORT $VITE_PORT; do
    for pid in $(lsof -ti tcp:"$p" -sTCP:LISTEN); do
      # only kill processes rooted in this worktree
      [[ $(readlink -f /proc/$pid/cwd) == "$WT"* ]] && kill "$pid"
    done
  done
  rm -f "$STATE"
  echo "stopped :$GALAXY_PORT, :$VITE_PORT"
}

case ${1:-status} in
  up) cmd_up ;;
  run) shift; cmd_run "$@" ;;
  down) cmd_down ;;
  status) if up_ok; then echo "up: Galaxy :$GALAXY_PORT, Vite :$VITE_PORT"; else echo "down"; fi ;;
  *) echo "usage: galaxy_e2e.bash up|run|status|down" >&2; exit 2 ;;
esac
