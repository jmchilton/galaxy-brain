# QuotaMeter

Selected originator: `client/src/components/Masthead/QuotaMeter.test.ts`. Baseline **4 tests** → final **7**. The three-block appearance test is now a three-row `it.each`, and the two-block "no quota" test is now two named tests.

Not vacuous under the old helper. QuotaMeter reads only `config.value.enable_quotas` in script, which the old `{ value }` shape satisfied. The fixed `setupMockConfig` changes nothing here.

What changed:
- One `mountQuotaMeter({ enableQuotas, user })` replaces `createQuotaMeterWrapper(config: any, user)`. The quota flag is the only config the component reads. The user is seeded through `createTestingPinia({ initialState: { userStore: { currentUser } } })`, and that pinia is installed with `withPlugins(getLocalVue(), pinia)`. Before, the user was assigned after the store was created, and `pinia` was passed as a legacy top-level mount option.
- A `quotaUser(overrides)` wraps `getFakeRegisteredUser` with the original quota, usage and percent. It replaces the `{ ...FAKE_USER, ... }` spreads.
- Selector constants cover the usage text and the progress bar. The two "no quota" cases used to read the first `span`. They now read `.quota-progress > span`, the same element the percentage case uses, and the texts are unchanged.
- `vi.mock("@/api/schema")` is dropped. `src/api/schema` has no `__mocks__`, nothing in the meter's path calls it, and the suite's output is clean without it.
- `enableAutoUnmount(afterEach)` cleans up the seven mounts.

Preserved:
- The exact "Using 50% of 100 MB" text.
- `bg-success` at 30%, `bg-warning` at 80% and `bg-danger` at 95%, still checked with `toContain` on the bar classes.
- The total-usage texts: "Using 7 KB" with quotas off, and "Using 21 KB" for an unlimited quota with quotas on.

Strengthened: the tooltip check went from `toContain("Storage")` to `toBe("Storage and Usage Details")`. The anonymous title, "Login to Access Storage Details", also contains "Storage", so the old check couldn't tell the two apart.
- Probe: mounting the case with `getFakeAnonymousUser()` fails it, and receives "Login to Access Storage Details".

Reuse: `setupMockConfig` (fixed in this batch), `getFakeRegisteredUser`, `withPlugins`, `getLocalVue`, `enableAutoUnmount`. No new shared helper.

Validation: 7 tests pass shuffled (seed `340101`, `NODE_OPTIONS=--no-webstorage`). ESLint (`--max-warnings 0`), Prettier and `vue-tsc --noEmit` pass.

Guidance: none new. Follow-up: the anonymous branch (login link and title) has no case.
