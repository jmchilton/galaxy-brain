#!/bin/sh
# Launch Claude or Codex in a new Herdr workspace under vault/agents/<agent_dir> and send it a prompt.
# Usage: launch_agent.sh <agent_dir> <claude|codex> <name> <prompt> [agent args...]
# Agent args go to claude/codex, e.g. --model opus --effort xhigh.
# Works outside Herdr (e.g. from Obsidian) as long as the Herdr server is running.
set -eu

PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

[ $# -ge 4 ] || { echo "usage: $0 <agent_dir> <claude|codex> <name> <prompt> [agent args...]" >&2; exit 2; }
agent_dir=$1 kind=$2 name=$3 prompt=$4
shift 4

case $kind in claude|codex) ;; *) echo "kind must be claude or codex: $kind" >&2; exit 2 ;; esac

agents_root=$(cd "$(dirname "$0")/../.." && pwd)
cwd="$agents_root/$agent_dir"
[ -d "$cwd" ] || { echo "no agent directory: $cwd" >&2; exit 2; }

herdr workspace list >/dev/null 2>&1 || { echo "Herdr server not reachable - is herdr running?" >&2; exit 1; }

# Herdr names: [a-z][a-z0-9_-]{0,31}, unique among live agents.
base=$(printf '%s' "$name" | tr 'A-Z' 'a-z' | tr -c 'a-z0-9_-' '-' | sed 's/^[^a-z]*//' | cut -c1-28)
[ -n "$base" ] || base=agent
taken=$(herdr agent list 2>/dev/null | jq -r '.result.agents[]?.name // empty' 2>/dev/null || true)
name=$base n=2
while printf '%s\n' "$taken" | grep -qx "$name"; do name="$base-$n"; n=$((n + 1)); done

pane=$(herdr workspace create --cwd "$cwd" --label "$agent_dir" --no-focus | jq -r '.result.root_pane.pane_id')
[ -n "$pane" ] && [ "$pane" != null ] || { echo "workspace create returned no pane" >&2; exit 1; }

if ! herdr agent start "$name" --kind "$kind" --pane "$pane" --timeout 60000 -- "$@" >/dev/null; then
  echo "agent did not become ready in pane $pane (startup dialog?) - check it with: herdr agent focus $pane" >&2
  exit 1
fi

# Target the pane from here on: the Claude session-name hook clears agent names.
herdr agent prompt "$pane" "$prompt" >/dev/null
herdr agent wait "$pane" --until working --timeout 30000 >/dev/null || echo "warning: agent in $pane not working yet" >&2

echo "Launched $kind${*:+ $*} '$name' in $agent_dir, pane $pane"
