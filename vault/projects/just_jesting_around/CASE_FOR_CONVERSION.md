# The case for the conversion

Evidence that the lanes in [PIPELINE_BRANCHES.md](PIPELINE_BRANCHES.md) make Galaxy's client tests better rather than just different. It pairs numbers from [`case_metrics.py`](case_metrics.py) with a few before/after excerpts. Regenerate the numbers with `uv run case_metrics.py --fetch`; the ones below are as of 2026-10-10.

## Headline numbers

**Lane 1 (readability):** 227 test files, dev `df3932ed4ba` → `vitest_readability` `f8463741af2`.

| Signal | Before | After | Δ |
| --- | ---: | ---: | ---: |
| Test lines | 40,857 | 37,085 | −3,772 (−9%) |
| `it.each`/`test.each` tables | 12 | 162 | +150 |
| `wrapper.vm` reach-ins | 248 | 138 | −110 (−44%) |
| `as any`/`as unknown` casts | 162 | 8 | −154 (−95%) |
| `flushPromises`/`setTimeout`/timer pokes | 641 | 449 | −192 (−30%) |
| `vi.mock` module mocks | 194 | 155 | −39 |
| Class-name selectors (`.find(".x")`) | 264 | 222 | −42 |
| `eslint-disable` | 5 | 1 | −4 |

The shared helpers this needed add up to 25 non-test files, +668/−182. Test lines and helper lines together are still about −3,300.

**Lane 2 (stories):** 14 tests. Setup moves out of the test and into 71 browsable stories. Test plus stories grows +230 lines in total, but the tests themselves shrink: FormData 611 → 342 (+158 story), HistoryExportWizard 460 → 179 (+72), PersistentTaskProgressMonitorAlert 221 → 81 (+131). Cases go 123 → 128 and module mocks 8 → 3.

**Lane 3 (play functions):** 8 tests. 38 unit cases become 29 play functions, with 61 role/label queries (up from 0) and 127 → 153 `expect`s. InstallationSettings' unit file is gone: every check now runs in the browser, and the brittle signals in that file went from 5 to 0.

## Did coverage hold?

A reviewer will see −44 cases and −414 `expect`s in lane 1 and assume tests were deleted. They weren't:
- **Tables, not deletions.** Each of the largest drops (`filtering`, `filterConversion`, `url`, `redirect`, `parseBool`, `api/index`, `useInvocationGraph`) swapped copy-pasted cases for `.each` tables. A table row runs as its own test but is counted as one case and one `expect`.
- **Exact beats many.** Several field-by-field `toBe`s often collapse into a single exact `toEqual`, which is stricter.
- **Strengthening is policy.** Lanes may strengthen assertions freely; weakening one needs John's approval ([PIPELINE_WORKERS.md](PIPELINE_WORKERS.md)). The play lane shows each strengthened check passing the old test and failing a mutation ([PLAY_LOG.md](PLAY_LOG.md)).

Executed test counts (`vitest list`, at dev and at the tip) would settle the question; see Gaps below.

## Bugs found

Six upstream issues so far ([BUGS_FOUND.md](BUGS_FOUND.md)), none of which the old tests could see. Some highlights:
- **Tooltip shows literal `<p>…</p>`:** `ObjectStoreBadge` (confirmed on dev).
- **`useConfig(true)` never loads config:** the guard tests the ref, not `.value`. It's being fixed on its own branch.
- **"Error: User does not own…":** `WorkflowInvocationState` interpolates the `ApiError` object instead of its message.
- **Unreachable `errorMessage` branch:** `useKeyedCache` swallows the rejection.
- **Accessibility gaps** that a role-based play exposes right away: an icon-only collapse toggle with no name, and `GTooltip` text leaking into button names.

## Examples

### FormNumber: a mutating script becomes a named table (lane 1)

Before: a single case mutates one `props` object step by step, so the reader has to track state across the case to work out what each check means.

```js
const props = { value: 50, type: "float" };
// if min or max is not defined, range shouldn't be rendered
await assertRange(props, false);
props.min = 1;
await assertRange(props, false);
props.max = 100;
await assertRange(props, true);
// test usecase: range should be rendered on 0
props.min = 0;
await assertRange(props, true);
// test usecase: if max < min range shouldn't be rendered
props.max = -100;
await assertRange(props, false);
```

