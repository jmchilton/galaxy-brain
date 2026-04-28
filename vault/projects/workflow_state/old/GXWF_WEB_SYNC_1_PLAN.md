# Plan: Sync Python `gxwf-web` with TS `styling` Branch

Reference branches:
- Python: `/Users/jxc755/projects/repositories/gxwf-web` (main)
- TS: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/styling`
- VS Code ext: `/Users/jxc755/projects/worktrees/galaxy-workflows-vscode/branch/wf_tool_state`

## Findings (current divergence)

**API endpoints**: identical at the verb level. All endpoints (`/workflows`, `/workflows/{path}/{validate,clean,export,convert,roundtrip,lint}`, `/api/contents/*`) exist on both sides with matching params (`strict_structure`, `strict_encoding`, `connections`, `mode`, `clean_first`, `allow[]`, `deny[]`, `dry_run`, `preserve[]`, `strip[]`).

**Report models**: Python is fine. The TS `packages/schema/src/workflow/report-models.ts` actually has a stale `removed_keys: string[]` on `CleanStepResult`, while both OpenAPI specs and Python use `removed_state_keys` + `removed_step_keys`. Fix is on the TS side, not here. `lint_error_messages` / `lint_warning_messages` already present in Python.

**Recent TS work** (since GXWF_AGENT.md was written):
- `b5a6e57` — embed Monaco + LSP via `monaco-vscode-api` (the major VS Code feature)
- `3b97a0f` — UI auto-preview/apply for clean/export/convert; surface lint messages
- CSP headers split: baseline vs `buildMonacoCspHeader` for `/monaco/*` (extension-host iframe needs `'unsafe-eval'` + `blob:`)

**Python gaps**:
1. No CSP headers at all (Monaco-enabled UI build will be blocked).
2. No `/monaco/*` or `/ext/*` static routes for the extension-host iframe + staged `.vsix`.
3. No E2E tests; TS has a full Playwright harness in `packages/gxwf-e2e/`.

## Plan

### Step 1 — Confirm OpenAPI parity (sanity check)
- `make docs-openapi` here, diff against TS `packages/gxwf-web/openapi.json`.
- Expect no endpoint deltas; if any, regenerate TS client (`make sync-openapi` + `pnpm codegen` over there).
- Test: byte-compare key endpoints; commit any drift.

### Step 2 — CSP middleware
- Port TS `buildCspHeader` and `buildMonacoCspHeader` (TS `packages/gxwf-web/src/router.ts:114-145`) to a FastAPI middleware in `src/gxwf_web/app.py`.
- Apply baseline policy globally; apply Monaco policy to `/monaco/*` responses only.
- Test: request `/` → assert baseline CSP; request a `/monaco/*` asset → assert permissive CSP.

### Step 3 — Stage and serve the VS Code extension
- Read pinned commit from TS `packages/gxwf-ui/EXT_COMMIT.md`.
- Add a Make target `make stage-ext` that builds the `.vsix` from the galaxy-workflows-vscode worktree at that commit, unpacks it under a path the FastAPI app serves (e.g. `static/ext/`).
- Mount `/ext/*` as static; mount `/monaco/*` for Monaco worker assets that ship with the gxwf-ui dist.
- Test: `GET /ext/package.json` → 200 with extension manifest.

### Step 4 — Build/serve the Monaco-enabled UI
- Add `make build-ui-monaco` target that runs the gxwf-ui Vite build with `VITE_GXWF_MONACO=1` (and `VITE_GXWF_EXPOSE_MONACO=1` for E2E).
- Existing SPA-serving code (commit `6a5ced2`) just serves the dist; no app changes needed beyond pointing `--ui-dir` at the Monaco build.
- Manual smoke: serve, open browser, confirm Monaco mounts and LSP hover works against a fixture workflow.

### Step 5 — Wire E2E harness against Python server
- TS-side change first (one PR over there): teach `packages/gxwf-e2e/src/harness.ts` to honor `GXWF_E2E_EXTERNAL_URL` and skip `createApp` when set; teach `global-setup.ts` to skip the gxwf-ui build when targeting external.
- Add `make e2e` here that:
  1. Boots Python server on an ephemeral port with a seeded fixture workspace (reuse `packages/gxwf-e2e/fixtures/`),
  2. Exports `GXWF_E2E_EXTERNAL_URL`,
  3. Invokes `pnpm --filter @galaxy-tool-util/gxwf-e2e test` from the TS worktree.
- Test: full suite green; Monaco specs auto-skip without the `.vsix` fixture, run when present.

### Step 6 — VS Code mode runnable from Python
- Add `make serve-vscode` that combines: stage extension + serve Monaco UI build + Python server with CSP middleware on. Document in README.
- Acceptance: open browser to served URL, FileView shows Monaco editor, hover/diagnostics work via LSP, `/ext/package.json` resolves, no CSP violations in console.

### Step 7 — Run E2E in VS Code mode against Python
- With `.vsix` staged and `VITE_GXWF_EXPOSE_MONACO=1` build, run `make e2e` with `GXWF_E2E_MONACO=1` — exercises `monaco-boot`, `monaco-hover`, `monaco-diagnostics`, etc., proving Python parity.

## Test strategy summary
- Steps 1–2: red-to-green pytest for middleware + OpenAPI diff guard.
- Steps 3–4: pytest hitting the FastAPI TestClient for the new static routes.
- Steps 5–7: reuse the TS Playwright suite as a black-box contract test against the Python server.

## Unresolved questions
- Stage `.vsix` in this repo or fetch on demand? (size vs offline use)
- Pin EXT_COMMIT here too, or trust TS pin?
- Should `make build-ui-monaco` invoke pnpm in the TS worktree or expect a prebuilt artifact?
- CSP nonce strategy — match TS exactly or relax for dev?
- Want the TS-side harness change (`GXWF_E2E_EXTERNAL_URL`) as a separate PR drafted now, or after plan agreement?
- Keep the legacy `preserve[]`/`strip[]` clean params, or strip them per the "no key-level policy knobs" rule in `GXWF_AGENT.md`?
