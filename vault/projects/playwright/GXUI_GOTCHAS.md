# gxui Gotchas

- `gxui home` reloads Galaxy and resets client-only state (history selection mode, open panels). Many verbs call it first. Before claiming a UI state ends or resets, screenshot right after the action with no `home`-calling verb in between.
- Under `codex exec -s workspace-write` on macOS, Chrome aborts (SIGABRT). Start the browser or `gxui` daemon outside the sandbox and drive it over its Unix socket; keep the socket path short (~104-byte macOS limit) and set `sandbox_workspace_write.network_access=true`.
