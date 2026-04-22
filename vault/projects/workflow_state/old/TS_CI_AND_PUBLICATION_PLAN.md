# CI & Publication Plan: galaxy-tool-util-ts

**Repo:** `jmchilton/galaxy-tool-util-ts`
**Monorepo:** pnpm workspaces, 4 packages (`@galaxy-tool-util/{schema,core,cli,server}`)
**Stack:** TypeScript 6, Effect 3, Vitest 4, ESLint 10 flat config, Prettier

---

## Phase 1: CI Foundation

### 1.1 Composite Setup Action

Create `.github/actions/setup/action.yml` -- shared setup used by all workflows.

```yaml
name: "Setup"
description: "Install pnpm, Node.js, and dependencies"
inputs:
  node-version:
    default: "22"
runs:
  using: composite
  steps:
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: pnpm
    - run: pnpm install --frozen-lockfile
      shell: bash
```

### 1.2 CI Workflow (`.github/workflows/ci.yml`)

Triggers: push to `main`, all PRs.

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup
      - run: pnpm lint
      - run: pnpm format

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup
      - run: pnpm build
      - run: pnpm test
```

Three parallel jobs: lint+format, typecheck, build+test. With 4 packages and 2087 tests this should complete in under 2 minutes.

---

## Phase 2: Linting & Formatting

### 2.1 Current Setup

- ESLint 10 flat config + `typescript-eslint`
- Prettier for formatting
- `@typescript-eslint/no-explicit-any: off` -- reasonable for Effect code with heavy generics

### 2.2 Recommended ESLint Additions

Consider enabling these `typescript-eslint` rules project-wide:

```js
"@typescript-eslint/no-floating-promises": "error",      // critical for Effect code
"@typescript-eslint/consistent-type-imports": "error",    // tree-shaking + clarity
"@typescript-eslint/no-misused-promises": "error",        // async footgun prevention
```

`no-floating-promises` is especially important in an Effect codebase -- it catches accidentally dropped Effects that look like Promises.

### 2.3 Root-Level Configs

Move ESLint config to a single root `eslint.config.js` instead of duplicating in each package. ESLint 10 flat config supports this natively -- the root config can target `packages/*/src/**` and `packages/*/test/**`.

---

## Phase 3: Testing Enhancements

### 3.1 Current State

- Vitest 4.1.2 with per-package `vitest.config.ts`
- 2087 tests passing
- No coverage reporting

### 3.2 Vitest Workspace Config

Migrate to Vitest 3.2+ `projects` pattern -- single root config:

```ts
// vitest.config.ts (root)
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["packages/*/src/**"],
    },
  },
});
```

Each package keeps a `vitest.config.ts` but uses `defineProject()` instead of `defineConfig()`.

### 3.3 Coverage in CI

Add coverage reporting to the test job:

```yaml
- run: pnpm vitest run --coverage
- uses: actions/upload-artifact@v4
  with:
    name: coverage
    path: coverage/
```

Optional: add Codecov or Coveralls integration. Not critical for a project this size but useful for PR review.

### 3.4 @effect/vitest

Consider adopting `@effect/vitest` for tests that construct Effect pipelines. Provides `it.effect()` and `it.layer()` helpers that auto-provide `TestContext` (TestClock, TestRandom, etc). Not required if current test patterns are working, but reduces boilerplate for Effect-heavy tests.

---

## Phase 4: Publication

### 4.1 Package Preparation

Before first publish, update each `package.json`:

```jsonc
{
  "name": "@galaxy-tool-util/schema",
  "version": "0.1.0",           // reset to 0.x for initial development
  "license": "ISC",
  "repository": {
    "type": "git",
    "url": "https://github.com/jmchilton/galaxy-tool-util-ts",
    "directory": "packages/schema"
  },
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md", "LICENSE"]
}
```

Key changes:
- Add `exports` field (modern Node.js resolution)
- Add `files` whitelist (keeps published package lean)
- Add `publishConfig.access: public` (required for scoped packages)
- Add `publishConfig.provenance: true`
- Add `repository` with `directory` for monorepo linking

### 4.2 Changesets Integration

Install and configure:

```bash
pnpm add -Dw @changesets/cli @changesets/changelog-github
pnpm changeset init
```

`.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": [
    "@changesets/changelog-github",
    { "repo": "jmchilton/galaxy-tool-util-ts" }
  ],
  "commit": false,
  "fixed": [],
  "linked": [
    ["@galaxy-tool-util/schema", "@galaxy-tool-util/core", "@galaxy-tool-util/cli", "@galaxy-tool-util/server"]
  ],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch"
}
```

The `linked` config means all packages share the same version number -- a bump to any one bumps them all. This is simpler for a small, tightly-coupled monorepo. Switch to independent versioning later if packages diverge in stability.

Add root scripts:

```json
{
  "changeset": "changeset",
  "version-packages": "changeset version",
  "release": "pnpm build && changeset publish"
}
```

### 4.3 npm Trusted Publishing (OIDC)

**This is now mandatory** -- classic npm tokens were deprecated December 2025.

Setup steps:

1. **npmjs.com:** Org `galaxy-tool-util` created. Go to package settings > Trusted Publishers > Add GitHub Actions.
   - Repository: `jmchilton/galaxy-tool-util-ts`
   - Workflow: `release.yml`
   - Environment: `npm-publish`

2. **GitHub:** Create environment `npm-publish` in repo settings. Add any required reviewers for gated releases.

3. **No tokens needed.** The OIDC exchange handles auth at publish time.

### 4.4 Release Workflow (`.github/workflows/release.yml`)

```yaml
name: Release
on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write
  id-token: write          # required for trusted publishing

jobs:
  release:
    runs-on: ubuntu-latest
    environment: npm-publish
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup

      - name: Build
        run: pnpm build

      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm release
          title: "chore: version packages"
          commit: "chore: version packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_CONFIG_PROVENANCE: true
```

**How it works:**
1. Dev creates changeset: `pnpm changeset` (interactive, picks packages + bump type)
2. Changeset file committed with PR
3. On merge to `main`, the action detects pending changesets and opens a "Version Packages" PR with bumped versions + CHANGELOGs
4. When that PR is merged, the action runs `pnpm release` which builds and publishes to npm with provenance attestations

---

## Phase 5: Additional CI Workflows

### 5.1 Dependency Review (`.github/workflows/dependency-review.yml`)

Catch vulnerable or license-incompatible deps in PRs:

```yaml
name: Dependency Review
on: pull_request

permissions:
  contents: read

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: moderate
          deny-licenses: GPL-3.0, AGPL-3.0
```

### 5.2 Lockfile Integrity

Add to CI workflow:

```yaml
- run: pnpm install --frozen-lockfile
```

Already included in setup action. This ensures no lockfile drift -- CI fails if `pnpm-lock.yaml` is out of sync with `package.json` files.

---

## Implementation Order

| Step | What                                                     | Effort | Blocked By | Status                                                                          |
| ---- | -------------------------------------------------------- | ------ | ---------- | ------------------------------------------------------------------------------- |
| 1    | Create composite setup action                            | 15m    | --         | DONE                                                                            |
| 2    | Create CI workflow (lint, typecheck, test)               | 30m    | 1          | DONE                                                                            |
| 3    | Root ESLint config consolidation                         | 20m    | --         | DONE                                                                            |
| 4    | Add recommended ESLint rules                             | 15m    | 3          | DONE                                                                            |
| 5    | Vitest workspace migration                               | 20m    | --         | DONE                                                                            |
| 6    | Coverage reporting in CI                                 | 15m    | 2, 5       | DONE (config only, not wired to CI reporter yet)                                |
| 7    | Package.json preparation (exports, files, publishConfig) | 30m    | --         | DONE                                                                            |
| 8    | Changesets integration                                   | 20m    | 7          | DONE                                                                            |
| 9    | npm trusted publishing setup                             | 30m    | 8          | MANUAL: create `npm-publish` env in GitHub + add trusted publisher on npmjs.com |
| 10   | Release workflow                                         | 20m    | 2, 9       | DONE (workflow created, needs step 9 manual config to function)                 |
| 11   | Dependency review workflow                               | 10m    | --         | DONE                                                                            |

Steps 1-2 are the critical path for basic CI. Steps 7-10 are the critical path for publication. Steps 3-6 and 11 can be done independently.

### Additional work completed (2026-03-30)
- Migrated all `@effect/schema` imports to `effect/Schema`, removed `@effect/schema` dependency
- Fixed pre-existing build errors from `@effect/schema/JSONSchema` vs `effect/JSONSchema` type mismatch
- Added ISC LICENSE file and per-package README stubs
- Added `"type": "module"` to root package.json
- Fixed `no-misused-promises` lint violation in server `createProxyServer`
- Updated tests that expected JSON Schema generation failure (now succeeds with `effect/JSONSchema`)

---

## Unresolved Questions

- ~~Org scope: publish as `@galaxy-tool-util/*` or different scope?~~ **Resolved:** npm org `galaxy-tool-util` created
- ~~Version strategy: start at `0.1.0` (pre-stable) or `1.0.0`?~~ **Resolved:** `0.1.0`
- ~~Linked vs independent versioning?~~ **Resolved:** linked versioning via changesets
- ~~Node version matrix?~~ **Resolved:** Node 22 only (configurable via setup action input)
- CLI distribution: publish `@galaxy-tool-util/cli` to npm only, or also build standalone binaries (via `pkg`, `bun build --compile`, or `esbuild`)?
- Automated dependency updates: enable Dependabot or Renovate? Renovate has better monorepo grouping
- GitHub branch protection: require CI pass before merge to `main`?
