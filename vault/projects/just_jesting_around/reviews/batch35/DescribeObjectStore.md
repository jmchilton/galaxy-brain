# DescribeObjectStore

Selected originator: `client/src/components/ObjectStore/DescribeObjectStore.test.js`. Baseline **3 tests** → final **9 tests**. It stays `.js` so the commit renames nothing.

What changed:
- The three display variants (default, by id, by name) form one `it.each` table. Each row states its expected count for all three description spans and the `isPrivate` passed to `ObjectStoreRestrictionSpan`.
- Each case mounts with its own testing Pinia, installed through `withPlugins(localVue, pinia)`. Before, a Pinia was created and activated but never handed to `mount`. The shared `let wrapper` and the async-but-synchronous mount helper are gone.
- Named cases cover the bold id, the bold name and the description markdown.

Preserved: every original span count is kept, with all three spans now counted in every row (the id row never checked the default span before). The `DESCRIPTION` markdown check on the name response now reads `ConfigurationMarkdown`'s `markdown` prop instead of the stub's attribute. All three response fixtures are unchanged.

Vacuous or prop-echo assertions replaced (judgement calls, each shown to fail under a probe):
- `findAll("loading-span-stub").length === 0` in all three cases could never fail: the component renders no LoadingSpan. Its loading state is now a `BSpinner` inside the quota block. Replacement, per response: the "Galaxy has no quota configured for this storage." text renders, and no `BSpinner` exists. Probes: forcing the quota block on failed the text check in all three cases; adding a spinner to the no-quota block failed the spinner check in all three.
- `wrapper.vm.storageInfo.object_store_id === "foobar"` (id and name cases) only echoed the prop. In the id case, `.display-os-by-id b` must read `foobar` (probe: rendering the name there fails it). In the name case, `.display-os-by-name b` must read `my cool storage` and `foobar` must not appear (probe: appending the id to the name fails it).
- `wrapper.vm.isPrivate` falsy/truthy is now the `isPrivate` prop on the rendered `ObjectStoreRestrictionSpan`, exact `false`/`true`, in every row (probe: hardcoding `false` fails the name row).

Production code was restored after each probe, and the worktree was clean.

Reuse: `withPlugins` and `getLocalVue`. `getFakeObjectStoreInstance` builds a `UserConcreteObjectStore`, not the dataset-storage description this component takes, so the inline fixtures stay. No new helper.

Validation: 9/9 pass shuffled (seed `350101`). ESLint, Prettier and full `vue-tsc --noEmit` pass.

Follow-up: the quota-enabled branch (spinner while loading, `QuotaUsageBar` once loaded) has no coverage.

Guidance: none.
