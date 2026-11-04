# Test challenges debrief — galaxy#23964

Reviewed commit `9b8df5aa76e` (merge of dev `0073b5e9224` into PR head `b81b32379c4`). Diff: `git diff 0073b5e9224 9b8df5aa76e`.

## Tests in the PR

Both run green locally, one at a time (`npx vitest run ...` from `client/`):

- `client/packages/ui/src/styles/tokens.test.ts` — 8 passed.
- `client/src/style/tokensContract.test.ts` — 2 passed.

No API/integration/E2E tests touched or added.

## Per-test challenge

### `tokens.test.ts`

| Test | Verdict |
|---|---|
| ships a tokens.css generated from the current theme.css | Keep. Real drift guard for the generated artifact. |
| declares every shade of every color family as a literal | Keep. Carried over from old contract test; guards GButton's `var(--color-#{$color}-600)` loop. |
| keeps every deprecated grey shade pointing at its gray shade | Keep. Back-compat guard. |
| declares every semantic color, resolving to a hex color | Keep. Contract for the codemod/Tailwind names. |
| only references tokens it declares | Keep. |
| matches the Galaxy brand colors in brand-tokens | Keep. Cross-package data check, not implementation-testing. |
| X / X-foreground pairs >= 4.5:1 | Keep. Good, behavior-level a11y check on data. |
| input border >= 3:1 vs background | Keep. |

No mocks; nothing fakes layout. These are data-contract tests over CSS source, which is the right layer (no E2E could check all 54 palette shades + contrast cheaper).

Gaps:

- **Back-compat coverage regressed.** The old `tokensContract.test.ts` pinned `NON_PALETTE_TOKENS` (`--background-color`, `--font-size-*`, `--spacing*`, `--field-*`). The rewrite drops that list and `tokens.test.ts` never names any non-color token. Only `grey` aliases are guarded. Deleting or renaming `--font-size-small`, `--background-color`, or any `--field-*` token in `theme.css` (and regenerating) fails no test. 24 client files still use `var(--font-size-*)`, `var(--background-color)` or `var(--field-*)`. The PR description promises "every existing token keeps working"; that promise is untested for everything but the grey palette.
- `generateTokens` error branch (missing/odd `@theme` block) untested. Not worth a test.

### `tokensContract.test.ts`

| Test | Verdict |
|---|---|
| does not redeclare galaxy-ui tokens in custom_theme_variables.scss | Keep. Cheap single-source guard. |
| loads galaxy-ui's tokens in the analysis entry | Implementation test (string-contains on an import line). It does guard a real thing (removing the import would not break the build but would strip the palette). Optional: replace with an E2E computed-style assertion. |

Note: the alias regression the PR fixes in `vite.config.mjs` is already guarded by the production build (an unresolved `@galaxyproject/galaxy-ui/tokens.css` fails the build), so no test is needed for that specifically.

## Design / reuse

- `parseCustomProperties` (tokens.test.ts) and `declaredProperties` (tokensContract.test.ts) are two regex parsers of the same CSS custom-property syntax. `readTokenSources` already lives in `scripts/generateTokens.mjs` as a test-facing export; a `parseCustomProperties` export beside it would let both tests share one parser.
- `readTokenSources` is a test-only helper exported from a build script (justified in a comment: no Node types in the package; vitest empties CSS imports). Acceptable; flagging only that test-support code lives in the shipped script.

## E2E challenge

Feature is additive tokens with no template changes. Visual rendering is unchanged by design, so no new E2E flow is warranted. The one runtime claim not covered end to end is "the client loads tokens from the package". A one-assertion check is possible with existing protocol: `value_of_css_property` (Selenium and `PlaywrightElement`) uses `getComputedStyle(...).getPropertyValue`, which returns custom properties. E.g. in an existing smoke-level Selenium test, assert `driver.find_element("html").value_of_css_property("--color-primary")` resolves (non-empty). Low value given the build + source guard; optional.

## Test plan (recommendations, not applied)

1. Add a back-compat test to `tokens.test.ts` listing deprecated/legacy names that must stay declared: `--background-color`, `--font-size-small/medium/large`, `--spacing`, `--spacing-1..8`, `--field-height/padding-x/padding-y/radius-{small,medium,large}`. Assert each resolves via `resolveToken` (not just declared), so a chain to a removed token also fails.
2. Optional: export one `parseCustomProperties` from `scripts/generateTokens.mjs` and use it in both test files.
3. Optional: replace the import-string test with an E2E computed-style assertion on `--color-primary`.
