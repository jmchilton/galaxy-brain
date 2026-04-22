# ESM Migration Blockers — galaxy-workflows-vscode

The project currently compiles all TypeScript to CommonJS (`"module": "commonjs"` in
`tsconfig.json`). Moving to native ESM output would require resolving the following.

---

## Blocker 1: `emitDecoratorMetadata` + `reflect-metadata`

The entire server layer uses Inversify 6.x for dependency injection, which relies on
TypeScript's legacy decorator transform (`experimentalDecorators: true`) and runtime
type reflection (`emitDecoratorMetadata: true`, `import "reflect-metadata"`).

`emitDecoratorMetadata` emits calls to `Reflect.defineMetadata()` that encode
constructor parameter types at runtime. This mechanism was designed for CJS and
depends on TypeScript emitting synchronous, ordered module evaluation — assumptions
that don't hold cleanly under native ESM (where modules are evaluated asynchronously
and in a different order).

To unblock ESM here you would need to either:
- Upgrade to Inversify 7.x+ which supports the new TC39 decorator proposal and drops
  `reflect-metadata`, OR
- Keep Inversify 6.x but maintain a separate `tsconfig.test.json` that overrides
  `module` for Jest only (fragile, two build graphs to maintain)

Inversify 8.0 is ESM-only and uses TC39 decorators. A migration from 6.x to 8.x is a
meaningful refactor across all server packages.

---

## Blocker 2: Dual build targets (Node + Web Worker)

The format2 server has two webpack entry points:
- `src/node/server.ts` — regular Node.js extension host
- `src/browser/server.ts` — Web Worker for vscode.dev

Both are bundled by webpack with `libraryTarget: "var"`. Webpack handles ESM/CJS
interop at bundle time, so the source module format is largely irrelevant to the
output — but switching the TypeScript source to ESM output would require auditing
both webpack configs and verifying the Web Worker target still builds correctly.
This is probably not a hard blocker by itself, but it's coupled to Blocker 1.

---

## Blocker 3: Jest / ts-jest CJS assumption

`ts-jest` compiles tests to CJS by default and the jest config passes
`compilerOptions` directly from `tsconfig.json` (which specifies `"module":
"commonjs"`). Running Jest in ESM mode requires:

- `NODE_OPTIONS=--experimental-vm-modules` (still experimental in Node 20/22)
- `ts-jest` configured with `useESM: true`
- `tsconfig.json` module changed to `node16` or `bundler`

All three interact with Blocker 1. Until Inversify is upgraded, the Jest CJS mode is
effectively forced.

---

## Current workaround

`@galaxy-tool-util/schema` is ESM-only and is needed in tests. Rather than committing
a static JSON Schema fixture, the test spawns a separate ESM Node process via
`execSync` to generate the schema at test time, sidestepping the CJS/ESM boundary
entirely. This is intentional and should be kept until a full ESM migration is done.

---

## Migration path (rough order)

1. Upgrade Inversify 6 → 8 across all server packages (drops `reflect-metadata`,
   adopts TC39 decorators)
2. Update `tsconfig.json`: `"module": "node16"` or `"bundler"`, drop
   `experimentalDecorators` / `emitDecoratorMetadata`
3. Configure ts-jest with `useESM: true` + `NODE_OPTIONS=--experimental-vm-modules`
4. Replace `execSync` schema generation in tests with a direct `import()`
5. Verify both webpack build targets still produce valid bundles
