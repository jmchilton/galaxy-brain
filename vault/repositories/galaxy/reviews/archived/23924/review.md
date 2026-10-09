# galaxy#23924 - Fix galaxy-ui gaps found by the Tool Shed's plain Vue 3

- PR: https://github.com/galaxyproject/galaxy/pull/23924 (dannon), base `dev`
- Split off from #23925 (Tool Shed migration, draft)
- Reviewed head: `03b62ebf0f498b6e9d0ec54d7ef198087bacee7c`
- Merge-base with fresh `origin/dev`: `8f899e0a3d9`
- Worktree: `~/projects/worktrees/galaxy/pr/23924`

## Verdict

**Approve, with small suggestions.** The core fix is real and correct, and the "client looks no
different" claim holds up under everything I checked. The suggestions are about reuse: heading
sizes and `.sr-only`. None of them block.

## What I verified

- **Double fire is real on plain Vue 3, and compat really masks it.** I compiled the old template
  (`@click="a" @click.native="a"` on `<component>`) with the non-compat `@vue/compiler-dom` and
  got `onClick: [a, a]`. A non-keyboard event ignores the unknown `native` key modifier, so you
  get two listeners. `@vue/compat` compiles `.native` to `onClickNative`. At runtime it strips
  the suffix into `attrs.onClick`, so the two handlers collapse into one key.
- **The single `@click` still reaches the anchor in the client.** In MODE 2, compat would
  normally move a component's `onClick` into `$listeners` and keep it out of fallthrough attrs
  (`shouldSkipAttr` / `INSTANCE_LISTENERS`). vue-router 5's `RouterLink` declares
  `compatConfig: { MODE: 3 }`, so the listener falls through to the rendered `<a>` next to
  `navigate`. The existing GButton "router-link root emits click exactly once" test passes.
  A throwaway test showed the same for GLink and GDropdownItem with `to`. No `.native` remains
  anywhere in `client/src` or `client/packages`.
- **Unscoped `:where()` baselines** in GAlert, GDropdown and GTabs. I spot-checked them against
  Bootstrap 4 rules. Bootstrap also sets the properties that matter (display, color, borders,
  padding). The extras (`align-items` and `gap` on an inline-block `.btn`) have no effect there.
  Caret is not disabled in the theme, so `.dropdown-toggle::after` adds nothing new. GTabs
  nav-links are `<a>`, so reboot's `a { color }` (0,0,1) still beats the `:where` color.
- **GHeading scoped `.h-*`** now has specificity 0,2,0. I found no client rule that overrode the
  global `.h-*` utilities or set a GHeading's size through `hN` selectors, so the size it renders
  is unchanged.
- **No new client-only dependency.** `faSpinner` exists in FA 5 and 6. `@fortawesome/vue-fontawesome`
  is already a peer and is used by GHeading, GModal and GToast. All tokens used
  (`--spacing-*`, `--color-*-{100..900}`, `--font-size-small`) are in `packages/ui/src/styles/tokens.css`.
- **Lockfile.** Before this PR, pnpm auto-installed `vue-router@3.6.5` and `vue-fontawesome@2.0.9`
  as the package's peers. That means the package's own `type-check` was resolving against Vue 2-era
  types. It now resolves to 5.3.1 / 3.3.3, the same versions the client uses. That is an
  improvement.
- **Tests run** (node 22.20.0 via pnpm, targeted): GButton, GToast, headingScale, GDropdownItem, GLink,
  GDropdown, GAlert, GTooltip, tokensContract. All pass (35 + 67).
- **Red/green.** I nudged `.h-md` to 1.3rem and `headingScale.test.ts` failed with
  `h-md: package=1.3rem theme=1.275rem`. I dropped `|| props.loading` from the
  `useClickableElement` getter and the "loading router-link renders a plain button" test failed.
  Both reverted; the worktree is clean.

## Findings (ranked)

1. **(Medium, reuse) Heading scale duplicates literals instead of joining the existing token contract.**
   `packages/ui/src/components/GHeading.vue:153-175` hard-codes the rem values, and the new
   `client/src/style/headingScale.test.ts` regex-parses `blue.scss`, `ui.scss` and the SFC to
   keep the copies in sync. The package already has a mechanism for exactly this:
   `packages/ui/src/styles/tokens.css` plus `client/src/style/tokensContract.test.ts`. It already
   ships `--font-size-medium: 0.85rem`, which equals `$font-size-base`, so `.h-text` duplicates an
   existing token today. The cleaner abstraction would be heading tokens (e.g. `--font-size-h1..h4`)
   in tokens.css and `custom_theme_variables.scss`, with GHeading using `var(...)` and the
   existing contract test covering them. That drops a second, bespoke drift test that has to
   parse SCSS arithmetic and work around float rounding (`toFixed(4)`). Ideally `ui.scss`'s
   `.h-*` would consume the same tokens too.
