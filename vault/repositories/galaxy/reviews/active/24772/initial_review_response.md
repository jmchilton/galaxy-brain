

## Human Review

(PUBLISHING_AGENT: replace with the contents of REVIEW_DIRECTORY/human_review.md; drop this section if that file is missing.)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is a build-time compiler setting and template attribute reordering with no API, data, or tool/workflow artifact changes, so reverting it restores the old behavior.

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24772_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24772_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24772_review_0) builds on the reviewed commit `49fa5544810` and changes no application code. It corrects three comments that the switch to MODE 3 made wrong, extends the `GTabs` attribute test to the vertical tab link, and replaces the mocked `HistoryStorageOverview` unit test with an E2E test of the active vs deleted chart.

- [`73af595e525`](https://github.com/jmchilton/galaxy/commit/73af595e525) Stop saying compat hides .native and a bare <template>: rewords the galaxy-ui README and the comments in `portableImports.test.ts` and the Tool Shed's `galaxyUi.test.ts`.
- [`ff172e0259b`](https://github.com/jmchilton/galaxy/commit/ff172e0259b) Cover the vertical tab link in the GTabs attribute test: parametrizes the test over `vertical`, which fails if the spread moves back in the vertical anchor.
- [`fd122d6ef0e`](https://github.com/jmchilton/galaxy/commit/fd122d6ef0e) Test the active vs deleted chart end to end: adds `test_active_vs_deleted_chart_is_not_selectable` and its selectors, and deletes `HistoryStorageOverview.test.ts`.

</details>

</details>

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

Fixed on the review branch in [`fd122d6ef0e`](https://github.com/jmchilton/galaxy/commit/fd122d6ef0e).

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

Fixed on the review branch in [`73af595e525`](https://github.com/jmchilton/galaxy/commit/73af595e525).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort by comparing MODE 2 and MODE 3 compiler output.

</details>

### P3 2: `GTabs.test.ts` covers only the horizontal tab link (implementation verified)

`GTabs.vue` has two copies of the tab anchor and the PR reorders the spread in both, but the new test renders only the horizontal one. Moving the spread back in the vertical copy leaves it green.

Parametrize the test over `vertical`. The review branch does this in `ff172e0259b`. Both cases pass, and with the spread moved back in the vertical copy the `vertical: true` case fails with `expected 'caller-id' to be 'first-button'`.

Fixed on the review branch in [`ff172e0259b`](https://github.com/jmchilton/galaxy/commit/ff172e0259b).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort by running the parametrized test at the branch head and under that mutation.

</details>
