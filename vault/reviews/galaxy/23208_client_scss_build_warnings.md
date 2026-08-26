# PR 23208 — Fix collection wizard SCSS not compiling, clear own-source client build warnings

<https://github.com/galaxyproject/galaxy/pull/23208> — `itisAliRH`, open, base `dev`.
Merge-base `532aeebdc8`. Four commits, 6 files, +15/−25.

**Verdict: mergeable as-is, no blocking issues.** Every substantive claim I could test holds up,
including the one the description is least sure about (the dead CSS rule — it is genuinely dead).
The real bug is real and it is currently shipping: I pulled `base.css` off usegalaxy.org (running
26.1.rc1) and the unresolved `$border-color` / `$font-size-base` / `$border-radius-large` literals
are right there in production. `release_26.1` carries the byte-identical `PasteData.vue` blob, so
this is a backport candidate, not just a `dev` fix.

Two things I'd want changed or at least acknowledged before merge, neither blocking:

1. **The reuse miss (finding 1).** `PasteData.vue` hand-duplicates the exact rules that live in
   `workbook-dropzones.scss` — the partial its three sibling components import. The duplication
   *is* the bug's proximate cause, and the PR fixes the symptom while leaving the duplicate copy
   in place, one line below the line it edited.
2. **The blast radius is overstated (finding 2).** Only one of the three components was actually
   emitting broken CSS. The other two were already fine, which I can show from the production
   stylesheet. The `lang="scss"` additions there are still correct, just not fixes.

## What the change actually does

Vue SFC style blocks get their preprocessor from the `lang` attribute, and nothing else. A
`<style scoped>` with no `lang` becomes a `?vue&type=style&…&lang.css` request, so Vite runs it
through its CSS pipeline rather than sass. Three consequences, and the PR's description conflates
them:

- **`$variables` written directly in the block are never substituted.** They survive minification
  as literal text and browsers drop the declarations. This is the actual user-visible bug, and it
  applies only to `PasteData.vue`, which is the only one of the three that writes `$vars` in its
  own block.
- **`@import "…/*.scss"` still works.** Vite's `@import` inlining (postcss-import with a custom
  `load` hook) checks the *resolved file's* extension and runs the sass preprocessor on it before
  inlining. So `@import "…/workbook-dropzones.scss"` compiles correctly even from a plain-CSS
  block — the partial's own `@import` of `blue.scss` is resolved by sass, not postcss. That is why
  `SampleSheetWizard.vue` and `CardUploadWorkbook.vue` were never broken.
- **`@import "…/theme/blue.scss"` produces the `is empty` warning.** blue.scss is variables-only,
  so preprocessing it yields zero bytes and postcss-import warns. Exactly two components import it
  directly without `lang` (`PasteData.vue`, `CardUploadWorkbook.vue`) — which is precisely the "2"
  in the PR's table. That number is self-consistent; I initially expected 3 and was wrong, because
  the nested import inside `workbook-dropzones.scss` never reaches postcss.

The other three commits are unrelated cleanups: a dead SCSS rule, IE7 star hacks in a vendored
stylesheet, and a pnpm warning suppression.

## Findings

### 1. Minor (reuse) — `PasteData.vue` duplicates the shared dropzone partial instead of importing it

`client/src/components/Collections/wizard/workbook-dropzones.scss` exists for exactly this, and
three components use it:

```sh
$ git grep -n "workbook-dropzones" -- client/src
client/src/components/Collections/BuildFileSetWizard.vue:344:@import "@/components/Collections/wizard/workbook-dropzones.scss";
client/src/components/Collections/SampleSheetWizard.vue:494:@import "@/components/Collections/wizard/workbook-dropzones.scss";
client/src/components/Collections/wizard/CardUploadWorkbook.vue:52:@import "@/components/Collections/wizard/workbook-dropzones.scss";
```

`PasteData.vue:77-83` re-types the partial's body instead — byte-identical, verified:

