# ObjectStoreBadges

Selected originator: `client/src/components/ObjectStore/ObjectStoreBadges.test.ts`. Baseline **2 tests** → final **2 tests**.

The shared `let wrapper` and the two copies of the mount call are now a typed `mountBadges(props)` factory. It drops the `as object` cast and the unused `nth` import. `BADGES` is typed as `ObjectStoreBadgeType[]`, so each entry gains the required `source: "admin"`, as in `ObjectStoreBadge.test.ts`. The child stubs never read it. The mount uses `getLocalVue()` instead of `getLocalVue(true)` because nothing here calls `l()`. The `.object-store-badges` selector is a named constant. Wrappers unmount automatically. The tests no longer need `async`, since neither awaits anything. A local `renderedBadges` helper maps each stubbed ObjectStoreBadge to its `badge` prop and its `size` attribute. Test names now describe the behavior and the condition.

All original assertions are kept, and some are tighter. The container check is still `find(BADGE_LIST).exists()`, now `toBe(true)`. The count of 2 and the first badge's size (`"lg"` by default, `"2x"` when given) are now one `toEqual` over the whole list. That also checks that each badge gets its own entry, in order, and that every badge gets the size, not just the first. The `"lg"` default comes from ObjectStoreBadge's `withDefaults`, which still applies to the shallow stub, so the default case covers the parent leaving `size` unset. Mutation checks: removing `:size` from the component fails the explicit-size case, and removing `:badge` fails both cases.

`shallowMount` stays, as the README prefers. The parent only forwards props, and ObjectStoreBadge has its own suite. `renderedBadges` calls `findAllComponents` on the root wrapper rather than on `get(BADGE_LIST)`. `DOMWrapper.findAllComponents` is typed `any`, so `vue-tsc` rejected the `map` callback as implicitly `any`.

Reuse: `getLocalVue` and `enableAutoUnmount`. The only other badge literals are three in `ObjectStoreBadge.test.ts`, each with its own type and message, and `getFakeObjectStoreInstance` defaults to `badges: []`. No consumer needs a shared badge factory, so no helper was added and no supporting file was edited.

Validation: ObjectStoreBadges passes 2 tests in shuffled order (seed `200101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint (`--max-warnings 0`) and Prettier pass. Full `vue-tsc --noEmit` passes.

Guidance: none. One possible note: `findAllComponents` on a `DOMWrapper` (from `get`/`find`) returns `any`, while on the mounted wrapper it is typed. It is a Vue Test Utils typing quirk, not Galaxy-specific, so I'm not proposing it for the README.
