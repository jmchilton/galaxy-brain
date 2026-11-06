#!/bin/sh
# Launch Claude or Codex under vault/agents/<agent_dir> in a new Herdr space (app) or workspace (tui) and send it a prompt.
# Usage: launch_agent.sh [--host <host> --vault <host's vault>] <agent_dir> <claude|codex> <name> <prompt> [agent args...]
# An empty prompt just starts the agent. Agent args go to claude/codex, e.g. --model opus --effort xhigh.
# Flavor: GB_HERDR, else herdr: in ../DISPATCH_CONFIG.yml. app starts it with hc and names it in the window if open;
# tui starts a headless server if needed. --host pulls that host's vault first; app runs the agent on hc machine <host>,
# tui runs the host's own copy over ssh.
set -eu

PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

usage() { echo "usage: $0 [--host <host> --vault <host's vault>] <agent_dir> <claude|codex> <name> <prompt> [agent args...]" >&2; exit 2; }

host= vault=
while [ $# -ge 2 ]; do
  case $1 in --host) host=$2 ;; --vault) vault=$2 ;; *) break ;; esac
  shift 2
done
[ -z "$host" ] || [ -n "$vault" ] || usage
[ $# -ge 4 ] || usage
agent_dir=$1 kind=$2 name=$3 prompt=$4
shift 4

case $kind in claude|codex) ;; *) echo "kind must be claude or codex: $kind" >&2; exit 2 ;; esac

shared=$(cd "$(dirname "$0")/.." && pwd)
config="$shared/DISPATCH_CONFIG.yml"
herdr=${GB_HERDR:-$(sed -n 's/^herdr:[[:space:]]*\([a-z]*\).*/\1/p' "$config" 2>/dev/null)}
case ${herdr:=tui} in app|tui) ;; *) echo "herdr must be app or tui (GB_HERDR or $config): $herdr" >&2; exit 2 ;; esac

# Single-quotes each argument for a POSIX shell.
quote() {
  for arg; do
    q=$(printf '%s' "$arg" | sed "s/'/'\\\\''/g"; printf x)
    printf " '%s'" "${q%x}"
  done
}

if [ -n "$host" ]; then
  cwd="$vault/agents/$agent_dir"
  if [ "$herdr" = tui ]; then
    pull="git -C$(quote "$vault") pull -q --no-rebase --no-edit || echo \"warning: git pull failed in $vault on $host\""
    exec ssh -o BatchMode=yes -o ConnectTimeout=10 "$host" \
      "$pull; GB_HERDR=tui$(quote "$vault/agents/_shared/scripts/launch_agent.sh" "$agent_dir" "$kind" "$name" "$prompt" "$@")"
  fi
  hc exec --on "$host" git -C "$vault" pull -q --no-rebase --no-edit >/dev/null || echo "warning: git pull failed in $vault on $host" >&2
  hc exec --on "$host" test -d "$cwd" >/dev/null || { echo "no agent directory on $host: $cwd" >&2; exit 2; }
else
  cwd="$(dirname "$shared")/$agent_dir"
  [ -d "$cwd" ] || { echo "no agent directory: $cwd" >&2; exit 2; }
fi

# Herdr and hc names: [a-z][a-z0-9_-]{0,31}, unique among live agents/terminals.
unique_name() {
  base=$(printf '%s' "$name" | tr 'A-Z' 'a-z' | tr -c 'a-z0-9_-' '-' | sed 's/^[^a-z]*//' | cut -c1-28)
  [ -n "$base" ] || base=agent
  name=$base n=2
  while printf '%s\n' "$1" | grep -qx "$name"; do name="$base-$n"; n=$((n + 1)); done
}

# The records the prompt names, as hc run labels for the Herdr app's 📎 menu.
record_labels() {
  now=$(date +%s)
  printf '%s\n' "$prompt" \
    | grep -oE 'repositories/[A-Za-z0-9._-]+/(branches|issues|issues_incubator|reviews)/[A-Za-z0-9._-]+/[A-Za-z0-9._-]*[A-Za-z0-9_-]' \
    | sed -E "s#^repositories/([^/]+)/([^/]+)/[^/]+/(.*)#--label gb.record.\1/\2/\3=$now#" | sort -u
}

if [ "$herdr" = app ]; then
  unique_name "$(hc ls 2>/dev/null | jq -r '.terminals[]?.name // empty' 2>/dev/null || true)"
  # Space and tab ids Herdr doesn't know yet become a new space and tab, so hc alone creates them, window or not.
  space=sp$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n') tab=tb$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')
  described="$kind${*:+ $*}"
  labels=$(record_labels)
  [ -z "$prompt" ] || set -- "$@" "$prompt"
  out=$(hc run --bg --json --no-parent --name "$name" --label "herdr.space=$space" --label "herdr.tab=$tab" $labels \
    --cwd "$cwd" ${host:+--on "$host"} -- "$kind" "$@") || { echo "hc run failed: $out" >&2; exit 1; }
  terminal=$(printf '%s' "$out" | jq -r '.address // empty')
  [ -n "$terminal" ] || { echo "hc run returned no terminal: $out" >&2; exit 1; }
  # Name them once the window shows them; without herdr-app they keep Herdr's names.
  if command -v herdr-app >/dev/null 2>&1; then
    n=0
    until herdr-app do space.rename --id "${host:+$host/}$space" --name "$agent_dir" >/dev/null 2>&1; do
      n=$((n + 1))
      [ $n -le 20 ] || { echo "warning: Herdr window didn't show space $space; left unnamed" >&2; break; }
      sleep 0.25
    done
    herdr-app do tab.rename --id "${host:+$host/}$tab" --name "$name" >/dev/null 2>&1 || true
  fi
  echo "Launched $described '$name' in $agent_dir${host:+ on $host}, terminal $terminal"
  exit 0
fi

if ! herdr workspace list >/dev/null 2>&1; then
  nohup herdr server >/dev/null 2>&1 </dev/null &
  n=0
  until herdr workspace list >/dev/null 2>&1; do
    n=$((n + 1))
    [ $n -le 20 ] || { echo "Herdr server did not start" >&2; exit 1; }
    sleep 0.5
  done
fi

unique_name "$(herdr agent list 2>/dev/null | jq -r '.result.agents[]?.name // empty' 2>/dev/null || true)"

pane=$(herdr workspace create --cwd "$cwd" --label "$agent_dir" --no-focus | jq -r '.result.root_pane.pane_id')
[ -n "$pane" ] && [ "$pane" != null ] || { echo "workspace create returned no pane" >&2; exit 1; }

if ! herdr agent start "$name" --kind "$kind" --pane "$pane" --timeout 60000 -- "$@" >/dev/null; then
  echo "agent did not become ready in pane $pane (startup dialog?) - check it with: herdr agent focus $pane" >&2
  exit 1
fi

# Target the pane from here on: the Claude session-name hook clears agent names.
if [ -n "$prompt" ]; then
  herdr agent prompt "$pane" "$prompt" >/dev/null
  herdr agent wait "$pane" --until working --timeout 30000 >/dev/null || echo "warning: agent in $pane not working yet" >&2
fi

echo "Launched $kind${*:+ $*} '$name' in $agent_dir, pane $pane"