```sh
$ diff <(sed -n '3,9p' client/src/components/Collections/wizard/workbook-dropzones.scss) \
       <(sed -n '77,83p' client/src/components/Collections/wizard/PasteData.vue) && echo IDENTICAL
IDENTICAL
```

It is the only `.dropzone.highlight` definition in the tree outside the partial:

```sh
$ git grep -n "dropzone.highlight" -- client/src
client/src/components/Collections/wizard/PasteData.vue:77:.dropzone.highlight {
client/src/components/Collections/wizard/workbook-dropzones.scss:3:.dropzone.highlight {
```

This is not incidental — it is *why the bug existed*. The three components that imported the
shared partial got correct CSS through the sass path described above. The one that copy-pasted the
rules into a plain-CSS block got broken CSS. Had `PasteData.vue` reused the partial like its
siblings, there would have been nothing to fix.

The PR edits `PasteData.vue:52` and leaves the duplicate at line 77 untouched. Suggested change,
which also makes the `lang="scss"` addition load-bearing for the right reason:

```scss
<style lang="scss" scoped>
@import "@/style/scss/theme/blue.scss";
@import "@/components/Collections/wizard/workbook-dropzones.scss";
/* .dropzone / .dropzone.highlight now come from the partial */
```

While there: the base `.dropzone` rule is *also* copy-pasted three times, identically, and is not
in the partial at all:

```sh
$ git grep -n "^\.dropzone {" -A2 -- client/src
SampleSheetWizard.vue:496 / CardUploadWorkbook.vue:54 / PasteData.vue:73
    padding: 7px !important;
    width: 100%;
```

Moving those two declarations into `workbook-dropzones.scss` removes the last of the duplication
and is a two-line change. That would leave the PR with an actual reusable artifact rather than
three `lang` attributes.

### 2. CONFIRMED — only one of the three components was shipping broken CSS; the description overstates it

The PR body says the `.dropzone.highlight` rules from `workbook-dropzones.scss` were broken too,
"which is imported by two of the affected components". They were not. Production disagrees:

```sh
$ curl -sS -o base.css https://usegalaxy.org/static/dist/base.css   # 3,694,440 bytes, 26.1.rc1
$ grep -o '\.dropzone\.highlight\[data-v-[a-z0-9]*\]{[^}]*}' base.css
.dropzone.highlight[data-v-ca04421f]{border-width:2px;border-color:$border-color;border-radius:$border-radius-large;-moz-border-radius:$border-radius-large;border-style:dashed}
.dropzone.highlight[data-v-98b45987]{border:2px dashed #bdc6d0;border-radius:.3125rem}
.dropzone.highlight[data-v-bb66e67a]{border:2px dashed #bdc6d0;border-radius:.3125rem}
.dropzone.highlight[data-v-6aa08347]{border:2px dashed #bdc6d0;border-radius:.3125rem}
```

Three resolved, one broken. The scope hashes map cleanly onto the four components involved:

```sh
$ grep -o '\.dropzone\[data-v-[a-z0-9]*\]{[^}]*}' base.css
.dropzone[data-v-ca04421f]{width:100%;padding:7px!important}
.dropzone[data-v-98b45987]{width:100%;padding:7px!important}
.dropzone[data-v-bb66e67a]{width:100%;padding:7px!important}
$ grep -o '\.paste-data[^{,]*{[^}]*}' base.css
.paste-data[data-v-ca04421f]{flex-flow:wrap;min-width:576px;margin-left:-15px;margin-right:-15px;display:flex}
.paste-data textarea[data-v-ca04421f]{resize:none;width:100%;height:300px;font-size:$font-size-base;border-radius:$border-radius-large;border-color:$border-color;border-width:2px}
```

- `ca04421f` has `.paste-data` → **`PasteData.vue`**, the only broken one.
- `98b45987` / `bb66e67a` have `.dropzone` + `.dropzone.highlight` → `SampleSheetWizard.vue` and
  `CardUploadWorkbook.vue`, both **already correct**.
- `6aa08347` has `.dropzone.highlight` only, no `.dropzone` → `BuildFileSetWizard.vue`, which
  already had `lang="scss"` (`BuildFileSetWizard.vue:343`).

