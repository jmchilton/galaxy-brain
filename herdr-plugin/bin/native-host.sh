#!/bin/sh
# Chrome's native messaging host entry; Chrome starts it with a bare PATH and its origin as an argument.
set -eu
PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export PATH
exec node "$(dirname "$0")/../dist/native-host.cjs"
