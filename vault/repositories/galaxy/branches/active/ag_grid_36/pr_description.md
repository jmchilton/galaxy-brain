Upgrade AG Grid from 31.3.4 to 36.2.0 while preserving editing, collection creation and the existing Alpine appearance across Galaxy's five grid consumers.

The upgrade moves Galaxy's shared grid integration onto v36. It also handles a consequential change in the Vue wrapper: edited rows are copies, so edits must reach Galaxy's own state before importing data or creating a collection.

***This is an optional dependency upgrade: #23938 already addressed the CVE on `dev`.***

***This preserves existing user-facing grid behavior and Alpine styling across data landings, collection builders, sample sheets and rule previews.***

<details><summary>Before/after grid comparison from hardening (dev left, upgrade right)</summary>

![Existing grids compared with the upgrade](screenshots/compare_dev_vs_branch_grids.png)

The comparison caught lost status colors, clipped rule rows and changed header icons; the branch includes fixes. These screenshots predate the polish rebase.

</details>

<details><summary>Implementation and regression coverage</summary>

- A leading commit removes obsolete renderer registration and grid APIs while remaining compatible with v31.
- The upgrade pins both AG Grid packages together, registers community modules and retains the legacy Alpine theme.
- FetchGrid receives edited rows through `v-model`; the paired builder writes identifier edits and swaps back by id. Sample-sheet model objects use a string key that survives the wrapper's row copies.
- A real-grid unit test verifies that the sample-sheet identifier and model object survive editing and emitted rows. Existing tests retain their validation assertions.
- FetchGrid import and paired-builder rename E2E tests are already on `dev`. This branch restores swap coverage with a production-safe `data-description` hook, checking the saved collection's forward/reverse dataset order.

</details>

## Risks

This is reversible and changes no stored formats or server APIs, but a major grid upgrade can regress editing, rendering or selection across several interfaces.

<details><summary>Risk Details</summary>

- The Vue wrapper copies rows; a missed write-back can silently discard an edit or swap before submission.
- Theme and renderer changes can alter status icons, headers and compact rule rows.
- The grids also serve sample-sheet entry in workflow run forms; no change to workflow scheduling, mapping or serialization is intended.
- Existing hardening browser evidence uses Playwright and Vite. Production-build execution and a new Selenium run remain unverified.

</details>

<details><summary>Risk Review Advice</summary>

Review the write-backs in FetchGrid and the paired builder, and the sample-sheet model-object key. Exercise editing followed by submission, then compare the compact rule grid and status icons with the existing interface. The legacy theme is retained; moving to the Theming API or a shared grid component is separate work.

</details>

## Context

Builds on 🔀 #23938, which already addressed the CVE. The generic editing helper and FetchGrid/paired-builder baseline tests have since landed on `dev`, so the rebased diff concentrates on the upgrade and its adaptations. Alternative kept on 🌿[ag_grid_36_alt_original_scope](https://github.com/jmchilton/galaxy/tree/ag_grid_36_alt_original_scope) — the earlier upgrade without the later E2E coverage expansion and shared row-copy explanation. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the upgrade and targeted edit-path coverage together.</summary>

The approved coverage expansion is complete. A grid component wrapper, row-identity standardization and Theming API migration remain separate work. Retaining v31 and splitting the cleanup/tests were considered.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Shared setup stays in the grid composable; the focused test and helper findings were fixed.</summary>

The FetchGrid stub now requires the binding used by the component, and the tool-landing helper follows its existing sibling. Remaining duplication and identity cleanup predate the upgrade or exceed its scope.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Submission-path E2E checks replace duplicate internal-state tests.</summary>

Red-with-fix-reverted runs covered FetchGrid edits, paired-builder rename/swap and the sample-sheet model-object key during hardening. The real-grid key-preservation test remains; redundant tests reaching into component internals were removed. Polish restores the upstream-removed swap step through a stable hook.

</details>

### ✅ Second Frontier Model Review

<details><summary>The re-hardening review reported no remaining findings.</summary>

The diff and five grid consumers were reviewed, and 51 focused unit tests passed. That review did not execute browser tests or inspect appearance; separate hardening runs supply that evidence.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>The v31-compatible cleanup precedes the dependency upgrade.</summary>

The original baseline refactor and helper passed 702 tests on v31. The generic helper is now upstream; the compatible grid cleanup remains the leading branch commit.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? Edits or swaps can be lost on submission; missing model objects can leave identifiers blank or prevent sheet creation.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? They check validation and real-grid identifier/model-object preservation; E2E checks submitted results.
- [x] Are baseline tests in their own leading commits (if applicable)? The helper and baseline E2E tests are upstream; the compatible cleanup leads the branch.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc., what purpose do they serve? They explain active compatibility, row-copy and legacy-theme constraints.
- [x] Which existing workflows change behavior (if any)? None intended; sample-sheet entry retains its behavior.
- [x] Who hits this in practice and what is the evidence? Users of data landings, collection builders, sample sheets and rule grids; real-grid unit tests, submission E2E and hardening comparisons cover these paths.
- [x] Were simpler or existing approaches considered? Retaining v31, splitting the cleanup/tests, a shared component and the Theming API were evaluated in the scope review.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Coverage and validation</summary>

The real-grid test covers model-object preservation. The paired-builder E2E checks a saved rename and swapped dataset order; the existing data-landing E2E checks that edited values reach the imported dataset. Hardening also exercised sample-sheet display/creation and rule grids. Polish on `7c58e3c3f63`: Playwright passed the paired-builder rename/swap test and both data-landing tests (3/3). The client suite passed 706/707 initially; the unrelated palette timeout passed all 12 cases on retry. Client typechecking, formatting and lint passed (warnings only). Changed-file mypy reports the same 198 diagnostics as `dev`, with no new errors. See the [polish debrief](https://github.com/jmchilton/galaxy-brain/blob/main/vault/repositories/galaxy/branches/active/ag_grid_36/polish_debrief.md) for details.

</details>

- [x] This is a refactoring of components with existing test coverage.

<details><summary>Existing behavior is retained</summary>

The leading cleanup uses v31-compatible APIs. Existing component validation tests remain, with row-copy-aware fixtures where required by v36.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
