# TS E2E Testing Plan — gxwf-ui + gxwf-web

**Goal**: Playwright-driven end-to-end tests exercising the Vue UI against a real `gxwf-web` backend rooted at an isolated, per-run fixture workspace. First pass covers clean, roundtrip, format conversions (both directions), and exports.

## Architectural Shape

One new package: **`packages/gxwf-e2e/`** (private, not published). Owns:
- Playwright config + test specs
- Fixture seed directory (committed)
- Backend + frontend lifecycle (start/stop)
- Per-suite workspace cloning helpers

Keeps playwright deps out of `gxwf-ui` (currently devDep-lean) and off the main release path.

## Locator Convention: `data-description`

Follow Galaxy's upstream convention — every UI element tests target gets a `data-description="..."` attribute with a human-readable name, not an opaque id. Examples:

```html
<Button data-description="run clean operation" .../>
<Checkbox data-description="clean dry-run toggle" .../>
<div data-description="clean result panel">...</div>
<Tab data-description="clean tab" value="clean">Clean</Tab>
```

Tests locate via `page.locator('[data-description="run clean operation"]')`. Rationale: readable, survives PrimeVue DOM changes, matches Galaxy's Selenium/Playwright patterns so the mental model ports.

A shared constants module (`packages/gxwf-e2e/src/locators.ts`) exports the strings used by both specs and component tests — one source of truth, catches typos at compile time.

## Fixture Workspace Strategy

### Seed layout (committed)

```
packages/gxwf-e2e/fixtures/workspace-seed/
  iwc/
    <selected IWC .ga files — copied, not submoduled>
    dirty-native.ga         # real IWC file, mutated to contain stale keys
  synthetic/
    simple-format2.gxwf.yml
    simple-format2-with-steps.gxwf.yml
  README.md                 # records IWC provenance (source path + commit sha)
```

**Why copy, not symlink or submodule**: tests mutate files; IWC lives outside the monorepo. Copying specific files gives reproducibility + keeps PRs reviewable.

### IWC workflow selection

Pick 2–3 small, representative `.ga` files from `/Users/jxc755/projects/repositories/iwc/workflows`. Criteria: few steps (fast to parse/roundtrip), no unusual tool versions, realistic tool_state encoding. I'll evaluate and pick during Step 3 and record provenance (IWC path + commit sha) in `fixtures/workspace-seed/README.md` so we can refresh intentionally.

### Synthetic fixtures (format2 only)

We have no production format2 workflows to draw from, so:
- `simple-format2.gxwf.yml` — minimal format2, 1–2 steps, used for format2→native conversion/export
- `simple-format2-with-steps.gxwf.yml` — multi-step variant for roundtrip-shaped coverage if needed

Native-side fixtures are **always real IWC workflows**, including the "dirty" one. `dirty-native.ga` is a real IWC file with a surgical mutation adding stale keys and/or legacy `tool_state` encoding so clean has something to do. Preferring real fixtures for native side so we catch realistic tool_state shapes.

### Per-suite cloning

Helper `cloneWorkspace(seed): tmpDir` — `fs.cpSync(seed, tmp, { recursive: true })` to `os.tmpdir()/gxwf-e2e-<uuid>/`. Called in `beforeAll` (or `beforeEach` when a suite mutates across tests). Each suite gets its own backend pointed at its clone. Cleanup in `afterAll`.

## Lifecycle

Playwright's `webServer` config is too coarse (single global server). Instead:

- Each `test.describe.serial` block spins its own backend on a random port via `createApp(tmpDir).listen(0)`, reads the assigned port, passes the base URL to the UI via query string.
- UI served from **pre-built `gxwf-ui/dist`** mounted via `createApp`'s `uiDir` option (already supported — `app.ts:23`). A global Playwright `globalSetup` runs `pnpm --filter @galaxy-tool-util/gxwf-ui build` once before the suite.
- A `TestHarness` class wraps: clone workspace → start backend → return `{ baseUrl, workspaceDir, stop() }`.

## Tooling Decisions

