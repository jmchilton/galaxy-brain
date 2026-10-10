# publicClasses

Selected originator: `client/packages/ui/src/publicClasses.test.ts`. Baseline **4 tests** → final **6 tests**. The client `vitest.config.mts` includes `packages/*/src/**/*.test.*`, so the suite runs from `client/` like any other.

The file was already readable, and the change is deliberately small. The last case packed three components into one test, using inline `mount(...).find(...).exists()` chains. It is now three cases, "GButton: g-button, g-transparent", "GLink: g-link" and "GDropdownItem: dropdown-item", so each class group fails on its own and each mount gets a named wrapper. The four `as object` casts on `mount` (GTable, GButton, GLink, GDropdownItem) are gone. The package's own type-check accepts the component props without them, and a deliberate wrong prop type fails it.

Preserved: every class in the package README's "Public class names" table is still asserted. GTabs, GTable and GFormLabel/GFormInput are untouched. `g-button` and `g-transparent` still go through `arrayContaining`, `g-link` through `toContain`, and `dropdown-item` through `exists()`. The test names still list the class names they guard. The README table's GButton/GLink/GDropdownItem row now maps to three tests, and the README itself is unchanged.

Reuse: none needed. It's a plain VTU package test, and the package can't import client test helpers.

Validation: 6 tests pass, shuffled (seed `370101`). ESLint and Prettier pass. `vue-tsc --noEmit -p packages/ui/tsconfig.json` passes; that config covers the package's tests and the client tsconfig doesn't. Full client `vue-tsc --noEmit` also passes.

Guidance: none.
