### P3 1: Nothing stops the unpatched bootstrap-vue form controls from coming back (implementation verified)

This PR removes the `form-radio-check`, `form-select`, and `form-tags` hunks from `client/patches/bootstrap-vue@2.23.1.patch`. The description notes that bringing any of these components back would need its hunk again. Nothing enforces that, though. A re-imported `BFormCheckbox`, `BFormRadio`, `BFormSelect`, or `BFormTags` (or one of the group variants, which render the same children) still renders. Under compat its `v-model` would silently stop updating the bound value, and neither unit tests nor review would reliably catch it.

Add a `no-restricted-imports` rule for those `bootstrap-vue` names in `client/eslint.config.mjs`. That turns the description's caveat into a lint error, next to the existing `vue/no-restricted-syntax` guard for `v-no-sanitize-html`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort and by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort. A probe file that imports `BFormCheckbox` fails lint with the new rule, and `eslint --quiet src packages/ui/src` still passes on the branch.

</details>

### P3 2: The dependency checkbox test can't detect swapped bindings (implementation verified)

The mocked config starts all three dependency flags as `true`, and the test toggles only "Install tool dependencies". If the `v-model`s of "Install resolvable dependencies" and "Install repository dependencies" were swapped, the test would still pass. Seed distinct initial values, for example `install_resolver_dependencies: false`, so that each label is tied to its own request field.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort. With those two bindings swapped in the component, the PR's test passes and the seeded test fails (`expected [ true, false, true ] to deeply equal [ false, true, true ]`).

</details>

### P3 3: Drop the `wrapper.vm.install*Dependencies` assertions in the installer interface test (implementation verified)

The "test tool repository installer interface" test still reads the three dependency flags off `wrapper.vm`. The new checkbox test now covers them through the rendered inputs' `checked` state. Removing these lines keeps the file testing behavior rather than component data.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort. All 10 tests in `InstallationSettings.test.js` pass on the review branch.

</details>
