### P2 1: `HistoryStorageOverview.test.ts` misses lost byte formatting and belongs at the E2E layer (implementation verified)

The new unit test takes four `vi.mock` calls to check that template literals reach a stubbed `BarChart`, and its formatting assertion can't fail. `BarChart` has a default `labelFormatter`, so `toBeTypeOf("function")` still passes with `v-bind="byteFormattingForChart"` removed from the chart. What the selection flag does is already tested in `Charts/BarChart.test.ts`, and "the active vs deleted chart shouldn't be selectable" is still an unchecked manual step in the test plan.

<details><summary>Evidence</summary>

With the unit test as written, removing the spread from the chart leaves it green. Against the new E2E test, on real Galaxy and Vite servers under Playwright:

| Client code | E2E result |
| --- | --- |
| Review branch | Passes |
| Pre-PR attribute order and shared `enable-selection` key, under MODE 3 | Fails at the selection assertion: clicking the bar opens `.selection-info` |
| `v-bind="byteFormattingForChart"` removed from the chart | Fails at the legend assertion: `'Active: 19'` has no unit |

</details>

Replace the unit test with `test_active_vs_deleted_chart_is_not_selectable` in `test_history_storage.py`, plus selectors in `navigation.yml`. It clicks the real Active bar, checks no selection appears, and checks the legend shows bytes. The unit test's other assertion, that the top datasets chart stays selectable, is already exercised by `test_delete_dataset_from_storage_view`, which clicks a bar there and deletes from the selection card. The review branch does this in `fd122d6ef0e`. It ran under Playwright only; the Selenium backend was not run.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort by writing the E2E test and running it at the branch head and under both mutations.

</details>

### P3 1: galaxy-ui comments still say compat hides `.native` and a bare `<template>` (implementation verified)

Three comments describe the client as tolerating these forms at compile time. Under MODE 3 it no longer does, so they now break in the client as well as the Tool Shed:

- `client/packages/ui/README.md:16`
- `client/packages/ui/src/portableImports.test.ts:51`
- `lib/tool_shed/webapp/frontend/src/components/galaxyUi.test.ts:15`

The `value`/`input` v-model part of the README is still right, because that emulation is runtime compat.

<details><summary>Evidence</summary>

Compiling `<Foo @click.native="x"><template><b>y</b></template></Foo>` with `@vue/compiler-sfc` 3.5.43:

- MODE 2 gives `onClickNative` and renders `<b>` directly.
- MODE 3 gives a plain `onClick` and keeps a `template` element around `<b>`.

</details>

Reword the three comments. The review branch does this in `73af595e525`. It changes comments and docs only, so no behavior changed.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort by comparing MODE 2 and MODE 3 compiler output.

</details>

### P3 2: `GTabs.test.ts` covers only the horizontal tab link (implementation verified)

`GTabs.vue` has two copies of the tab anchor and the PR reorders the spread in both, but the new test renders only the horizontal one. Moving the spread back in the vertical copy leaves it green.

Parametrize the test over `vertical`. The review branch does this in `ff172e0259b`. Both cases pass, and with the spread moved back in the vertical copy the `vertical: true` case fails with `expected 'caller-id' to be 'first-button'`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort by running the parametrized test at the branch head and under that mutation.

</details>
