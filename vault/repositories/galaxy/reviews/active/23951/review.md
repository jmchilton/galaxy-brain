# galaxy#23951 - Add a CI check against full stylesheet imports in components

- PR: https://github.com/galaxyproject/galaxy/pull/23951 (dannon, +43/-1, 3 files, not draft)
- Head reviewed: `66e01e4015adf5f7918214cbd751ddd498d28dbf`
- Base: merge-base with `origin/dev` (`02a2e659909` era)
- Worktree: `~/projects/worktrees/galaxy/pr/23951`
- Status: review drafted, not posted

## Summary

Follow-up to #23703, which removed four `base.scss`/`bootstrap.scss` imports from component `<style>` blocks (each scoped copy added ~600 KB to `base.css`). Adds `client/scripts/check-style-imports.mjs`: walks `.vue` files under `src` and `packages/ui/src`, flags `@import`/`@use` lines whose argument matches `base(.scss)` (bare or `@/style/scss/`) or `bootstrap/scss/bootstrap(.scss)`. Wired as `pnpm run check-style-imports` and a step in the existing `js_lint.yaml` job after ESLint. No deps, ~0.2s.

## Infrastructure reuse

- Galaxy has no stylelint. `eslint-plugin-vue`/`vue-eslint-parser` don't expose `<style>` contents as AST (only `v-bind()` in CSS), so this can't be an ESLint rule (`vue/no-restricted-syntax` at `.eslintrc.js:54` is template-only). A stylelint rule would need stylelint + `postcss-html` + a custom plugin for import params - far heavier than a 38-line script.
- It does reuse what exists: a `package.json` script next to `eslint`/`format-check`, and a step in the existing client lint job (no new workflow/job). `client/scripts/` already holds `build.mjs`. Good fit.
- Not wired into `make client-lint-autofix`/pre-commit; minor discoverability, not worth asking.
- `entry.parentPath` / recursive `readdirSync` need Node >= 20.12; CI and `client/.node_version` pin 22.20.0. Fine.

## Red-to-green (temp `.vue` files under `src/zz_tmp_check/`, removed after; tree clean)

Clean tree passes (exit 0). Variants in a `<style scoped lang="scss">`:

| Import | Caught? | Resolves in Vite? |
|---|---|---|
| `"base"`, `"base.scss"`, `'@/style/scss/base.scss'`, `"@/style/scss/base"` | yes | yes |
| `@use "@/style/scss/base" as *`, `@use "bootstrap/scss/bootstrap"` | yes | yes |
| `"bootstrap/scss/bootstrap.scss"` | yes | yes |
| `"blue.scss", "base"` (multi-arg), indented line | yes | yes |
| `"../../style/scss/base.scss"` | **no** | yes |
| `"scss/base.scss"` | **no** | yes (`includePaths` has `src/style`, `vite.config` line 128) |
| `"~bootstrap/scss/bootstrap"` | no | tilde removed in d014e5812af; low value |
| `"bootstrap-vue/src/index.scss"` | no | yes - emits full BootstrapVue CSS |
| `// @import "base"`, `/* ... */`, `blue.scss` | no (correct) | - |

Scoped vs unscoped: check flags both (doesn't parse `scoped`). Reasonable - unscoped still duplicates the bundle, just dedupable-ish; PR body/message frame it as scoped only.

## Findings (ranked)

1. **Relative-path imports slip through** - `client/scripts/check-style-imports.mjs:9`. The base pattern requires the quote to sit right before `base` or `@/style/scss/`, so `"../../style/scss/base.scss"` and `"scss/base.scss"` pass. Both resolve (relative; `includePaths: ["src/style", "src/style/scss", ...]`), and the relative form is an established style in the tree (`"../../style/scss/custom_theme_variables.scss"`, `"../Form/_form-elements.scss"`). `base.scss` is the only file with that basename in `client/`, so matching any path ending in `/base(.scss)` is safe. Verified the suggested regex has zero hits on the current tree and catches both variants:
   ```js
   const FORBIDDEN = [/["'](?:[^"']*\/)?base(?:\.scss)?["']/, /["']~?bootstrap\/scss\/bootstrap(?:\.scss)?["']/];
   ```
2. **No test of the script itself** (optional). Manual instructions only. Given 38 lines and an obviously-correct failure mode this is proportionate; not requesting.
3. **`.scss` partials not scanned** - acknowledged in PR body; only `base.scss` imports full Bootstrap today, so fine. Cheap extension if desired later: also walk `.scss` outside `src/style/`. Not asking.
4. **Adjacent, out of scope:** `CollectionCreator.vue:232-235` (unscoped) imports full Font Awesome `solid`/`fontawesome`/`brands`, and `ExternalIdentities.vue:232` imports `bootstrap/scss/utilities/spacing` - both emit CSS already in `base.css`. Not this PR's job; maybe mention as a follow-up observation only. Not included in draft review to keep it proportionate.

## Draft GitHub review (unposted)

Event: COMMENT (approve-worthy once/if the regex tweak lands, or approve as-is - the gap is minor)

> *Posted by Claude (AI assistant) on behalf of jmchilton. Not written by them personally.*
>
> Nice, cheap guard - and a standalone script in the existing lint job seems like the right call, since ESLint can't see `<style>` contents and Galaxy doesn't run stylelint.
>
> One gap: relative paths get past the `base` pattern. I dropped temp components in `src/` and `"../../style/scss/base.scss"` and `"scss/base.scss"` both passed the check (both resolve - relative, and via `includePaths: ["src/style", ...]`). Relative imports are common in our components (e.g. `"../../style/scss/custom_theme_variables.scss"`). Since `src/style/scss/base.scss` is the only `base.scss` in the client, matching any path ending in `/base` should be safe - this catches those and still has zero hits on the current tree:
>
> ```js
> const FORBIDDEN = [/["'](?:[^"']*\/)?base(?:\.scss)?["']/, /["']~?bootstrap\/scss\/bootstrap(?:\.scss)?["']/];
> ```
>
> Everything else I tried behaved: bare/`@/` paths with and without `.scss`, `@use ... as *`, multi-arg `@import`, indented lines all fail; commented-out imports and `theme/blue.scss` pass.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).
