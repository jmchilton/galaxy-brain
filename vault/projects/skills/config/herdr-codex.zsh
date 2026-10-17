# Keep Codex hooks in the launching Herdr pane's environment. A shared
# app-server can retain HERDR_PANE_ID from a different pane.
# Source this file from ~/.zshrc; keep the maintained copy in this checkout.
function codex() {
    if [[ ${HERDR_ENV:-} == 1 ]]; then
        command codex --no-daemon "$@"
    else
        command codex "$@"
    fi
}
