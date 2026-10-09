# galaxy #23913 - Fix Vue 3 console warnings from renderless providers and the inline upload view

- PR: https://github.com/galaxyproject/galaxy/pull/23913 (itisAliRH, base `dev`)
- Head reviewed: `caa8cb847845513ff762cf9fd91c656b90cfa01f` (merge-base with `origin/dev`: `931bdcff826`)
- Part of #23830 (Vue 3 console warning cleanup)
- Worktree: `~/projects/worktrees/galaxy/pr/23913`
- Size: +114/-4. 7 files: `inheritAttrs: false` on `SingleQueryProvider` and `SimpleProviderMixin`, `ref` -> `shallowRef` in
  `UploadMethodViewInline.vue`, two dead attributes removed from callers, two new vitest files

## Verdict

Approve. Small, correct, and it doesn't change behavior. Tests fail before the fix and pass after it. Nothing blocking.

## Findings (ranked)

1. **`inheritAttrs: false` can't break a caller that relied on attribute fallthrough. In Vue 3 there was
   no fallthrough to begin with.** Both `render()` functions return `slotFn(...)`, and a Vue 3 slot always
   returns an array. That array becomes a Fragment root, and `renderComponentRoot` only applies fallthrough
   attrs (including compat `INSTANCE_ATTRS_CLASS_STYLE` class/style) to an ELEMENT or COMPONENT root. I
   checked this with a scratch vitest at base and at head. I mounted `SingleQueryProvider` with `id`,
   `class`, `style`, `data-foo` and `onClick`, and gave it a single-`<div>` slot. Both revisions render a
   bare `<div class="inner">a</div>`, and the click does not reach the listener. So the PR body's claim
   ("Vue 3 already rendered no such attributes in the DOM") holds even for single-root slots, and the
   change only silences the warning.
2. **No caller passes class, style or DOM-targeted attributes to these providers.** I went through every
   usage of `DatasetProvider`, `UrlDataProvider`, `ToolSourceProvider`, `JobDetailsProvider` /
   `JobConsoleOutputProvider`, `DbKeyProvider`, `DatatypesProvider` and `SuitableConvertersProvider`.
   They only pass lookup params (`id`, `url`, `job-id`, `stdout_position`, ...) and listeners (`@error`,
   `@update:result`). Those listeners are fired by the providers' own `$emit`, which `inheritAttrs` doesn't
   touch. `$attrs` content, `HasAttributesMixin.attributes` and the `cacheKey` hash are unchanged. The
   subclass providers in `storeProviders.js` don't override `inheritAttrs`, so they all pick up the mixin
   setting.
3. **`shallowRef` fixes the problem in the right place and is the idiomatic fix.** `uploadMethodRegistry.ts`
   builds each `component` with `defineAsyncComponent`. The only place it becomes a reactive proxy is the
   deep `ref` in `UploadMethodViewInline`. `availableMethods` is a `computed` over raw registry objects,
   and child components get the method as a prop, so neither of those proxies it. `selectedMethod` is only
   ever replaced whole (lines 80, 84, 91), so dropping deep reactivity loses nothing. You could add
   `markRaw` at the registry instead, which would protect any future consumer that stores a method in a
   deep ref. That isn't needed now: the client uses `markRaw` in only one place (`ToolSourceDisplay.vue`),
   and a local `shallowRef` is fine. Not worth raising.
4. **Both dead-attribute removals do nothing at runtime, as intended.**
   - `HistoryPanel` lost its `showControls` prop in the composition-API port (`ab7721020b8`, 2024-01). The
     multiview `:show-controls="false"` added in `fbe032a9458` ("Hide history controls in multihistory
     view for now") has been ignored since then. `is-multi-view-item` now covers that role (e.g.
     `HistoryMessages`, `hide-reload`, `HistoryOperations`). The warning came from `HistoryPanel`'s root,
     which is the renderless `ExpandedItems`. Its attrs flowed into a fragment.
   - `FormGeneric` declares no `active_tab` / `activeTab`, so removing it from the `/visualizations/edit`
     route props is a no-op.
5. **The tests do their job.** I reverted the three source files to the merge-base and kept the new tests.
   All 3 tests fail on the exact warnings (`Extraneous non-props attributes (id, view)`, the reactive
   component warning). On head they pass. The `SingleQueryProvider` test also checks that `lookup`
   still receives `{id, view}`, which guards against the real regression risk (losing `$attrs`). Matching
   on console-warning text is a bit brittle across Vue versions, but the warning is the behavior
   under test. Mocks in the upload test are scoped to the registry and composables, not to the
   component under test. Not weakened, not trivial.

Nit-level, skip: the `SingleQueryProvider.test.js` filename also covers `SimpleProviderMixin` (its
describe block is named "renderless providers"). `ExpandedItems.js` is the other renderless component
without `inheritAttrs: false`. Its callers only pass declared props, so it only warns when a parent
like `HistoryPanel` forwards stray attrs, and fixing it at the caller (as this PR does) is right.

## Tests run

- `npm_config_use_node_version=22.20.0 pnpm exec vitest run src/components/providers/SingleQueryProvider.test.js src/components/Panels/Upload/UploadMethodViewInline.test.ts`
  -> 3 passed on head.
- Red check: same tests with `SingleQueryProvider.js`, `storeProviders.js` and `UploadMethodViewInline.vue`
  at `931bdcff` -> 3 failed.
- Scratch DOM check (base vs head, deleted afterwards): the rendered DOM is identical, and neither
  revision passes attrs or listeners through to a single-root slot.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Draft review comment

> *Drafted by Claude (AI assistant) on behalf of jmchilton.*
>
> Looks good to me. I confirmed `inheritAttrs: false` doesn't change behavior for any caller. The
> renderless `render()` returns the slot's vnode array, which Vue 3 normalizes to a Fragment root, so
> fallthrough attrs (including compat class/style) and listeners never reached the DOM, even with a
> single-element slot. I checked base against head with a scratch mount using `id`/`class`/`style`/`onClick`,
> and the DOM is identical. Every existing provider caller passes only lookup params plus `@error` /
> `@update:result`, which are fired by `$emit` and unaffected.
>
> `shallowRef` for `selectedMethod` is the right fix since it's only ever replaced. The removed
> `:show-controls` has been dead since `HistoryPanel`'s TS port dropped the prop, and `is-multi-view-item`
> now covers that role.
>
> The new tests fail against the pre-fix sources and pass on this branch. The `lookup` argument assertion
> in the provider test is a nice guard against losing `$attrs`. Approving.
