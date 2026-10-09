# galaxy #23911 - Restore scoped styles that no longer reach slot content under Vue 3

- PR: https://github.com/galaxyproject/galaxy/pull/23911 (itisAliRH, base `dev`)
- Head reviewed: `d50d4ed9ecfe45bcecf2ea1537f34edf0fff5440` (merge-base with `origin/dev`: `931bdcff826`)
- Part of #23830 (Vue 3 follow-up cleanup)
- Worktree: `~/projects/worktrees/galaxy/pr/23911`
- Size: +6/-5. 2 files: `BaseGrid.vue` cell/row selectors wrapped in `:deep()`; `mb-0` added to the `UploadPanel`
  heading passed into `ActivityPanel`'s `activity-panel-header-top` slot

## Verdict

Approve. CSS-only, correct, and the sweep turned up no other instance of this regression. One optional
suggestion (fix the heading margin inside `ActivityPanel` instead of in each caller). Nothing blocking.

## Findings (ranked)

1. **`:deep()` is correct for `BaseGrid`, and it matches house style.** I compiled both forms with
   `@vue/compiler-sfc` 3.5.43:
   - `table :deep(td)` -> `table[data-v-x] td`
   - `table :slotted(td)` -> `table td[data-v-x-s]`

   Both cover all three row sources. `renderSlot` (runtime-core 3.5.43) puts `slotScopeIds = [scopeId + "-s"]`
   on fallback content too, so `:slotted` would also match the `rows` prop path and the `columns` fallback
   `<th>`s. `:slotted` is the form the Vue docs suggest, and it is slightly tighter: it can't reach a table
   nested inside a cell by some child component. No current caller nests tables, though. `client/src` has
   59 files using `:deep(` and none using `:slotted(`, so `:deep` is the consistent choice. Not worth
   raising. The one-line comment explains a non-obvious reason, so it should stay.
2. **The `ActivityPanel` heading could be fixed once, in `ActivityPanel`.** `.activity-panel-heading { margin: 0 }`
   lives in `ActivityPanel`'s scoped style, but the class belongs to slot content in both overriding callers.
   `MarkdownToolBox` already worked around that with `mb-0`, and this PR copies the workaround into
   `UploadPanel`. Writing `.activity-panel-header-top :slotted(.activity-panel-heading)` (or `:deep`) inside
   `ActivityPanel` would keep the class's styling contract in one place. It would also fit the approach this
   same PR takes for `BaseGrid`, which is fixed at the child rather than the callers. `mb-0` matches the old
   rule because Bootstrap reboot already sets `h2` `margin-top: 0`. Optional. Either approach works.
3. **No other component has the same regression, within the limits of a static scan.** I wrote a scratch
   scanner (`scan2.py`/`scan3.py` in the session scratchpad). For each component with `<style scoped>` and a
   `<slot>`, it collected the class and element selectors outside `:deep`/`:slotted`/`:global`. It then
   looked at every direct importer's markup inside that component's tag for those classes (static `class=`
   or quoted in `:class`) or elements, and dropped matches the child also renders outside its slot fallbacks.
   - On `origin/dev` the scanner reports exactly the two cases this PR fixes: `BaseGrid` (td/tr from
     `DataTablesGrid` and `SanitizeAllow`) and `ActivityPanel` (`.activity-panel-heading` from `UploadPanel`,
     plus `MarkdownToolBox`, which is already patched with `mb-0`).
   - On the PR head it reports only `ActivityPanel`. Both callers there now carry `mb-0`.
   - `ToolPanel` also overrides `activity-panel-header-top`, but with `PanelViewMenu` and no heading class.
     Its own styles already use `:deep(.activity-panel-header)`. Fine.
   - Blind spots: slots forwarded through an intermediate wrapper, so the grandparent authors the content;
     dynamic `<component :is>`; attribute or `*` selectors; and class names built at runtime. No components
     are registered globally (`app.component(` has no hits), so there is no hidden importer path.
4. **`DataTypes` uses the `rows` prop, not the slot.** It was never broken. With `:deep` it renders the same.
   The `rows` prop fallback always had BaseGrid's scope id, so its styling doesn't change.

Nit-level, skip: there are no tests, which is reasonable for a scoped-CSS change. `ActivityPanel` has
`<slot name="header" class="activity-panel-header-description" />`, and a class on a `<slot>` becomes a
slot prop, not a DOM class. That was already a no-op and has nothing to do with this PR.

## Tests run

- None. The change is CSS-only and has no unit-testable surface.
- `compileStyle` check of `:deep` vs `:slotted` output (above).
- Static scan of `client/src` at `origin/dev` and at head (above).

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Draft review comment

> *Drafted by Claude (AI assistant) on behalf of jmchilton.*
>
> Looks good. `:deep()` is right for `BaseGrid`. It covers both the `rows`/`columns` fallback and
> slot-provided rows, and it matches the rest of the client, which uses `:deep` in about 60 files and
> `:slotted` nowhere. I compiled both forms to check. `:slotted(td)` would also work, since Vue 3.5 tags
> fallback slot content with the `-s` slot scope id too, but there's no reason to switch.
>
> I also ran a static sweep of `client/src`. For each scoped-style component with a `<slot>`, I checked
> whether its importers pass slot markup carrying classes or elements that only the child's scoped style
> targets. On `dev` it flags exactly the two spots fixed here (`BaseGrid` and the `ActivityPanel` heading),
> so I don't think any others were missed.
>
> One optional thought: `MarkdownToolBox` and now `UploadPanel` both add `mb-0` to their
> `.activity-panel-heading`. Moving the reset into `ActivityPanel` as
> `.activity-panel-header-top :slotted(.activity-panel-heading) { margin: 0; }` would keep it with the
> component that owns the class, and future header-slot overrides would get it for free. That would mirror
> fixing `BaseGrid` at the child. Fine either way. Approving.