Full unresolved-variable inventory in the deployed stylesheet:

```sh
$ grep -o '\$[a-zA-Z_][a-zA-Z0-9_-]*' base.css | sort | uniq -c
   2 $border-color
   3 $border-radius-large
   1 $font-size-base
   1 $vite          # unrelated: a Vite marker comment, `/*$vite$:1*/`
```

Six occurrences, all inside the two `data-v-ca04421f` rules quoted above. The PR's table says
"unresolved `$scss-variables` in `dist/base.css`: 4" — I count 6 declarations / 3 distinct
variables against a 26.1.rc1 build. Not necessarily a discrepancy (different build, and "4" may be
counting something else) but the number doesn't reproduce; see finding 6.

None of this makes the change wrong. Adding `lang="scss"` to the two already-working components is
harmless (sass compiles the same declarations), mildly beneficial (it removes
`CardUploadWorkbook`'s `blue.scss is empty` warning and makes the convention uniform), and I'd keep
it. Just fix the PR body so a future bisect doesn't mislead: **the shipped regression is
`PasteData.vue` only**, present since the component was introduced in `22b6c1487b` (2025-05-09),
and live on `release_26.0` and `release_26.1` — both carry blob `f492b3edf5`, identical to `dev`
pre-PR. Worth a backport label.

### 3. Minor — nothing prevents this recurring, and the central-config option would not have helped

You asked specifically whether a Vite-level injection is the missing abstraction here. Checked:

```
client/vite.config.mjs:102-113
    css: {
        lightningcss: { errorRecovery: true },
        preprocessorOptions: {
            scss: {
                quietDeps: true,
                silenceDeprecations: ["import", "color-functions", "global-builtin"],
                includePaths: ["src/style", "src/style/scss", "node_modules"],
            },
        },
    },
```

No `additionalData`. Instead, **137 `.vue` files repeat `@import "@/style/scss/theme/blue.scss"`**
(`git grep -c "theme/blue" -- 'client/src/**/*.vue' | wc -l`). So the PR does follow the
established convention, and it is the only convention there is.

An `additionalData: '@use "…/theme/blue.scss" as *;'` would delete those 137 duplicated lines and
retire the whole `blue.scss is empty` warning class at the root. It is a real cleanup and worth its
own PR. But it is **not** a fix for this bug and shouldn't be framed as one: `additionalData` is
prepended only to sources that reach the sass preprocessor, and a `<style scoped>` with no `lang`
never does. Adding it would have left `PasteData.vue` exactly as broken.

What *would* have caught this is a guard. There is no stylelint config in `client/`
(`ls -a client | grep -i stylelint` → nothing) and no visual-regression tooling
(`git grep -ln "percy\|chromatic\|backstopjs\|toMatchImageSnapshot"` → nothing). The check is
mechanical and cheap — reject any `<style>` block lacking `lang=` that contains a `$`-prefixed
identifier or `@import`s a non-`.css` file. I wrote exactly that scanner to answer finding 4 below;
it runs over all 995 `.vue` files in well under a second. Dropping it into `client/scripts/` and
wiring it to the existing `eslint`/`format-check` CI step is the durable outcome this PR is
otherwise missing. (`eslint-plugin-vue` won't do it out of the box — it doesn't parse style
blocks.)

### 4. Minor — the pnpm change is a strict no-op, which is the good news

`client/package.json:23-49` already declares `onlyBuiltDependencies: ["esbuild", "vue-demi"]`. In
pnpm 10 that is an **allowlist**: with it set, nothing outside it runs install scripts. Everything
now named in `ignoredBuiltDependencies` was already blocked. The new field only tells pnpm "yes, I
know", suppressing the `Ignored build scripts` notice. It cannot change what gets built, so the
"breaks installs subtly" risk doesn't apply here — the allowlist is what governs.

Package-by-package, in case the allowlist is ever relaxed:

| package | install script | needs it? |
|---|---|---|
| `@fortawesome/*` (6 entries) | donation banner (`node -e`) | no |
| `core-js-pure` | donation banner | no |
| `bootstrap-vue` | opencollective banner | no |
| `msw` | `msw init` — copies the browser service worker into a public dir | no |
| `@parcel/watcher` | `node-gyp-build` (native) | no, on any supported platform |

The two worth checking, and why they're fine:

- **`msw`** is node-only here. Only `setupServer` is used; there is no `setupWorker`, and no
  `mockServiceWorker.js` exists in the tree:
  ```sh
  $ git grep -n "setupWorker\|setupServer\|msw/browser\|msw/node" -- client/src client/tests
  client/src/api/client/__mocks__/index.ts:2:import { setupServer } from "msw/node";
  client/src/api/client/__mocks__/index.ts:27:        server = setupServer();
  client/tests/vitest/setup.ts:98:// import { setupServer } from "msw/node";
  $ find client -name "mockServiceWorker*" -not -path "*/node_modules/*"   # (nothing)
  ```
  `msw init` is only relevant to browser-worker mode. Correctly ignorable.
- **`@parcel/watcher@2.5.1`** does have native bindings, but it's an *optional* dep of
  `sass@1.101.0` (via chokidar) and ships prebuilt binaries for all 13 platform triples, all
  present in `pnpm-lock.yaml:1294-1377` as optionalDependencies. `node-gyp-build` falls through to
  the prebuild, so the postinstall is a no-op. It is also only used by sass's `--watch`, which
  Galaxy doesn't invoke.

So the list is accurate. Two small nits: the entry list is a hand-maintained snapshot that will
drift the next time a dependency is added, and pnpm 10 prefers these settings in
`pnpm-workspace.yaml` (which exists, `client/pnpm-workspace.yaml`, currently holding only
`packages:`). Keeping them next to the existing `onlyBuiltDependencies` in `package.json` is the
consistent choice, so I wouldn't move it — just noting the alternative.

### 5. Minor — description inaccuracies and one leftover legacy prefix

- The body attributes the `is empty` warning to "postcss-import inlining a variables-only file".
  Close, but `client/postcss.config.js` contains only autoprefixer — the inlining is Vite's
  internal CSS `@import` handling, not a configured plugin. Matters only if someone greps the
  postcss config looking for it.
- "lightningcss warned in every chunk" — `vite.config.mjs:120` sets `cssCodeSplit: false`, so there
  is one CSS output. Possibly true of the pre-bundle passes; I couldn't check.
- The PR removes IE7 `*display` / `zoom: 1` from `select2.scss` but leaves `-moz-border-radius`
  (Firefox ≤ 3.6, ~2010) in both `workbook-dropzones.scss:8` and `PasteData.vue:82` — the latter a
  line the PR touches the block of. If dead-vendor-prefix removal is in scope, these are the same
  vintage. Folding finding 1's dedup in would delete one of the two for free.

### 6. Could not verify — the before/after warning table

`client/node_modules` and `client/dist` do not exist in the worktree, and per instructions I did
not run `pnpm install` or a production build. So `lightningcss minify warnings 24 → 8`,
`blue.scss is empty 2 → 0`, and `unresolved $scss-variables 4 → 0` are **unverified**.

What I could check statically is consistent with the table:

- **`blue.scss is empty: 2`** — exactly two components `@import` blue.scss directly without `lang`
  (`PasteData.vue`, `CardUploadWorkbook.vue`), and the nested import inside
  `workbook-dropzones.scss` is handled by sass rather than postcss, so it produces no third
  warning. The number is right for the right reason.
- **`:after::after` artifacts** — I confirmed the mechanism (finding 7 below) but the deployed
  stylesheet contains zero of them (`grep -o ':after::after' base.css | wc -l` → 0), so I can't
  corroborate that they were reaching `dist`. They may be minified away or dropped by
  `lightningcss errorRecovery: true` after the warning fires; the warning count is still plausible.
- **`unresolved $scss-variables: 4`** — I measure 6 occurrences / 3 distinct names in the deployed
  26.1.rc1 build (finding 2). The "after: 0" half is certain; the "before: 4" doesn't reproduce
  against the artifact I have.

Not a reason to hold the PR. Worth asking the author to say which build the counts came from.

## Non-findings (checked, clean)

- **Claim 3 — `.text-and-autocomplete-select` is genuinely dead.** Verified both sides:
  ```sh
  $ git grep -n "text-and-autocomplete-select" 532aeebdc8 -- .     # merge-base, whole repo
  532aeebdc8:client/src/style/scss/unsorted.scss:727:.text-and-autocomplete-select {
  $ git grep -n "text-and-autocomplete-select" HEAD -- .           # after removal
  (nothing)
  ```
  One hit, the definition itself. No `.py` / `.vue` / `.ts` / `.js` / `.mako` / `.html` / `.yml`
  reference. Checked for dynamic construction too — `git grep -nE "autocomplete-select|and-autocomplete|text-and-"`
  across `HEAD` returns a single unrelated hit,
  `client/src/libs/jquery/jquery.autocomplete.js:244: this.selectClass_ = 'jquery-autocomplete-selected-item'`,
  a different class in a different vendored lib. Nothing in
  `client/src/utils/navigation/navigation.yml` (the Selenium selector registry) either. Safe
  deletion.
- **No orphans left by that deletion.** `caret()` is still used, correctly, at
  `client/src/style/scss/unsorted.scss:535` — and that usage is instructive: it calls
  `@include caret()` at rule level and *then* opens a separate `&:after` block to tweak it, which
  is the right pattern. The deleted rule nested the include *inside* `&:after`, so Bootstrap's
  mixin emitted its own `&::after` one level too deep. `opacity()` (defined at
  `client/src/style/scss/toastr.scss:14`) still has four callers in that file. The deleted rule was
  the only offender of its kind:
  ```sh
  $ grep -rn -B4 "@include caret" client/src/style/scss/unsorted.scss   # one hit, line 535, at rule level
  ```
- **Claim 1 is complete — there are no remaining offenders.** Scanned every `.vue` file in the
  repo (`client/src`, `client/packages`, `lib/`, `config/`, `tools/`, `test/`) for `<style>` blocks
  without `lang=` that import a non-`.css` file, reference `$`-prefixed identifiers, or use SCSS
  at-rules:
  ```
  vue files: 995, style blocks: 380, no lang=: 108, suspicious: 5
    client/src/components/DatasetInformation/DatasetDetails.vue:153      nesting depth 2
    client/src/components/User/ExternalIdentities/ExternalLogin.vue:261  nesting depth 2
    client/src/components/User/ExternalIdentities/ExternalRegistration.vue:66  nesting depth 2
    client/src/components/Workflow/Editor/NodeInvocationText.vue:62      nesting depth 2
    lib/tool_shed/webapp/frontend/src/components/MetadataInspector/JsonDiffViewer.vue:32  nesting depth 2
  ```
  All five are false positives — native CSS nesting, which lightningcss and current browsers
  handle. Nothing else. Separately checked the two `src=`-attribute style blocks: 
  `client/src/components/RuleBuilder/ColumnSelector.vue:133`
  (`<style scoped src="@/components/Help/help-text.scss" />`) has no `lang`, but `help-text.scss`
  is pure CSS with no variables or nesting, so it compiles identically either way; and
  `client/src/components/RuleCollectionBuilder.vue:1960` pulls a `.css` file from node_modules.
  The four remaining plain `@import` blocks
  (`FileSourceTypeSpan.vue:23`, `ObjectStoreRestrictionSpan.vue:25`, `ObjectStoreTypeSpan.vue:31`,
  `LibraryFolder.vue:712`) all import genuine `.css` siblings. **The three components in this PR
  are the complete set.**
- **Claim 4 — select2 is vendored, but editing in place is the established practice.** No npm
  `select2` dependency, no `vendor/` directory, no sync script, no upstream URL — just a version
  stamp: `client/src/style/scss/select2.scss:1-3` reads
  `/* Version: 3.5.1 Timestamp: Tue Jul 22 18:58:56 EDT 2014 */`. select2 3.5.1 shipped in 2014 and
  is long abandoned. The file already carries five in-tree commits including a rename to `.scss`, a
  path move, and a wholesale prettier reformat (`80740c6cb3`), so the "changes get lost on the next
  vendor bump" concern is moot — there will be no bump, and the copy has already diverged. No
  reason to object. After the change, no star hacks remain anywhere in our own stylesheets:
  ```sh
  $ grep -rn "\*display\|\*zoom\|zoom: *1" client/src/style/    # (nothing)
  ```
- **`lang="scss"` is behaviour-preserving on the two already-working components.** Both blocks are
  plain declarations plus imports; no `//` comments, no `&`, nothing whose meaning differs between
  CSS and SCSS. The `@import`-deprecation noise sass would otherwise emit is already suppressed via
  `silenceDeprecations: ["import", …]` at `vite.config.mjs:109`.
- **No tests weakened, none removed.** The diff touches zero test files.

## Test coverage assessment

**There is no coverage here, before or after, and the PR does not add any. That is defensible for
this change but is itself the story.**

- No unit or component tests exist for `PasteData.vue`, `CardUploadWorkbook.vue`, or
  `SampleSheetWizard.vue`. The only test in `client/src/components/Collections/wizard/` is
  `fetchWorkbooks.test.ts`, which covers the data-fetching module, not the components.
- The PR checks "This is a refactoring of components with existing test coverage." For the SCSS fix
  that box is not accurate — there is no coverage of these three, and even if there were, vitest +
  jsdom does not run the SCSS pipeline, so no component test could have caught this.
- No stylelint, no snapshot-of-compiled-CSS test, no visual-regression tooling anywhere in
  `client/`. Nothing in CI inspects `dist/base.css`.
- **A CSS bug shipping unnoticed for 14 months and reaching a release candidate is the coverage
  signal.** The defect entered on 2025-05-09 (`22b6c1487b`) and is live in the 26.1.rc1 build
  serving usegalaxy.org today. It was found by a human reading build warnings.

The proportionate response is not component tests, it's the static guard from finding 3 — plus,
arguably, the PR's own manual-test step 2 (`grep -c 'border-color:\$border-color' client/dist/base.css`
returns 0) promoted from a checklist item into a CI assertion. That grep, generalized to "no `$`
identifiers survive into `dist/base.css`", is a two-line CI step that would have caught this and
will catch the next one. It is the one thing that would turn this from a patch into an abstraction.

