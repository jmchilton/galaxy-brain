# The case for the conversion

Evidence that the lanes in [PIPELINE_BRANCHES.md](PIPELINE_BRANCHES.md) make Galaxy's client tests better rather than just different. It pairs numbers from [`case_metrics.py`](case_metrics.py) with a few before/after excerpts. Regenerate the numbers with `uv run case_metrics.py --fetch`; the ones below are as of 2026-10-10.

## Headline numbers

**Lane 1 (readability):** the standing table is in [REFACTORING_METRICS.md](REFACTORING_METRICS.md), which the script regenerates (`--update`). As of 2026-10-10: 237 test files, test lines down 9%, casts down 95%, `wrapper.vm` down 42%.

**Lane 2 (stories):** 14 tests. Setup moves out of the test and into 71 browsable stories. Test plus stories grows +230 lines in total, but the tests themselves shrink: FormData 611 → 342 (+158 story), HistoryExportWizard 460 → 179 (+72), PersistentTaskProgressMonitorAlert 221 → 81 (+131). Cases go 123 → 128 and module mocks 8 → 3.

**Lane 3 (play functions):** 8 tests. 38 unit cases become 29 play functions, with 61 role/label queries (up from 0) and 127 → 153 `expect`s. InstallationSettings' unit file is gone: every check now runs in the browser, and the brittle signals in that file went from 5 to 0.

## Did coverage hold?

Lane 1 shows −44 cases and −414 `expect`s, which looks like deleted tests. The script counts `it(` and `expect(` as they appear in the source, though, and an `.each` table counts once however many rows it runs. Every originator's review note records the executed count from a real vitest run. For each of the largest drops that has one, the executed count held or grew:

| Test | Static cases | Executed cases | What happened |
| --- | --- | --- | --- |
| `filterConversion` | 16 → 14 | 16 → 39 | 11 tables, one row per input |
| `collectionTypeDescription` | 9 → 8 | 9 → 18 | multi-assertion cases split into tables |
| `tool-version` | 14 → 6 | 14 → 21 | extraction and parsing variations split |
| `CollectionDescription` | 2 → 1 | 2 → 13 | one row per collection shape |
| `SwitchToHistoryLink` | 7 → 3 | 7 → 12 | positional-arg helper → named scenario table |
| `JsonDiffViewer` | 13 → 3 | 13 → 13 | ten repeated mounts → one table |
| `canvasDraw` | 11 → 7 | 11 → 11 | five header combinations → typed table |
| `uploadState` | 43 → 44 | 43 → 44 | `expect`s 109 → 92: field checks grouped into object assertions |
| `parseBool` | 7 → 3 | 7 → 13 | see the example below |

Sources are the review notes under `reviews/` (parseBool is counted from the file). Executed counts exist only for the originators; follow-through edits to other suites record pass/fail, not before/after counts.

Other safeguards:
- **Strengthening is policy.** Lanes may strengthen assertions freely; weakening one needs John's approval ([PIPELINE_WORKERS.md](PIPELINE_WORKERS.md)).
- **Exact beats many.** Truthy checks become exact `toEqual`s, which is how UserSharing's double event surfaced (example below).
- **Mutation checks in the play lane.** [PLAY_LOG.md](PLAY_LOG.md) shows strengthened plays failing a mutation that the old test passed, for example dropping ObjectStoreBadges' `:size`, and InstallationSettings' dependency checks.

## Bugs found

Six upstream issues so far ([BUGS_FOUND.md](BUGS_FOUND.md)):
- **Tooltip shows literal `<p>…</p>`:** `ObjectStoreBadge` (confirmed on dev).
- **`useConfig(true)` never loads config:** the guard tests the ref, not `.value`. It's being fixed on its own branch.
- **"Error: User does not own…":** `WorkflowInvocationState` interpolates the `ApiError` object instead of its message (same code on dev).
- **Unreachable `errorMessage` branch:** `useKeyedCache` swallows the rejection (same code on dev).
- **Accessibility gaps** that role-based plays exposed: `GTooltip` text leaks into button names (same code on dev), and an icon-only collapse toggle has no accessible name (unconfirmed).

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

Seven cases with ad-hoc grouping (`"True"` and `"TRUE"` share one case; `"yes"`, `"1"` and `""` share another) become three tables: booleans, strings and everything else. The file went 39 → 28 lines. The static count drops 7 → 3 while the executed tests go 7 → 13, one per input, which is the counting effect from the coverage section in miniature.

## Costs, stated plainly

- **Browser time.** Moving cases into plays saves a little unit time and adds more browser time. GButton: unit tests ≈67 → 52ms, stories ≈150 → 900ms. ScrollList: unit ≈150 → 120ms, stories ≈0.1 → 2.4s. Most of the added time is real hover and scroll delays. Per-file wall time stays roughly flat because setup dominates ([PLAY_LOG.md](PLAY_LOG.md)).
- **No browser CI yet.** Stories and plays don't run in CI, so lanes 2–3 can't go upstream until a job exists.
- **Lines move rather than vanish in lanes 2–3.** The payoff is browsable states and user-level checks, not a smaller line count.
- **Review is the bottleneck.** Per-test commits make the work sliceable into PRs, but someone still has to review 200+ files.

## Gaps to close

- **Executed case counts for every file:** `vitest list --project unit` at dev and at the tip. The review notes cover only originators.
- **Interactions-panel screenshots:** for two or three plays (step 5 of [plan_vitest_addon.md](plan_vitest_addon.md)).
- **Full `unit` suite wall time:** at dev against the readability tip.
- **Guidance fed back:** a tally of lessons that made it into `client/README.md#client-side-unit-testing`, since the loop exists partly to improve conventions.