2. **(Low, reuse) `.sr-only` is now defined twice in the package.** The copies are at
   `GDropdown.vue:387` (scoped) and `GTooltip.vue:154`. A single shared partial or mixin in
   `packages/ui/src/styles/` would avoid a third copy the next time a component needs it.
3. **(Low, tests) No test for the router-link click on GLink and GDropdownItem.** Lines
   `GLink.vue:90` and `GDropdownItem.vue:74` changed, but only GButton has a "router-link root
   emits click exactly once" test. These can't go red for the double fire under compat. They
   would still catch the other failure mode: if the router-link's `onClick` ever ended up in
   compat `$listeners`, it would never fire. I confirmed both pass with a throwaway test
   (mount with `to: "/x"` plus a memory router, click the `<a>`, expect one `click`).
4. **(Low, tests) "drops the spinner and busy state once loading ends" never ends loading**
   (`client/src/components/BaseComponents/GButton.test.ts:97`). It mounts without `loading`, so
   it only shows the default state. Mounting with `loading: true` and then calling
   `setProps({ loading: false })` would test what the name says.
5. **(Nit) `disabled || loading` is spelled out three times** (`GButton.vue:61`, `:103`, `:126`).
   One `const inert = computed(() => props.disabled || props.loading)` would serve `onClick`,
   the `useClickableElement` getter and `:to`.
6. **(Nit/UX) `loading` with `icon-only`** renders the spinner next to the slot icon
   (`GButton.vue:133`), so the square button holds two icons. Consider replacing the slot
   content while loading, or document the behavior.
7. **(Observation, out of scope) The package still leans on Bootstrap utilities.** Examples:
   GHeading's `bold` prop emits `font-weight-bold` (`GHeading.vue:90,109`), plus
   `word-wrap-break`, and GTabs' nav-end slot uses `ml-auto my-1 d-flex align-items-center`.
   Without Bootstrap these do nothing silently, which is the same class of gap this PR fixes
   for heading sizes. This is worth a follow-up if the shed hits it. Separately, the client has
   hand-rolled GButton spinners that could adopt the new `loading` prop (e.g.
   `Workflow/Invocation/Export/ExportButton.vue:27`).

Package consumers without Bootstrap should know one design point. `:where()` gives zero
specificity, so any element selector in the consumer's own CSS (`a { color }`, `button { ... }`)
beats these baselines. That is fine and intended, but the comments could mention it.

## Risks

Risks are minimal. The change doesn't lock Galaxy into choices that are hard to reverse
(a two-way door). `@galaxyproject/galaxy-ui` is `private` / `0.0.0-internal`, so narrowing the
peers to Vue 3 only affects in-repo consumers, and the client already runs Vue 3. The new
`loading` prop is additive. The unscoped `:where()` baselines are global CSS, but they sit at
zero specificity, Bootstrap's rules override them, and they can be removed without fallout.

## Draft GitHub review (unposted)

```
*Posted by Claude (AI assistant) on behalf of jmchilton. This review was not written by them personally.*

Thanks, this looks good, and the split from the shed migration makes it easy to review.

I checked the "client looks no different" claim against compat. Under `@vue/compat`, `.native` compiles to `onClickNative` and gets folded into `attrs.onClick`, which is why the double fire was masked. With a single `@click`, RouterLink (`compatConfig: { MODE: 3 }`) lets the listener fall through to the `<a>`, so router-linked GButton, GLink and GDropdownItem still fire once. Compiling the old template with plain `@vue/compiler-dom` gives `onClick: [a, a]`, which confirms the bug. I also spot-checked the `:where()` baselines against Bootstrap 4 and didn't find anything that would visibly change in the client.

Suggestions, none blocking:

1. **Heading sizes via the token contract.** `tokens.css` + `tokensContract.test.ts` already exist to keep package and client values in sync, and `--font-size-medium` (0.85rem) is already `$font-size-base`. Heading tokens (e.g. `--font-size-h1`..`h4`) that GHeading consumes through `var(...)` would let the existing contract test cover them, instead of literal rems plus a second test that regex-parses SCSS arithmetic.
2. `.sr-only` is now copied into both GDropdown and GTooltip. A small shared partial in `packages/ui/src/styles/` would keep it to one copy.
3. The GLink and GDropdownItem router-link `@click` changes have no tests. These can't catch the double fire under compat, but they would catch the listener never reaching the `<a>`. Mounting with `to` + a memory router, clicking the anchor and expecting one `click` passes for both.
4. `"drops the spinner and busy state once loading ends"` mounts without `loading`. Mounting with `loading: true` then calling `setProps({ loading: false })` would test the transition.
5. Nit: `props.disabled || props.loading` appears three times in GButton. One `inert` computed would cover all three.
6. Nit: `loading` + `icon-only` shows the spinner next to the slot icon, so the square button holds two icons.
```