## Open questions for the author

1. Will you fold in the dedup (finding 1) — `PasteData.vue` importing `workbook-dropzones.scss`
   instead of re-typing it, and the thrice-duplicated `.dropzone` base rule moving into the
   partial? It's ~6 lines and removes the condition that produced the bug.
2. The description says the `workbook-dropzones.scss` rules were broken too. Production says
   otherwise (finding 2) — only `PasteData.vue` was affected. Can the body be corrected? A future
   bisect will read it.
3. `release_26.0` and `release_26.1` both carry the identical broken `PasteData.vue`
   (blob `f492b3edf5`), and 26.1.rc1 is what usegalaxy.org is serving. Backport?
4. Which build produced the before/after table? I measure 6 unresolved-variable occurrences
   (3 distinct names) in the deployed 26.1.rc1 `base.css`, not 4 (finding 6).
5. Any appetite for the follow-up that actually removes the class of bug — either a CI grep for
   `$` surviving into `dist/base.css`, or a scanner rejecting `<style>` blocks that use SCSS
   without `lang="scss"`? Happy to hand over the scanner I wrote for this review.
6. Separately (not this PR): `css.preprocessorOptions.scss.additionalData` would collapse 137
   duplicated `@import "@/style/scss/theme/blue.scss"` lines and retire the `blue.scss is empty`
   warning at the source. Worth filing? Note it would *not* have prevented this bug —
   `additionalData` never reaches a block without `lang`.
