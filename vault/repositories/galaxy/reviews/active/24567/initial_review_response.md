


<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment, model claude-opus-5-5, effort low, reviewed commit 19e40ed7800c.

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It swaps the last `BFormCheckbox` (Tool Shed installation settings dependency checkboxes) for the existing `GCheckbox` and drops bootstrap-vue patch hunks for form-select, form-tags, and the form-radio-check mixin, which no client source still imports (no `BFormCheckbox`/`BFormRadio*`/`BFormSelect`/`BFormTags` references remain). Any regression would be a visual or binding issue in one admin dialog, reverted by restoring the component and patch hunks.

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24567_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24567_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24567_review_0) builds on the reviewed commit `19e40ed7800c` with three small follow-ups. It tightens the new dependency checkbox test so that swapped `v-model` bindings fail. It drops the old installer-interface assertions that read component data now covered by the rendered inputs. It also adds an ESLint `no-restricted-imports` rule, so the bootstrap-vue form controls whose patch hunks this PR removes can't be imported again unnoticed.

- [`f3403c22dc2`](https://github.com/jmchilton/galaxy/commit/f3403c22dc2) Drop internal dependency-flag assertions from the installer interface test — removes the three `wrapper.vm.install*Dependencies` reads, which the new checkbox test covers through the inputs' `checked` state.
- [`99ff763a868`](https://github.com/jmchilton/galaxy/commit/99ff763a868) Seed distinct dependency flags so swapped checkbox bindings fail — the mocked config now starts `install_resolver_dependencies` as `false`, and the expected initial and emitted values change to match.
- [`2eb25ae31a9`](https://github.com/jmchilton/galaxy/commit/2eb25ae31a9) Lint against importing the unpatched bootstrap-vue form controls — adds `no-restricted-imports` in `client/eslint.config.mjs` for `BFormCheckbox`, `BFormCheckboxGroup`, `BFormRadio`, `BFormRadioGroup`, `BFormSelect`, and `BFormTags`, with a message that points to the `G*` replacements.

</details>

</details>

### P3 1: Nothing stops the unpatched bootstrap-vue form controls from coming back (implementation verified)

This PR removes the `form-radio-check`, `form-select`, and `form-tags` hunks from `client/patches/bootstrap-vue@2.23.1.patch`. The description notes that bringing any of these components back would need its hunk again. Nothing enforces that, though. A re-imported `BFormCheckbox`, `BFormRadio`, `BFormSelect`, or `BFormTags` (or one of the group variants, which render the same children) still renders. Under compat its `v-model` would silently stop updating the bound value, and neither unit tests nor review would reliably catch it.

Add a `no-restricted-imports` rule for those `bootstrap-vue` names in `client/eslint.config.mjs`. That turns the description's caveat into a lint error, next to the existing `vue/no-restricted-syntax` guard for `v-no-sanitize-html`.

Fixed on the review branch in [`2eb25ae31a9`](https://github.com/jmchilton/galaxy/commit/2eb25ae31a9).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort. A probe file that imports `BFormCheckbox` fails lint with the new rule, and `eslint --quiet src packages/ui/src` still passes on the branch.

</details>

### P3 2: The dependency checkbox test can't detect swapped bindings (implementation verified)

The mocked config starts all three dependency flags as `true`, and the test toggles only "Install tool dependencies". If the `v-model`s of "Install resolvable dependencies" and "Install repository dependencies" were swapped, the test would still pass. Seed distinct initial values, for example `install_resolver_dependencies: false`, so that each label is tied to its own request field.

Fixed on the review branch in [`99ff763a868`](https://github.com/jmchilton/galaxy/commit/99ff763a868).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort. With those two bindings swapped in the component, the PR's test passes and the seeded test fails (`expected [ true, false, true ] to deeply equal [ false, true, true ]`).

</details>

### P3 3: Drop the `wrapper.vm.install*Dependencies` assertions in the installer interface test (implementation verified)

The "test tool repository installer interface" test still reads the three dependency flags off `wrapper.vm`. The new checkbox test now covers them through the rendered inputs' `checked` state. Removing these lines keeps the file testing behavior rather than component data.

Fixed on the review branch in [`f3403c22dc2`](https://github.com/jmchilton/galaxy/commit/f3403c22dc2).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort. All 10 tests in `InstallationSettings.test.js` pass on the review branch.

</details>
