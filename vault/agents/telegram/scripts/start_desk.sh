#!/bin/sh
# Start the telegram desk on this machine unless Claude is already running live in agents/telegram.
# systemd/gb-telegram-desk.timer runs it at boot and every 5 minutes.
set -eu

PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

here=$(cd "$(dirname "$0")/.." && pwd -P)
terminals=$(hc ls)
for t in $(printf '%s' "$terminals" | jq -r --arg cwd "$here" '.terminals[] | select(.state == "live" and .cwd == $cwd) | .address'); do
  hc get "$t" | jq -e '.foreground.name == "claude"' >/dev/null 2>&1 && exit 0
done
exec "$here/../_shared/scripts/launch_agent.sh" telegram claude telegram "Start up per AGENTS.md." --permission-mode auto
