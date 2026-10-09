# Tool Shed server selection

Originator: `client/src/components/Toolshed/SearchList/ServerSelection.test.js`. Cases: **1 → 2**.

Separate rendered choices from clicking a choice; name both scenarios. Await the click and reuse `emittedArg` for its chosen server. Auto-unmount wrappers and create fresh plugin configuration per mount.

Preserved the original selected server `url_0`, choices `url_0` and `url_1`, non-loading state, repository count10 and exact description, all three original anchor texts, dropdown presence, and emitted `onToolshed` value `url_1`. Dropdown existence now checks rendered markup instead of `wrapper.vm.showDropdown`. The emission is also checked exactly once. Full mounting stays because the real BootstrapVue link contributes the visible anchor markup being tested.

Reuse: only four primitive component props; a short local mount function is clearer than a shared Tool Shed factory. No supporting changes. Existing visible-behavior and event guidance covers the improvements; no new advice proposed.

Validation: the five owned suites passed 33/33 cases with no skips under shuffled Vitest seed `130031` (`/private/tmp/jest_readability_batch13_upload_final.json`). Scoped ESLint passed with zero warnings, Prettier passed, and `git diff --check` passed. The root runs authoritative full-client typechecking and final whole-batch validation.
