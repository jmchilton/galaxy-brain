# Initial review: galaxy#23964 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, effort set by coordinator
- Reviewed commit: `9b8df5aa76e` (John's merge of dev `0073b5e9224` into PR head `b81b32379c4`); diff reviewed is `git diff 0073b5e9224 9b8df5aa76e`

## Verdict

Approve-worthy. Net win for reuse: the client stops keeping a second hand-copied palette in `custom_theme_variables.scss` and loads galaxy-ui's `tokens.css`, which is now generated from one `theme.css`. Every old name survives as an alias, so no call sites break. No P1/P2 found; only P3 polish and forward-looking notes for the Tailwind follow-up.

## Checks run

- `npx vitest run packages/ui/src/styles/tokens.test.ts` -> 8 passed
- `npx vitest run src/style/tokensContract.test.ts` -> 2 passed
- `node packages/ui/scripts/generateTokens.mjs` -> no diff (committed `tokens.css` is current, including the merged `--field-*` tokens)
- prettier and eslint on the four new/changed JS/CSS files -> clean
- Grepped `client/src` for other declarations of `--color-*`, `--background-color`, `--font-size-*`, `--spacing*`, `--field-*`: none outside the moved block (only `--color-bright` in `ColorSelector.vue`), so the `html` -> `:root` selector change and the load order can't lose an override.
- `build.cssCodeSplit: false` folds everything into one `base.css`, so Mako pages that load only `base.css` (`message.mako`, `js-app.mako` with the `generic` entry) still get the tokens via the analysis entry's import.
- Bootstrap 4 `:root` vars (`--blue`, `--primary`, ...) don't collide with the `--color-*` names.
- Compiled `theme.css` with Tailwind 4.1.18 (from galaxy-brain's `site/node_modules`) to check the "same names work as Tailwind utilities later" claim: `bg-primary`, `text-muted-foreground`, `text-sm`, `p-2`, `bg-grey-100` all generate as expected. See P3 2 for one catch.

## Findings

### P3 1: Exact-match the package alias rather than listing each stylesheet subpath

`vite.config.mjs` fixes the prefix-match bug by adding one alias per stylesheet ahead of the package alias. That copies the `exports` map into the Vite config, so every future subpath export has to be added in both places. `./eslint` is already exported and still gets swallowed by the prefix alias. Nothing imports `@galaxyproject/galaxy-ui/theme.css` yet, so that alias has no user.

Suggested fix: switch `resolve.alias` to array form with an exact-match regex for the package root, e.g. `{ find: /^@galaxyproject\/galaxy-ui$/, replacement: resolve(__dirname, "packages/ui/src/index.ts") }`. Subpaths then resolve through the workspace symlink and `exports`, which `vitest.config.mts` already relies on (its comment: "galaxy-ui resolves through the workspace symlink and its exports map, so it needs no alias entry here"). Converting the object to an array touches the other alias entries, so if that's too much churn, at least drop the unused `theme.css` alias.

### P3 2: When Tailwind consumes `theme.css`, it will drop tokens no utility uses

Checked with Tailwind 4.1.18: a plain `@theme` block only emits the variables that generated utilities use. With `@tailwind utilities` and a handful of classes, the `:root` output held only those vars. `--field-*`, `--font-size-*`, `--background-color`, the `grey` aliases and any unused palette shade were dropped. The SCSS and galaxy-ui components read these through `var()`, not through utilities.

This has no effect today, because the client loads the generated `tokens.css`, which includes every token. But `theme.css` is exported and described as the Tailwind entry point for the RFC follow-up. If that follow-up swaps `tokens.css` for `theme.css`, those tokens disappear without any error.

Suggested fix: either use `@theme static { ... }` (the generator's `startsWith("@theme {")` check and `replace` would need updating), or add a note in the `theme.css` header that `tokens.css` must still be loaded alongside Tailwind. This could also wait for the Tailwind PR, but it's cheapest to note now.

### P3 3: Semantic values copied from Bootstrap have no drift guard against `blue.scss`

The old contract test made sure the client and the package agreed on the palette. The new semantic layer copies values from the Bootstrap theme with nothing tying them together:

| Token | Value | Bootstrap source |
|---|---|---|
| `--color-info` | `#2077b3` | `$brand-info` |
| `--color-secondary` | `#dee2e6` | `$brand-secondary` |
| `--color-primary` | `#25537b` | `$brand-primary` |
| `--color-danger` | `#e31a1e` | `$brand-danger` |
| `--color-foreground` | `#2c3143` | `$brand-dark` |

All live in `client/src/style/scss/theme/blue.scss`. The PR checks primary, foreground and highlight against `@galaxyproject/brand-tokens`, but not against the Bootstrap variables that most of today's UI still renders with. If `blue.scss` is retuned, the Bootstrap-styled UI and the semantic-token-styled UI drift apart and no test notices.

Suggested fix: in `tokensContract.test.ts`, add a case that parses the literal `$brand-*` hex values from `blue.scss` and compares them with `resolveToken` for the semantic names that are meant to equal them. `warning` should be left out, since `orange-600` (`#fe7e03`) is deliberately the closest shade, not the exact `$brand-warning` (`#fe7f02`).

### P3 4: `--color-accent` means different things in galaxy-ui and brand-tokens

`@galaxyproject/brand-tokens` (already a devDependency here) declares `--color-accent: #ffd700` (gold) on `:root`. galaxy-ui now declares `--color-accent` as the blue-100 hover surface, following shadcn. Nothing loads both on the same page today. But they are both Galaxy token sets meant for Galaxy web properties, and if they ever share a page, whichever loads last silently restyles the other's accents.

Suggested fix: no rename needed, since the shadcn naming is deliberate. Add a one-line comment next to `--color-accent` in `theme.css` noting that it differs from brand-tokens' `accent`, so nobody bridges the two sets naively.

### P3 5: The "loads galaxy-ui's tokens in the analysis entry" test is a source grep

`tokensContract.test.ts`'s second case asserts that `entry/analysis/index.ts` contains the literal import string. It guards against someone deleting the import, but it is brittle: it breaks on quote style or on moving the import to `App.vue`, and it proves nothing about the CSS actually reaching `base.css`. The first case (no redeclared tokens) is the valuable one. This is a nit: consider dropping the grep case or accepting it as a cheap tripwire.

## Notes (not findings)

- `generateTokens` slices from the first `@theme` occurrence. A future header comment that mentions "@theme" would make it throw (loudly, which is fine).
- `readTokenSources` is a test helper living in the build script. The comment explains why (no Node types in the package tsconfig); acceptable.
- The generated `tokens.css` still ships the Galaxy-app-only `.reset-theme-variables` selector to external consumers. This predates the PR.
