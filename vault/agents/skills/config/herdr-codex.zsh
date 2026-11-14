# Keep Codex hooks in the launching Herdr pane's or hc terminal's environment. A shared
# app-server can retain HERDR_PANE_ID or HC_TERMINAL_ID from a different one.
# Source this file from ~/.zshrc and ~/.bashrc; keep the maintained copy in this checkout.
function codex() {
    if [[ ${HERDR_ENV:-} == 1 || -n ${HC_TERMINAL_ID:-} ]]; then
        command codex --no-daemon "$@"
    else
        command codex "$@"
    fi
}
