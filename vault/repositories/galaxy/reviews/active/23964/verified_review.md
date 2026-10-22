### P2 1: Rewritten contract test no longer guards the legacy non-color tokens (implementation verified)

The old `tokensContract.test.ts` pinned `--background-color`, `--font-size-small/medium/large`, `--spacing`, `--spacing-1..8` and the twelve `--field-*` tokens. The rewrite dropped that list, and `tokens.test.ts` never names a non-color token. Only the `grey` aliases are guarded. The PR promises that every existing token keeps working, and client SCSS still reads these names, but deleting one from `theme.css` and regenerating fails no test.

<details><summary>Evidence</summary>

Deleting `--font-size-small` and `--field-radius-large` from `theme.css` and regenerating: all 8 original `tokens.test.ts` cases still pass. With the new case added, it fails with `expected [ '--font-size-small', '--field-radius-large' ] to deeply equal []`.

</details>

Add a `tokens.test.ts` case that lists the legacy names and asserts each one resolves through `resolveToken`, so a deprecated alias whose target was removed also fails.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: As a Tailwind input, `theme.css` would drop every token that no utility uses (implementation verified)

`theme.css` is exported and presented as the Tailwind entry point for the RFC follow-up. A plain `@theme` block only emits the variables that generated utilities reference. The galaxy-ui components and client SCSS read `--field-*`, `--font-size-*`, `--background-color` and most palette shades through `var()`, not through utilities. If the follow-up swaps `tokens.css` for `theme.css`, those tokens disappear without any error. `@theme static` is Tailwind's option for emitting every variable.

<details><summary>Evidence</summary>

Compiled `theme.css` plus `@tailwind utilities` with Tailwind 4.1.18, using the candidates `bg-primary p-2 text-sm`. With `@theme {`, `--field-height-medium`, `--font-size-small`, `--background-color` and `--color-red-100` were all absent from the output. With `@theme static {`, all of them were present.

</details>

Switch to `@theme static {` and have `generateTokens.mjs` accept it. The generated `tokens.css` stays byte-identical.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: Per-stylesheet Vite aliases duplicate the exports map, and `./eslint` is still swallowed (implementation verified)

Because Vite aliases match by prefix, the fix adds one alias per stylesheet ahead of the package alias. That means every new subpath export has to be added in two places. `./eslint` is already exported and still resolves to `packages/ui/src/index.ts/eslint`. Nothing imports `@galaxyproject/galaxy-ui/theme.css`, so its alias has no user.

<details><summary>Evidence</summary>

Called `server.pluginContainer.resolveId` from `src/entry/analysis/index.ts` with the PR's config: `@galaxyproject/galaxy-ui/eslint` resolved to `./packages/ui/src/index.ts/eslint`. After the change, the package root still resolves to `src/index.ts`, `tokens.css` and `theme.css` resolve to `src/styles/`, `eslint` resolves to `eslint.mjs`, and `galaxy-api-client` and `vue` are unchanged.

</details>

Use array form with an exact-match regex for the package root, `{ find: /^@galaxyproject\/galaxy-ui$/, ... }`. Subpaths then resolve through the workspace symlink and the `exports` map, which is what `vitest.config.mts` already relies on.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 3: No guard ties the semantic colors to the Bootstrap values they copy (implementation verified)

`--color-primary`, `secondary`, `success`, `info`, `danger` and `foreground` equal `$brand-primary`, `secondary`, `success`, `info`, `danger` and `dark` in `client/src/style/scss/theme/blue.scss`. Most of today's UI still renders through those Bootstrap variables. If either side is retuned, the Bootstrap-styled UI and the token-styled UI drift apart and no test notices. `warning` is deliberately close but not equal (`orange-600` `#fe7e03` vs `#fe7f02`).

<details><summary>Evidence</summary>

Changing `$brand-info` to `#2078b3` passes the PR's tests. The new case fails with `$brand-info: expected '#2077b3' to be '#2078b3'`.

</details>

Add a `tokensContract.test.ts` case that parses the literal `$brand-*` hex values from `blue.scss` and compares each with the resolved semantic token, leaving out `warning`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 4: `--color-accent` overrides brand-tokens' gold accent on every Tool Shed page (implementation verified)

`@galaxyproject/brand-tokens` declares `--color-accent: #ffd700` (gold). galaxy-ui now declares `--color-accent` as the blue-100 hover surface, following shadcn. The Tool Shed's `main.ts` imports `@galaxyproject/brand-tokens/tokens.css` and then `@galaxyproject/galaxy-ui/tokens.css`, both on `:root`, so galaxy-ui's value wins there today. Brand-tokens' `--color-accent-hover` stays gold-ish, so the pair no longer matches. Nothing in the Tool Shed reads `var(--color-accent)` yet, so nothing visible changes. The first consumer of either meaning will get the other one. It is the only name the two sets share.

<details><summary>Evidence</summary>

`lib/tool_shed/webapp/frontend/src/main.ts` imports `@galaxyproject/brand-tokens/tokens.css`, then `@galaxyproject/galaxy-ui/tokens.css`. Comparing the declared names in brand-tokens 0.1.0's `tokens.css` with galaxy-ui's gives exactly one overlap, `--color-accent`. Adding `--color-dark-bg` to `theme.css` makes the new overlap test fail with `expected [ '--color-accent', '--color-dark-bg' ] to deeply equal [ '--color-accent' ]`.

</details>

Renaming isn't necessary, since the shadcn naming is deliberate. Comment the collision in `theme.css`, and add a test that fails if galaxy-ui gains any other name that brand-tokens also declares.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 5: Two parsers for the same custom-property syntax (implementation verified)

`parseCustomProperties` in `tokens.test.ts` and `declaredProperties` in `tokensContract.test.ts` are separate regexes for `--name: value;`. `generateTokens.mjs` already exports `readTokenSources` for the tests. Export the parser (and `resolveToken`, which the Bootstrap guard in P3 3 also needs) beside it, so both tests share them.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 6: galaxy-ui README doesn't say `tokens.css` is generated (implementation verified)

This PR makes `tokens.css` a generated file, but the package README, which is galaxy-ui's onboarding doc, still points component authors only at `src/styles/tokens.css`. It doesn't name `theme.css` as the source or `build:tokens` as the regeneration step. Its `var(--color-blue-600)` example also contradicts `theme.css`'s new "prefer the semantic names" guidance.

Add a short "Design tokens" section naming `theme.css` as the file to edit and `build:tokens` as the regeneration step. Switch the example to a semantic name.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
