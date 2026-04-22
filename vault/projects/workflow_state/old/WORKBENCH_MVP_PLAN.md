# Galaxy Tool Util Studio — MVP Plan

## Overview

New package `@galaxy-tool-util/studio` — a Vue 3 web app for browsing, validating, and cleaning Galaxy workflow files in a local directory. Operations run client-side in the browser (importing schema/core). A thin Fastify server handles filesystem I/O and git integration.

Concurrent with studio creation: rename `packages/server` → `packages/tool-cache-proxy` (`@galaxy-tool-util/tool-cache-proxy`).

## Decisions Made

| Decision            | Choice                                     | Rationale                                                                                                            |
| ------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Frontend            | Vue 3 + Vite + PrimeVue (unstyled) + Shiki | User preference; PrimeVue unstyled allows custom theming                                                             |
| Operations          | Client-side in browser                     | Validate/clean/normalize/convert are pure TS functions in schema/core; no server roundtrip needed                    |
| Server              | Fastify sidecar                            | Only for fs read/write + git ops; Fastify has native TS support, fast                                                |
| Git                 | simple-git                                 | Wraps git CLI; galaxy-workflows-vscode uses VSCode git API (not transferable); simple-git is clean and full-featured |
| Syntax highlighting | Shiki                                      | File viewer + diff views                                                                                             |
| File editing        | Write-back with git awareness              | Show git status/diff context, require confirmation before writes                                                     |
| Audience            | Community tool                             | Clean UX, configurable, installable via npx/pnpm dlx                                                                 |
| Proxy rename        | `@galaxy-tool-util/tool-cache-proxy`       | Descriptive; stays separate from studio                                                                              |

## Architecture

```
Browser (Vue 3 + PrimeVue unstyled + Shiki)
  ├── imports @galaxy-tool-util/schema  — validate, clean, normalize, convert
  ├── imports @galaxy-tool-util/core    — ParsedTool model, cache types
  └── fetches from Fastify server:
        ├── GET    /api/files              — directory tree (.ga, .gxwf.yml)
        ├── GET    /api/files/:path        — file contents (raw text)
        ├── PUT    /api/files/:path        — write-back (with body)
        ├── GET    /api/git/status         — repo-level git status
        └── GET    /api/git/diff/:path     — per-file git diff
```

Dev workflow: Vite dev server on :5173 with HMR, proxies `/api/*` to Fastify on :3001. In prod, Fastify serves built Vue assets from `dist/` and API routes — single process via `npx @galaxy-tool-util/studio ./my-workflows/`.

---

## Step 1: Rename `packages/server` → `packages/tool-cache-proxy`

- Rename directory `packages/server/` → `packages/tool-cache-proxy/`
- Update `package.json` name to `@galaxy-tool-util/tool-cache-proxy`
- Update all workspace references (root `tsconfig.json`, `pnpm-workspace.yaml` uses glob so no change needed)
- Update imports in any consuming code
- Update CLAUDE.md, README.md references
- Binary name `galaxy-tool-proxy` stays the same
- Verify `make check && make test` pass

## Step 2: Scaffold `packages/studio`

Create `packages/studio/` with:

```
packages/studio/
├── package.json          — @galaxy-tool-util/studio
├── tsconfig.json
├── tsconfig.node.json    — for server-side TS (Fastify)
├── vite.config.ts
├── vitest.config.ts
├── index.html
├── src/
│   ├── client/           — Vue app
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── components/
│   │   └── composables/
│   └── server/           — Fastify server
│       ├── index.ts      — entry point, CLI arg parsing
│       ├── routes/
│       │   ├── files.ts  — directory listing + read/write
│       │   └── git.ts    — git status/diff
│       └── static.ts     — serve built Vue assets in prod
├── bin/
│   └── galaxy-tool-studio.ts  — bin entry
└── test/
```

Dependencies:
- **client**: `vue`, `@primevue/core` (unstyled), `shiki`, `@galaxy-tool-util/schema`, `@galaxy-tool-util/core`
- **server**: `fastify`, `@fastify/static`, `@fastify/cors`, `simple-git`, `commander`
- **dev**: `vite`, `@vitejs/plugin-vue`, `vitest`

## Step 3: Fastify Server — File System Routes

Implement `src/server/routes/files.ts`:

- `GET /api/files` — recursively scan the served directory for `.ga` and `.gxwf.yml` files, return as a tree structure:
  ```json
  { "root": "/path/to/dir", "files": [
    { "path": "sub/workflow.ga", "name": "workflow.ga", "format": "native", "size": 12345, "mtime": "..." }
  ]}
  ```