After: each scenario is a named row and runs as its own test, so a failure names the scenario.

```js
it.each([
    { name: "no bounds", bounds: {}, hasRange: false },
    { name: "only a minimum", bounds: { min: 1 }, hasRange: false },
    { name: "increasing bounds", bounds: { min: 1, max: 100 }, hasRange: true },
    { name: "a zero minimum", bounds: { min: 0, max: 100 }, hasRange: true },
    { name: "a maximum below the minimum", bounds: { min: 0, max: -100 }, hasRange: false },
])("renders a slider: $name", ({ bounds, hasRange }) => {
    const wrapper = mountFormNumber({ value: 50, type: "float", ...bounds });
    expect(wrapper.find(RANGE_INPUT).exists()).toBe(hasRange);
});
```

The file went 186 → 96 lines, with five tables, auto-unmount and no `flushPromises`.

### UserSharing: an exact assertion exposes a hidden double event (lane 1)

```ts
// before
wrapper.findComponent(GModal).vm.$emit("cancel");
await flushPromises();
expect(wrapper.emitted("cancel")).toBeTruthy();

// after
await clickModalButton(wrapper, "Cancel");
expect(wrapper.emitted("cancel")).toEqual([[]]);
```

The exact check failed against the old setup. The synthetic `$emit` left the native `<dialog>` open, so closing it later fired `cancel` a second time, and `toBeTruthy()` had hidden it. Clicking the real button fixes the test, and `clickModalButton` is now a shared helper. About 30 other `GModal` `vm.$emit` sites could use it ([review](reviews/batch30/UserSharing.md)).

### InstallationSettings: `wrapper.vm` becomes what the user sees (lanes 2 + 3)

Before, on dev: `vi.mock` hard-codes config, and the test reads component internals.

```js
expect(wrapper.find(".g-modal-title").text()).toBe("Installing 'name'");
expect(wrapper.vm.installToolDependencies).toBe(true);
expect(wrapper.vm.installRepositoryDependencies).toBe(true);
expect(wrapper.vm.installResolverDependencies).toBe(true);
```

After: the stories cover each server setting, and a play opens the collapsed settings like a user would and checks each checkbox by its label.

```ts
export const ChecksEnabledDependencies: Story = {
    play: async (context) => {
        await openAdvancedSettings(context);
        await context.step("See every dependency option checked", () => expectDependencyOptions(context, true));
    },
};

export const UnchecksDisabledDependencies: Story = {
    parameters: dependencySettings(NO_DEPENDENCY_SETTINGS),
    play: async (context) => {
        await openAdvancedSettings(context);
        await context.step("See every dependency option unchecked", () => expectDependencyOptions(context, false));
    },
};
```

The old test couldn't tell "checked because the server said so" from "always checked". The second story adds that check. Writing this play also surfaced the icon-only toggle with no accessible name. The unit file is deleted.

### parseBool: the smallest version of the pattern (lane 1)

Seven cases with ad-hoc grouping (`"True"` and `"TRUE"` share one case; `"yes"`, `"1"` and `""` share another) become three tables: booleans, strings and everything else. The file went 39 → 28 lines, and every input now gets its own test name.

## Costs, stated plainly

- **Browser time.** Play functions are slower per test (GButton 0.15 → 0.9s, ScrollList 0.1 → 2.4s, mostly from real hover and scroll delays). File wall time stays roughly flat because setup dominates ([PLAY_LOG.md](PLAY_LOG.md)).
- **No browser CI yet.** Stories and plays don't run in CI, so lanes 2–3 can't go upstream until a job exists.
- **Lines move rather than vanish in lanes 2–3.** The payoff is browsable states and user-level checks, not a smaller line count.
- **Review is the bottleneck.** Per-test commits make the work sliceable into PRs, but someone still has to review 200+ files.

## Gaps to close

- **Executed case counts:** `vitest list --project unit` at dev and at the tip, to replace the static `it(` count.
- **Interactions-panel screenshots:** for two or three plays (step 5 of [plan_vitest_addon.md](plan_vitest_addon.md)).
- **Full `unit` suite wall time:** at dev against the readability tip.
- **Guidance fed back:** a tally of lessons that made it into `client/README.md#client-side-unit-testing`, since the loop exists partly to improve conventions.
