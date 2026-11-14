#!/bin/sh
# SessionStart hook for Claude and Codex: label the hc terminal with the harness, session id and transcript path.
# Usage (hook command, payload on stdin): hc_session_label.sh <claude|codex>
# Labels: gb.harness, gb.session, gb.transcript. Does nothing outside an hc terminal, for subagents, or on bad input.

PATH="$PATH:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin"

harness=${1:-}
case $harness in claude|codex) ;; *) exit 0 ;; esac
[ -n "${HC_TERMINAL_ID:-}" ] || exit 0
command -v hc >/dev/null 2>&1 && command -v jq >/dev/null 2>&1 || exit 0

fields=$(jq -r 'select(.hook_event_name == "SessionStart" and (.agent_id // "") == "" and (.session_id // "") != "")
  | [.session_id, (.transcript_path // "")] | @tsv' 2>/dev/null) || exit 0
[ -n "$fields" ] || exit 0
tab=$(printf '\t')
session=${fields%%"$tab"*} transcript=${fields#*"$tab"}

hc label "$HC_TERMINAL_ID" "gb.harness=$harness" "gb.session=$session" "gb.transcript=$transcript" >/dev/null 2>&1 || true
exit 0
