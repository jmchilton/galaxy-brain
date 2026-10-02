# galaxy#23780 - Refactor/remove vue rx

- PR: https://github.com/galaxyproject/galaxy/pull/23780 (draft, itisAliRH)
- Reviewed head: `87709ed0cd57a83250d29b5596b5c7057e3e3ce5`
- Merge base (origin/dev): `07420debd2e90f7dc32c2709fc8acecfa95d50bd`
- Size: +1/-336, 9 files
- Verdict: **approve** (once out of draft). Clean deletion, nothing live references removed code. One optional nit.

## What it does

Drops `vue-rx` (Vue 2 only; Vue 3 prep, #20787). Only consumer was `DebouncedInput.js`
(`watch$` + `$subscribeTo`), used only by top-level `components/ClickToEdit.vue` and
`components/Annotation.vue`, which themselves had no importers. Deletes those three, the
`vueRxShortcuts.js` plugin, its registrations in `mountVueComponent.js` and vitest
`getLocalVue`, and the dependency/lock entries.

## Verification

- Repo-wide grep (client src/tests/config, lib/, templates/, config/; excluding node_modules/dist/static):
  no hits for `vue-rx`, `vueRx`, `$subscribeTo`, `$watchAsObservable`, `$observables`,
  `v-stream`, `domStreams`, `$fromDOMEvent`, `$createObservableMethod`, `$eventToObservable`,
  `watch$(`, `listenTo(`, `subscriptions:`. No storybook dir, no type decls for vue-rx.
- `ClickToEdit` live users all import `@/components/Collections/common/ClickToEdit.vue`
  (DetailsLayout, ListDatasetCollectionElementView, PairedElementView). No `Annotation.vue`
  importers; remaining `Annotation` strings are labels/locale keys.
- Only remaining `DebouncedInput` mention: a comment in `lib/galaxy/selenium/navigates_galaxy.py:936`.
- `rxjs`: zero imports left in `client/src`. Still listed in `client/package.json:66,128-130`
  (`@hirez_io/observer-spy`, `rxjs`, `rxjs-spy`, `rxjs-spy-devtools-plugin`), aliased in
  `client/vitest.config.mts:16,76-77`, and `rxjsDebug` flags in `client/src/config/{development,testing,production}.js`
  (flag already unread anywhere). PR description defers these to a follow-up - reasonable.
- Lockfile: removal consistent (importer + package + snapshot entries). `pnpm install --frozen-lockfile` succeeds.
- `eslint` on touched files: clean.
- vitest (node 22.20.0): DetailsLayout, List/PairCollectionCreator, History/CurrentHistory - 8 files, 55 tests pass.
  (Local note: `--ignore-scripts` install needs `pnpm rebuild vue-demi` or pinia import fails - env, not PR.)

## Findings

1. **Nit (optional)** - `lib/galaxy/selenium/navigates_galaxy.py:936` comment says
   "The combination of DebouncedInput+b-input doesn't seem to uniformly respect .clear()".
   Was already stale before this PR (DebouncedInput had no live users), but this PR is the
   natural place to drop the name. Suggest:
   ```python
   # The debounced filter input doesn't seem to uniformly respect .clear() below.
   ```
   or just drop the component name. Not blocking.
2. **Follow-up (already acknowledged by author)** - rxjs + spies + vitest alias + `rxjsDebug`
   config are now dead. Small enough that folding into this PR would also be fine; no strong preference.

No tests weakened; no new code, no comments added. Nothing else.

## Draft GitHub review comment

> *Posted by Claude (AI assistant) on behalf of jmchilton - not authored by them personally.*
>
> Looks good. I grepped the whole repo for any vue-rx API usage (`$subscribeTo`, `$watchAsObservable`,
> `v-stream`, `subscriptions`, `domStreams`, `watch$`/`listenTo`) and for importers of the removed
> `Annotation`/`ClickToEdit`/`DebouncedInput` - nothing live; all current `ClickToEdit` users import
> `Collections/common/ClickToEdit.vue`. Lockfile is consistent (`pnpm install --frozen-lockfile` ok),
> and the History/Collections vitest suites that use `getLocalVue` pass.
>
> Tiny optional nit: `lib/galaxy/selenium/navigates_galaxy.py:936` still mentions `DebouncedInput`
> in a comment - could drop the name while you're here. +1 on doing the rxjs / rxjs-spy /
> `rxjsDebug` / vitest-alias cleanup as the follow-up you mentioned.
