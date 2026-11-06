#!/bin/sh
# Installs the built gb-pane, gb-agents and gb-board mods into the Herdr app, plus a `gb` layout:
# `main` with gb-pane as its pane header and gb-agents as the sidebar's header and list, in place of the spaces and agents lists,
# and no tab or status bar.
set -eu
home=${HERDR_APP_HOME:-$HOME/.config/herdr-app}
here=$(cd "$(dirname "$0")" && pwd)
for mod in gb-pane gb-agents gb-board; do
  mkdir -p "$home/mods/$mod"
  cp "$here/dist/$mod/main.js" "$here/dist/$mod/mod.json" "$home/mods/$mod/"
  herdr-app check "$home/mods/$mod"
done
layout="$home/layouts/gb.json"
[ -f "$layout" ] && source="$layout" || source="$home/layouts/main.json"
jq 'walk(
  if type == "object" and (.header | type) == "object" and .header.content.mod == "pane" then .header.content.mod = "gb-pane" else . end
  | if type == "object" and (.children | type) == "array" then
      .children |= (map(select(.content.mod? != "spaces" and .content.mod? != "tabs" and .content.mod? != "workspace-status"))
        | map(if .content.mod? == "agents" then .id = "gb-agents" | .content.mod = "gb-agents"
              elif .id? == "brand" then .content = { mod: "gb-agents", props: { view: "header" } }
              else . end))
    else . end)' "$source" > "$layout.tmp"
grep -q '"gb-pane"' "$layout.tmp" && grep -q '"gb-agents"' "$layout.tmp" || { rm "$layout.tmp"; echo "$source has no pane header or agents list to replace" >&2; exit 1; }
cmp -s "$layout.tmp" "$layout" 2>/dev/null && rm "$layout.tmp" || { mv "$layout.tmp" "$layout"; echo "Wrote layout gb. Show it: herdr-app do layout.switch --name gb (back: --name main)"; }
