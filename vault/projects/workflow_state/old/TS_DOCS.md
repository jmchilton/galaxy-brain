# galaxy-tool-util Documentation Plan

Docsify + TypeDoc setup for `jmchilton.github.io/galaxy-tool-util`. Mirrors the approach used in [gh-ci-artifacts](https://github.com/jmchilton/gh-ci-artifacts): hand-written markdown guides via docsify, auto-generated API reference via TypeDoc, deployed to GitHub Pages.

## Phase 1: Infrastructure Setup

### 1a. Install devDependencies (root)

```bash
pnpm add -Dw typedoc docsify-cli
```

### 1b. Add root scripts to `package.json`

```json
"docs:api": "typedoc",
"docs:dev": "pnpm docsify serve docs",
"docs:build": "pnpm run build && pnpm run docs:api"
```

### 1c. Create `typedoc.json` at root

Monorepo-aware config using `entryPointStrategy: "packages"`.

```json
{
  "entryPoints": ["packages/schema", "packages/core", "packages/cli", "packages/server"],
  "entryPointStrategy": "packages",
  "out": "docs/api/typedoc",
  "json": "docs/api/typedoc.json",
  "name": "galaxy-tool-util API",
  "excludePrivate": true,
  "excludeInternal": true,
  "readme": "none",
  "hideGenerator": false
}
```

### 1d. Add `docs/api/typedoc/` to `.gitignore`

TypeDoc HTML is regenerated in CI — don't commit it. The JSON output (`docs/api/typedoc.json`) can optionally be committed for reference.

---

## Phase 2: Docsify Shell

### 2a. `docs/index.html` — SPA entry point

Docsify v4 via CDN. Plugins: search, copy-code, emoji, Prism syntax highlighting (bash, typescript, json, yaml).

```javascript
window.$docsify = {
  name: 'galaxy-tool-util',
  repo: 'jmchilton/galaxy-tool-util',
  homepage: 'README.md',
  loadSidebar: '_sidebar.md',
  loadNavbar: '_navbar.md',
  coverpage: '_coverpage.md',
  autoHeader: true,
  maxLevel: 3,
  subMaxLevel: 2,
  search: {
    maxAge: 86400000,
    paths: 'auto',
    placeholder: 'Search documentation...',
    noData: 'No results found'
  },
  copyCode: {
    buttonText: 'Copy',
    errorText: 'Error',
    successText: 'Copied!'
  }
}
```

### 2b. `docs/_coverpage.md`

```markdown
# galaxy-tool-util

> TypeScript toolkit for Galaxy tool metadata — cache, validate, and serve tool schemas

`schema` · `core` · `cli` · `server`

[Get Started](getting-started.md)
[API Reference](api/README.md)
[GitHub](https://github.com/jmchilton/galaxy-tool-util)
```

### 2c. `docs/_navbar.md`

```markdown
- [GitHub](https://github.com/jmchilton/galaxy-tool-util)
- [npm](https://www.npmjs.com/org/galaxy-tool-util)
```

### 2d. `docs/_sidebar.md`

```markdown
- [Home](/)
- [Getting Started](getting-started.md)
- **Packages**
  - [Schema](packages/schema.md)
  - [Core](packages/core.md)
  - [CLI](packages/cli.md)
  - [Server](packages/server.md)
- **Guides**
  - [Workflow Validation](guide/workflow-validation.md)
  - [Tool Caching](guide/tool-caching.md)
  - [Proxy Server Setup](guide/proxy-server.md)
  - [Configuration](guide/configuration.md)
- **Architecture**
  - [Overview](architecture/overview.md)
  - [Parameter Schema System](architecture/parameter-schemas.md)
  - [Effect Schema Usage](architecture/effect-schema.md)
- **API Reference**
  - [Overview](api/README.md)
  - [TypeDoc Reference](api/typedoc/index.html)
- **Development**
  - [Contributing](development/contributing.md)
  - [Testing](development/testing.md)
  - [Building](development/building.md)
```

---

## Phase 3: Hand-Written Documentation Pages

### 3a. `docs/README.md` — Landing page

- What galaxy-tool-util is (TS port of Galaxy tool_util concepts)
- Package overview table: name, purpose, npm badge
- Quick install snippet
- Quick example (cache a tool, validate a workflow)

### 3b. `docs/getting-started.md`

- Prerequisites (Node >= 22, pnpm)
- Install packages: `pnpm add @galaxy-tool-util/cli` etc.
- First use walkthrough:
  - Cache a tool from ToolShed
  - Export a JSON Schema for tool parameters
  - Validate a workflow file

### 3c. Package docs (`docs/packages/`)

**`schema.md`**
- What Effect Schemas are generated and why
- State representations (`workflow_step`, `workflow_step_linked`, etc.) — what each means
- `createFieldModel()` usage with examples
- Parameter types supported (with registry pattern explanation)
- Workflow schemas: `GalaxyWorkflowSchema`, `NormalizedFormat2WorkflowSchema`, `NormalizedNativeWorkflowSchema`
- Workflow normalization/expansion utilities

**`core.md`**
- `ToolCache` — constructor options, cache dir conventions, env vars
- `ToolInfoService` — high-level fetch-with-cache, tool source resolution
- `ParsedTool` shape and what each field means
- Fetching from ToolShed vs Galaxy — `fetchFromToolShed()`, `fetchFromGalaxy()`
- Cache index and `cacheKey()` conventions
- `parseToolshedToolId()` and `toolIdFromTrs()` utilities

**`cli.md`**
- `galaxy-tool-cache` binary overview
- Each command with full usage:
  - `add <tool_id>` — fetch and cache (--version, --cache-dir, --galaxy-url)
  - `list` — list cached tools (--json, --cache-dir)
  - `info <tool_id>` — show metadata (--version, --cache-dir)
  - `clear [prefix]` — clear cache (--cache-dir)
  - `schema <tool_id>` — export JSON Schema (--version, --representation, --output, --cache-dir)
  - `validate-workflow <file>` — validate workflow (--format, --no-tool-state, --cache-dir, --mode, --tool-schema-dir)
- Example output for each command

**`server.md`**
- `galaxy-tool-proxy` binary overview
- YAML config file format (`ServerConfig` shape)
- `galaxy.workflows.toolSources` — ToolShed vs Galaxy sources
- `galaxy.workflows.toolCache.directory` — cache dir override
- Routes: `GET /api/tools`, `GET /api/tools/:trs_id/versions/:version`, `GET /api/tools/:trs_id/versions/:version/schema`, `DELETE /api/tools/cache`
- CORS behavior
- Use case: sidecar for Galaxy workflow editor

### 3d. Guide docs (`docs/guide/`)

**`workflow-validation.md`**
- End-to-end: load workflow -> resolve tools -> validate tool_state
- JSON Schema mode (`--mode jsonschema`) vs Effect-based validation
- Handling format2 vs native workflows
- Async external ref expansion (`expandedFormat2`, `expandedNative`)
- Common validation errors and what they mean

**`tool-caching.md`**
- Why caching matters (ToolShed rate limits, offline use, CI)
- Cache directory layout and index file
- Env vars: `GALAXY_TOOL_CACHE_DIR`, `GALAXY_TOOLSHED_URL`
- Pre-populating cache for CI/CD
- Cache invalidation / clearing

**`proxy-server.md`**
- Use case: Galaxy workflow editor needs tool schemas but can't query ToolShed directly
- Config file walkthrough with annotated example
- Running `galaxy-tool-proxy` with custom config
- Multiple tool sources (ToolShed + Galaxy instance)
- Integrating with Galaxy's workflow editor

**`configuration.md`**
- All env vars in one place
- All CLI flags by command
- YAML config keys for server
- Defaults and precedence

### 3e. Architecture docs (`docs/architecture/`)

**`overview.md`**
- Monorepo structure diagram
- Package dependency graph: `schema` <- `core` <- `cli`, `server`
- Data flow: ToolShed API -> ParsedTool -> ToolCache -> Effect Schema -> JSON Schema -> validation
- Design goals: offline-first, Galaxy-compatible, schema-driven

**`parameter-schemas.md`**
- `schema-sources/` YAML definitions -> Effect Schema pipeline
- Generator/registry pattern (`ParameterSchemaGenerator`, `GeneratorContext`)
- How new parameter types are added
- State representations and why they exist
- `DynamicSchemaInfo` and conditional schema generation

**`effect-schema.md`**
- Why Effect Schema over Zod/io-ts/etc.
- Patterns used: `S.Struct`, `S.Union`, `S.optional`, branded types
- JSON Schema export via `JSONSchema.make()`
- Runtime validation + static type inference
- Effect ecosystem integration points

### 3f. Development docs (`docs/development/`)

**`contributing.md`**
- Clone, `pnpm install`, `pnpm build`, `pnpm test`
- Branch/PR conventions
- Changeset workflow for versioning

**`testing.md`**
- Vitest setup and config
- Fixture syncing from Galaxy/gxformat2 repos (Makefile targets: `sync-golden`, `sync-param-spec`, `sync-workflow-fixtures`)
- Golden tests and how to update them
- Parameter spec tests

**`building.md`**
- Build order (schema -> core -> cli/server)
- TypeScript config (ES2022, Node16 module)
- Output structure (`dist/` with declarations + source maps)
- Changesets: `pnpm changeset`, `pnpm version-packages`, `pnpm release`

### 3g. API bridge docs (`docs/api/`)

**`README.md`**
- Overview of exported APIs per package
- Key type signatures and brief descriptions
- Link to TypeDoc HTML: `[Full API Reference](typedoc/index.html)`

---

## Phase 4: TSDoc Comment Enrichment

Improve source comments so TypeDoc output is useful. Focus on barrel exports and public API surfaces.

- [ ] `packages/schema/src/index.ts` — `@module` doc, one-liner per export
- [ ] `packages/core/src/index.ts` — `@module` doc, one-liner per export
- [ ] `packages/cli/src/index.ts` — `@param` and `@example` on each command function
- [ ] `packages/server/src/index.ts` — document config types and server creation
- [ ] Audit existing JSDoc in key files (base.ts, tool-id.ts, model-factory.ts) — already good, just verify TypeDoc renders them

---

## Phase 5: GitHub Pages Deployment

### 5a. `.github/workflows/docs.yml`

```yaml
name: Generate Docs

on:
  push:
    branches: [main]
    paths:
      - 'packages/**'
      - 'docs/**'
      - 'package.json'
      - 'typedoc.json'
      - '.github/workflows/docs.yml'

jobs:
  generate:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run docs:build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

### 5b. Enable GitHub Pages

Set repo settings to serve from `gh-pages` branch. Site at `jmchilton.github.io/galaxy-tool-util`.

---

## Phase 6: Verify & Polish

- [ ] Run `pnpm docs:dev` locally, walk every sidebar link
- [ ] Verify TypeDoc generates cleanly for all 4 packages (monorepo `packages` strategy)
- [ ] Test docsify search across all pages
- [ ] Add `.nojekyll` file to `docs/` (required for docsify on GitHub Pages)
- [ ] Consider adding CLI output screenshots or terminal recordings

---

## Implementation Order

| Step | What | Effort |
|------|------|--------|
| 1 | Infrastructure: deps, scripts, typedoc.json, .gitignore (Phase 1) | S |
| 2 | Docsify shell: index.html, coverpage, sidebar, navbar (Phase 2) | S |
| 3 | Landing page + getting-started (3a, 3b) | M |
| 4 | Package docs: schema, core, cli, server (3c) | M |
| 5 | Guide docs: validation, caching, proxy, config (3d) | M |
| 6 | Architecture docs: overview, param schemas, Effect (3e) | M |
| 7 | Dev docs: contributing, testing, building (3f) | S |
| 8 | API bridge + TSDoc enrichment (3g, Phase 4) | M |
| 9 | CI deployment workflow (Phase 5) | S |
| 10 | Polish + verify (Phase 6) | S |

---

## File Tree (final state)

```
docs/
  index.html
  _coverpage.md
  _sidebar.md
  _navbar.md
  .nojekyll
  README.md
  getting-started.md
  packages/
    schema.md
    core.md
    cli.md
    server.md
  guide/
    workflow-validation.md
    tool-caching.md
    proxy-server.md
    configuration.md
  architecture/
    overview.md
    parameter-schemas.md
    effect-schema.md
  api/
    README.md
    typedoc/          (gitignored, generated)
    typedoc.json      (generated, optionally committed)
  development/
    contributing.md
    testing.md
    building.md
typedoc.json          (root config)
.github/workflows/docs.yml
```

---

## Unresolved Questions

1. Cross-link to Galaxy training materials or Galaxy tool XML schema docs?
2. `schema-sources/` YAML files — worth a dedicated docs section explaining the Galaxy parameter type system, or covered sufficiently by `architecture/parameter-schemas.md`?
3. Should TypeDoc JSON (`docs/api/typedoc.json`) be committed for searchability, or gitignored with the HTML?
4. Any plans for a VS Code extension or other consumers that should be documented as integration targets?
