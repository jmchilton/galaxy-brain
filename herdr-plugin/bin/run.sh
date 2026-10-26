#!/bin/sh
# Runs the bundled plugin with a PATH that finds node and fzf; the herdr server's env may lack them.
set -eu
PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export PATH
exec node "$(dirname "$0")/../dist/galaxy-brain.cjs" "$@"