- `GET /api/files/:path` — read file contents as UTF-8 text, return `{ path, content, mtime }`
- `PUT /api/files/:path` — write content back to file, body: `{ content }`, return `{ ok, path }`
  - Validate path is within served directory (path traversal protection)

## Step 4: Fastify Server — Git Routes

Implement `src/server/routes/git.ts` using `simple-git`:

- `GET /api/git/status` — check if served directory is a git repo, return `{ isRepo, branch, modified[], untracked[] }`
- `GET /api/git/diff/:path` — return `{ path, diff }` (unified diff string for the file)
- Git detection: on server startup, check if directory is a git repo; if not, git endpoints return `{ isRepo: false }`

## Step 5: Vue App Shell + File Browser

Implement the app shell in `src/client/`:

- **Layout**: sidebar (file tree) + main panel (file viewer / operation results)
- **File tree component**: PrimeVue Tree (unstyled) populated from `GET /api/files`
  - Icons/badges for format (native vs format2)
  - Click to select → loads file in main panel
- **App.vue**: top-level layout, manages selected file state

## Step 6: Shiki File Viewer

Implement YAML viewer in main panel:

- Load file content from `/api/files/:path`
- Render with Shiki (`yaml` grammar), display in a scrollable code block
- Show file metadata header (path, format, size, git status indicator)

## Step 7: Client-Side Validate Operation

Wire up validation in the browser:

- Import validation functions from `@galaxy-tool-util/schema`
- On file select (or explicit button), run structural validation
- Display diagnostics as an inline list below the viewer:
  - Error/warning severity with line references where available
  - PrimeVue Message or inline-styled diagnostic cards
- Format detection: auto-detect `.ga` (native) vs `.gxwf.yml` (format2)

## Step 8: Client-Side Clean Operation

Wire up cleaning:

- Import `cleanWorkflow` from `@galaxy-tool-util/schema`
- "Clean" button runs the operation, produces cleaned output
- **Diff view**: show before/after side-by-side or unified, both Shiki-highlighted
  - Could use a simple diff library (e.g., `diff` npm package) to compute changes
  - Render additions/removals with color coding
- **Git context**: if repo, show current git status for the file before confirming
- **Apply button**: `PUT /api/files/:path` with cleaned content after user confirmation

## Step 9: Diff Preview Component

Reusable diff component for all mutating operations:

- Input: original text, modified text, file path
- Compute unified diff (using `diff` library)
- Render with Shiki highlighting + addition/removal gutters
- "Apply" and "Cancel" actions
- Git status badge (modified/untracked/clean) fetched from `/api/git/status`

## Step 10: CLI Entry Point + Prod Serving

Implement `bin/galaxy-tool-studio.ts`:

```
Usage: galaxy-tool-studio [options] <directory>

Options:
  -p, --port <port>   Server port (default: 3456)
  -h, --host <host>   Server host (default: 127.0.0.1)
  --open              Open browser on start
```

- In prod mode: Fastify serves built Vue assets from `dist/client/` via `@fastify/static`
- `package.json` bin entry: `"galaxy-tool-studio": "./dist/server/bin/galaxy-tool-studio.js"`
- Build script: `vite build` (client) + `tsc` (server)

## Step 11: Integration Tests

- Server route tests (vitest): mock filesystem, verify `/api/files` responses, path traversal rejection
- Git route tests: init a temp git repo, verify status/diff responses
- Client operation tests: import schema functions directly, verify validate/clean produce expected output on fixture workflows
- Use existing workflow fixtures from `packages/schema/test/fixtures/`

---

## Post-MVP (Not in Scope)

- Monaco editor embed with YAML language service + tool state completions
- Tool cache integration (cache coverage, populate, tool info sidebar)
- Normalize + convert operations (same pattern as clean — add when MVP is stable)
- Batch operations across all workflows in directory
- WebSocket file watching for auto-refresh
- Diagnostics dashboard (aggregate stats across all workflows)

## Unresolved Questions

1. PrimeVue unstyled theme — Tailwind-based preset or hand-rolled CSS?
2. Bundle strategy for schema/core in browser — tree-shaking Effect? It's large; may need to measure bundle size and decide if we need to split or lazy-load.
3. Shiki grammar — stock YAML sufficient or custom Galaxy workflow TextMate grammar for richer highlighting (e.g., tool_id references, $link markers)?
4. Install story — `npx @galaxy-tool-util/studio ./dir` or `pnpm dlx`? Need to test both work with the dual client/server build.
