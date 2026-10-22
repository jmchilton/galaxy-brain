Learned a lot in the review - thanks so much! Filtered out agent findings to just the ones I thought looked useful but feel free to merge either way. -John

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at medium effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: Opus 5.5 · Effort: low · Reviewed: 9b8df5aa76e (PR head b81b32379c4 merged with dev 0073b5e9224)

The one-way risk is the semantic token vocabulary (`--color-background/foreground/card/muted/sidebar-*/accent/selected/primary/...`, Tailwind spellings `gray`/`--text-*`): it is the target name set for the coming Tailwind colour codemod and for `galaxy-ui` consumers, so once call sites and the Tool Shed adopt it, renaming or re-meaning a token gets expensive; the CSS plumbing itself is easy to revert.

<details><summary>Risk Details</summary>

- Semantic names and their meanings (`accent` = hover, `selected` = persistent selection, `secondary` = headers, `inverse`, `highlight`) become a de facto contract the codemod and future components will encode; several values are explicitly provisional ("open to tweaking").
- `galaxy-ui/tokens.css` and `theme.css` become package exports; external consumers (Tool Shed, plugins) may pin to them.
- Old names (`--color-grey-*`, `--font-size-*`, `--background-color`) survive as `var()` aliases with no removal plan; dropping them later is a breaking change for any third-party CSS that uses them.
- Token source of truth moves from the client SCSS to the package; the analysis entry must import `tokens.css` first. Pages only work because `cssCodeSplit: false` folds all entries' CSS into one `base.css`; changing that build setting would strip the palette from pages using the `generic` entry.
- `tokens.css` is generated but committed; drift is caught only by the vitest check, not a build step.
- New devDependency `@galaxyproject/brand-tokens` (test-only, `^0.1.0` range) ties token tests to an external 0.x package.
- Small visible changes possible: new values for `--color-input` (#8992b2) and `--color-info` (#2077b3) where they are adopted; existing palette values unchanged.

</details>

<details><summary>Risk Review Advice</summary>

Humans should mostly review the semantic token list in `client/packages/ui/src/styles/theme.css` as an API: are the names, the Galaxy additions (`selected`, `highlight`, `inverse`) and their mapped values ones the team wants the Tailwind migration to bake in? Deciding now is much cheaper than after the codemod lands.

Secondarily, confirm the single-`base.css` assumption (`cssCodeSplit: false` in `client/vite.config.mjs`) is intended to hold, since the palette now reaches non-analysis pages only through it, and decide whether the deprecated aliases need a documented removal timeline.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_23964_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_23964_review_0`](https://github.com/jmchilton/galaxy/tree/pr_23964_review_0) sits on the reviewed merge `9b8df5aa76e`. It restores the legacy-token guard that the `tokensContract.test.ts` rewrite dropped, and gives both token tests one shared parser and resolver in `generateTokens.mjs`. It pins the semantic colors copied from Bootstrap to `blue.scss` and guards against `--color-accent`-style name collisions with brand-tokens. It also makes `theme.css` a lossless Tailwind entry point with `@theme static`, replaces the per-stylesheet Vite aliases with an exact match on the package root, and documents `theme.css` as the token source in the galaxy-ui README. The generated `tokens.css` changes only by one comment line.

- [`d43a1822774`](https://github.com/jmchilton/galaxy/commit/d43a1822774) Guard legacy non-color galaxy-ui tokens: a `tokens.test.ts` case fails if `--background-color`, `--font-size-*`, `--spacing*` or `--field-*` stop resolving.
- [`7e123c379a7`](https://github.com/jmchilton/galaxy/commit/7e123c379a7) Share one custom-property parser across token tests: exports `parseCustomProperties` beside `readTokenSources`; `tokensContract.test.ts` drops its own regex and reads `tokens.css` through `readTokenSources`.
- [`759b0d74c5c`](https://github.com/jmchilton/galaxy/commit/759b0d74c5c) Pin semantic tokens to the Bootstrap theme colors they copy: a new `tokensContract.test.ts` case compares primary, secondary, success, info, danger and foreground with the matching `$brand-*` in `blue.scss`; `resolveToken` moves into the shared module.
- [`cd552e2b77f`](https://github.com/jmchilton/galaxy/commit/cd552e2b77f) Note --color-accent collision with brand-tokens: a `theme.css` comment, and a test that fails if galaxy-ui gains another name that brand-tokens also declares.
- [`61c7fbc4112`](https://github.com/jmchilton/galaxy/commit/61c7fbc4112) Use `@theme static` so Tailwind keeps every token: the generator accepts `@theme static {`; `tokens.css` is byte-identical.
- [`3d66e72d3a4`](https://github.com/jmchilton/galaxy/commit/3d66e72d3a4) Exact-match the galaxy-ui Vite alias: `resolve.alias` becomes an array with `/^@galaxyproject\/galaxy-ui$/`, so subpaths (including `./eslint`) resolve through the exports map.
- [`4be950dd91f`](https://github.com/jmchilton/galaxy/commit/4be950dd91f) Document theme.css as galaxy-ui's token source: the README names `theme.css` and `build:tokens`, and prefers semantic names.

</details>

</details>

### P3 4: `--color-accent` overrides brand-tokens' gold accent on every Tool Shed page (implementation verified)

`@galaxyproject/brand-tokens` declares `--color-accent: #ffd700` (gold). galaxy-ui now declares `--color-accent` as the blue-100 hover surface, following shadcn. The Tool Shed's `main.ts` imports `@galaxyproject/brand-tokens/tokens.css` and then `@galaxyproject/galaxy-ui/tokens.css`, both on `:root`, so galaxy-ui's value wins there today. Brand-tokens' `--color-accent-hover` stays gold-ish, so the pair no longer matches. Nothing in the Tool Shed reads `var(--color-accent)` yet, so nothing visible changes. The first consumer of either meaning will get the other one. It is the only name the two sets share.

<details><summary>Evidence</summary>

`lib/tool_shed/webapp/frontend/src/main.ts` imports `@galaxyproject/brand-tokens/tokens.css`, then `@galaxyproject/galaxy-ui/tokens.css`. Comparing the declared names in brand-tokens 0.1.0's `tokens.css` with galaxy-ui's gives exactly one overlap, `--color-accent`. Adding `--color-dark-bg` to `theme.css` makes the new overlap test fail with `expected [ '--color-accent', '--color-dark-bg' ] to deeply equal [ '--color-accent' ]`.

</details>

Renaming isn't necessary, since the shadcn naming is deliberate. Comment the collision in `theme.css`, and add a test that fails if galaxy-ui gains any other name that brand-tokens also declares.

Fixed on the review branch in [`cd552e2b77f`](https://github.com/jmchilton/galaxy/commit/cd552e2b77f).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 5: Two parsers for the same custom-property syntax (implementation verified)

`parseCustomProperties` in `tokens.test.ts` and `declaredProperties` in `tokensContract.test.ts` are separate regexes for `--name: value;`. `generateTokens.mjs` already exports `readTokenSources` for the tests. Export the parser (and `resolveToken`, which the Bootstrap guard in P3 3 also needs) beside it, so both tests share them.

Fixed on the review branch in [`7e123c379a7`](https://github.com/jmchilton/galaxy/commit/7e123c379a7).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 6: galaxy-ui README doesn't say `tokens.css` is generated (implementation verified)

This PR makes `tokens.css` a generated file, but the package README, which is galaxy-ui's onboarding doc, still points component authors only at `src/styles/tokens.css`. It doesn't name `theme.css` as the source or `build:tokens` as the regeneration step. Its `var(--color-blue-600)` example also contradicts `theme.css`'s new "prefer the semantic names" guidance.

Add a short "Design tokens" section naming `theme.css` as the file to edit and `build:tokens` as the regeneration step. Switch the example to a semantic name.

Fixed on the review branch in [`4be950dd91f`](https://github.com/jmchilton/galaxy/commit/4be950dd91f).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
