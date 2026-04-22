# VS Code Extension: ESM Testing Migration Plan

## Goal

Migrate the `server/` test suite from Jest+ts-jest (CJS) to Vitest (native ESM). This removes the
CJS-workaround stack added in Phase 2 Try 2 and aligns with the upstream `@galaxy-tool-util`
packages which already use Vitest.

## Background

The tsup migration commit (3400beb) moved the build to ESM (`module: ESNext`, `moduleResolution:
bundler`) but jest configs override back to CJS for tests. The Phase 2 Try 2 work added extra
workarounds on top:
- `transformIgnorePatterns` exemption for `@galaxy-tool-util/`
- `moduleNameMapper` entries for `@galaxy-tool-util/core` and `.js` → no-extension
- `moduleResolution: "node"` override (can't use `bundler` in jest)

Vitest is ESM-native and eliminates the entire workaround stack. It also makes the two
`execSync`-subprocess tests in format2 and native schema loader obsolete (they existed only
because Jest/CJS couldn't import ESM packages directly).

## Scope

Server only (`server/`). Client also uses Jest+CJS override but has no ESM dependency issues —
defer to a follow-up.

## Steps

### Step 1 — Install Vitest, remove Jest from server

**`server/package.json`:**
- Add devDependencies: `vitest`, `unplugin-swc`
- `@swc/core` is already present in root devDependencies; verify it's available
- Remove: `jest`, `ts-jest`, `jest-transform-yaml`
  - `@types/jest` lives in `server/packages/server-common/package.json` — remove it there

**Notes:**
- `unplugin-swc` is needed because Vitest's default esbuild transformer does not emit decorator
  metadata (`emitDecoratorMetadata`). Inversify's `@injectable()` + `@inject()` require it.
- `jest-transform-yaml` loaded `*.yaml` files as JS objects. No test file actually imports a `.yaml`
  module — the transform was vestigial. No replacement needed.

### Step 2 — Create `server/vitest.config.ts`

```typescript
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,            // describe/it/expect available without import
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/__tests__/*.+(ts|tsx|js)", "**/*.test.ts"],
  },
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: "typescript", decorators: true },
        transform: { decoratorMetadata: true },
        target: "es2019",
      },
    }),
  ],
  resolve: {
    alias: {
      "@schemas": path.resolve(__dirname, "../workflow-languages/schemas"),
    },
  },
});
```

### Step 3 — Create `server/vitest.setup.ts`

```typescript
import "reflect-metadata";
```

This replaces the per-file `import "reflect-metadata"` that many tests already have (they can
stay; double-importing is harmless, but the setup file handles files that forget).

### Step 4 — Update `server/package.json` test script

```json
"test": "vitest run"
```

### Step 5 — Remove / simplify `server/jest.config.js`

Either delete or replace with a stub that errors helpfully. The root-level `package.json` runs
tests via `cd server && npm test` so it will pick up vitest automatically.

Root `jest.config.js` (at project root) runs client tests only — leave it unchanged since the
client still uses Jest.

### Step 6 — Fix `execSync` workarounds in integration tests

Both of these tests spawn a subprocess to import ESM packages because Jest can't. With Vitest in
ESM mode, we can import them directly.

**`server/gx-workflow-ls-native/tests/integration/nativeSchemaLoader.test.ts`:**

Replace:
```typescript
const nativeWorkflowJsonSchema = JSON.parse(
  execSync(`node --input-type=module --eval "import { NativeGalaxyWorkflowSchema } ..."`).toString()
);
```
With:
```typescript
import { NativeGalaxyWorkflowSchema } from "@galaxy-tool-util/schema";
import { JSONSchema } from "effect";
const nativeWorkflowJsonSchema = JSONSchema.make(NativeGalaxyWorkflowSchema);
```

**`server/gx-workflow-ls-format2/tests/integration/jsonSchemaLoader.test.ts`:**

Same pattern for `GalaxyWorkflowSchema`.

Both tests already pass the schema as an override to the loader constructor, so the loader's own
`require()` calls are never exercised.

### Step 7 — Update `server/packages/server-common/tsconfig.json`

Remove `"jest"` from `types` array. Add `"vitest/globals"` if globals mode is used:

```json
"types": ["reflect-metadata", "vitest/globals", "node"]
```

### Step 8 — Clean up Phase 2 Try 2 Jest workarounds

Remove from `server/jest.config.js` (if keeping the file, else just delete it):
- `"^@galaxy-tool-util/core$"` moduleNameMapper entry
- `"^(\\.{1,2}/.*)\\.js$"` moduleNameMapper entry
- `transformIgnorePatterns`

These are all vicariously redundant with the vitest migration.

## Known Risks / Open Questions

1. **`@gxwf/*` deep imports** (`@gxwf/server-common/src/languageTypes`): These are symlinks in
   `node_modules/@gxwf/`. Vitest + Node resolution should follow symlinks fine, but watch for
   "dual package hazard" if a module is loaded twice (once via symlink, once via relative path).

2. **`require()` in schema loaders**: Both `gx-workflow-ls-native/src/schema/jsonSchemaLoader.ts`
   and `gx-workflow-ls-format2/src/schema/jsonSchemaLoader.ts` use `require("@galaxy-tool-util/schema")` for lazy sync loading. These functions are NOT called in tests (tests pass an override), so they don't break tests. Replacing them with async dynamic `import()` is a follow-up item.

3. **Decorator metadata across mixed packages**: Some packages in `node_modules/@gxwf/` are
   symlinked source. If SWC processes them, it should emit metadata. If they're excluded from
   transformation, metadata may be missing. May need to configure `exclude` carefully.

4. **Root `jest.config.js`**: Currently includes all `*.test.ts` files. If vitest is removed from
   Jest's scan, the root config may pick up server tests and fail. May need explicit `testPathIgnorePatterns` in root config to ignore `server/`.

## Test Acceptance Criteria

- `cd server && npm test` runs all 261 existing tests with vitest and all pass
- No `execSync` subprocess tests remain
- `jest-transform-yaml`, `ts-jest`, `@types/jest` removed from server dependencies
- `module: "commonjs"` no longer appears in any server test config