- **Playwright** (`@playwright/test`), chromium only in pass 1.
- **Browsers installed at monorepo root** (hoisted), not per-package.
- **File-system assertions** via `fs.promises` + YAML/JSON parse validators to catch malformed writes.
- **No visual regression** in pass 1 — functional assertions only.
- **Locators via `data-description`** (see above).

## Test Suites (Pass 1)

Each suite: clone seed → start backend → open UI → drive → assert on both UI state and on-disk filesystem state.

### 1. Clean workflow
- Open `dirty-native.ga`, open Clean tab
- Dry-run: click Run; assert report shows changes; assert file unchanged on disk
- Non-dry-run: uncheck dry-run, click Run; assert file on disk has cleaned content; assert workflow list refreshed

### 2. Roundtrip
- Open an IWC `.ga`, Roundtrip tab, Run
- Assert report renders with per-step status
- Assert original file unchanged

### 3. Convert .ga → format2
- Open an IWC `.ga`, Convert tab, non-dry-run
- Assert `.gxwf.yml` appears; original `.ga` removed
- Assert UI navigates/refreshes sensibly

### 4. Convert format2 → .ga (synthetic)
- Open `simple-format2.gxwf.yml`, Convert tab, non-dry-run
- Assert `.ga` written, `.gxwf.yml` removed

### 5. Export .ga → format2
- Open IWC `.ga`, Export tab, non-dry-run
- Assert both files present; new file parses as YAML

### 6. Export format2 → .ga
- Open `simple-format2.gxwf.yml`, Export tab
- Assert both files present; new `.ga` parses as JSON

Dashboard / file-browser tests out of scope for pass 1.

## Files / Packages to Add

```
packages/gxwf-e2e/
  package.json                      # private, playwright devDep
  playwright.config.ts
  tsconfig.json
  fixtures/workspace-seed/...       # committed
  src/
    harness.ts                      # TestHarness + cloneWorkspace
    locators.ts                     # data-description string constants
  tests/
    clean.spec.ts
    roundtrip.spec.ts
    convert.spec.ts                 # both directions
    export.spec.ts                  # both directions
  scripts/
    refresh-iwc.ts                  # opt-in helper to refresh chosen IWC files
  README.md                         # running + adding tests
```

UI edits:
- Add `data-description` attributes in `OperationPanel.vue`, `WorkflowList.vue`, `WorkflowView.vue` (tab triggers, run buttons, dry-run toggles, result containers). Strings imported from `gxwf-e2e/src/locators.ts` where practical (via devDep on the e2e package's locators module, or duplicated with a lint-style check — decide at implementation).

Root:
- `package.json` — add `test:e2e` script running `pnpm --filter @galaxy-tool-util/gxwf-e2e test`
- `Makefile` — `make test-e2e`; gated out of default `make test` (too slow for TDD loop)
- CI: separate GH Actions job, installs playwright chromium, runs after unit tests

## Implementation Order

1. Scaffold `packages/gxwf-e2e` + playwright config, no tests yet
2. Build `TestHarness` + `cloneWorkspace`; smoke-test by hitting `/workflows` over HTTP
3. Select IWC workflows, commit seed fixtures (synthetic format2 + chosen IWC files + mutated `dirty-native.ga`) — record provenance in README
4. Add `data-description` attributes to UI + locator constants module
5. Write `clean.spec.ts` (smallest surface) — get green end-to-end
6. Add roundtrip, convert, export specs
7. Hook into Makefile + CI workflow
8. Document in `packages/gxwf-e2e/README.md`

## Testing Strategy for the Plan Itself

- Red-to-green per spec: commit a failing assertion, then pass it.
- File-system assertions use `fs.readFileSync` + YAML/JSON parse matchers.
- Each spec in `test.describe.serial` with isolated workspace — no cross-test leakage.

## Resolved Decisions

- Locators: `data-description` (Galaxy convention), not `data-testid`.
- Browsers: hoisted at monorepo root.
- UI: pre-built once in global setup.
- Dirty native fixture: real IWC file, mutated.
- CI: chromium only in pass 1.
- Dashboard/file-browser: out of scope in pass 1.
- Synthetic fixtures live in `gxwf-e2e/fixtures/` for now; promote to `packages/schema/test/` only if duplicated.

## Remaining Open Items

- Exact IWC workflow selection — deferred to Step 3.
