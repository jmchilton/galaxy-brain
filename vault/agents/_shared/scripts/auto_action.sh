#!/bin/sh
# Starts an auto action from ../DISPATCH_CONFIG.yml on a record if it's on; says so if it's off.
# Usage: auto_action.sh <action> <record dir or a file in it>
# Rebuilds the herdr-plugin bundle first when a source is newer, since a pull leaves it stale.
set -eu

PATH="$HOME/.local/bin:$HOME/.nvm/current/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
command -v node >/dev/null 2>&1 || for nvm in "$HOME"/.nvm/versions/node/*/bin; do [ -x "$nvm/node" ] && PATH="$nvm:$PATH"; done

[ $# -eq 2 ] || { echo "usage: $0 <action> <record>" >&2; exit 2; }
root=$(cd "$(dirname "$0")/../../../.." && pwd)
plugin="$root/herdr-plugin"
bundle="$plugin/dist/galaxy-brain.cjs"

stale() {
  [ ! -f "$bundle" ] && return 0
  [ -n "$(find "$root" \( -name node_modules -o -name dist -o -name .git -o -path "$root/vault" \) -prune -o -name '*.ts' -newer "$bundle" -print 2>/dev/null | head -n 1)" ]
}

if stale; then
  (cd "$plugin" && node esbuild.config.mjs >/dev/null 2>&1) || {
    echo "herdr-plugin build failed in $plugin; set this machine up per vault/agents/_shared/PROCESS_SETUP_MACHINE.md" >&2
    exit 3
  }
fi
exec node "$bundle" auto "$1" "$2"
