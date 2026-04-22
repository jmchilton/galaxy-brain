# Suggested Changes to GXWF AGENT.md

## 1. Update TS backend branch reference

Current text says:
> The TypeScript backend is in /Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models.

The active worktree is now `gxwf-web` (branch `gxwf-client`). Update to:
> The TypeScript backend is in the galaxy-tool-util monorepo — the active worktree lives at /Users/jxc755/projects/worktrees/galaxy-tool-util/branch/gxwf-web.

## 2. Note the clean API policy: clean everything, no key lists

Add a note under the clean operation description:
> The clean operation intentionally exposes no key-level policy knobs (no allow/deny/preserve/strip lists). Users always get "clean everything." The Python clean.py has more machinery but the API and CLI surface should stay simple.

## 3. Clarify report-shell scope and Nunjucks relationship

Current text says report-shell components are "shared between the web UI and CLI HTML output (via Nunjucks templates)." This is aspirational — the CLI HTML output side doesn't exist yet. Rewrite to:
> Report display components live in packages/gxwf-report-shell/ and are used by the web UI (gxwf-ui). CLI HTML output is planned via Nunjucks templates that consume the same report model JSON shapes; these are not yet implemented.

## 4. Python gxwf-web now serves gxwf-ui

Add:
> The Python FastAPI server (gxwf-web) serves the gxwf-ui Vue SPA in production mode. Both backends (Python and TypeScript) can serve the same built UI artifact from packages/gxwf-ui/dist/.

## 5. OpenAPI sync workflow note

Add after the openapi.json reference:
> To sync the OpenAPI spec from Python to TS: run `make docs-openapi` in the Python gxwf-web repo, then `make sync-openapi` in the TS monorepo, then `pnpm codegen` in packages/gxwf-web to regenerate api-types.ts. Commit openapi.json and api-types.ts together.

## 6. Remove or demote Jinja/Nunjucks HTML mention

Current text says "hopefully HTML in the future" for CLI output. The report-shell Vue components are the HTML story for the web UI. Nunjucks CLI HTML output is a separate effort. Clarify that Markdown is the current CLI output format; HTML output is the web UI.

## 7. Update the "not yet done" list

The document should reflect that:
- D8 (Format2 export from Galaxy) is complete
- D5 (Round-trip) is complete — 120/120 IWC workflows pass
- D7 (IWC lint-on-merge) is next in line
- D9 (VS Code) foundation is done; remaining: tool registry, completions

## 8. Clarify TS gxwf CLI subcommand structure

Add:
> The TS CLI (packages/cli) exposes a single `gxwf` command with subcommands rather than the `gxwf-*` prefix namespace used by the Python CLIs. Convergence target: TS gxwf should have subcommands covering validate, clean, roundtrip, lint, to-format2, to-native.
