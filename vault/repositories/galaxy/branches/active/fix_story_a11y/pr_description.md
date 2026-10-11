Repair accessibility issues found by component story audits across Galaxy's shared controls, forms, collection builders, and workflow views.

Selecting a dataset, renaming it, and removing it need independent keyboard controls. A visible form label should focus its input, and a screen reader should hear what a progress segment or icon button does. The audited components missed these contracts in repeated states.

| Interaction | Before | After |
| --- | --- | --- |
| Collection selection and editing | Rename/remove actions nested inside selection controls | Separate native selection, rename, and removal controls; Space and Enter activate once |
| Role, quota, and password forms | Visible labels did not identify the actual inputs | Labels focus their corresponding controls, including searchable multiselects |
| Searchable multiselect | Combobox state on the wrapper; unnamed removal icons with positive tab order | State on the focused input; named native removal buttons in normal tab order |
| Progress, menus, and scrolling | Unnamed segments, nested menu buttons, and unreachable scroll regions | Named progress segments, one menu toggle, and keyboard-reachable scrolling |

***These repairs benefit people using Galaxy's existing UI with a keyboard or assistive technology; Storybook supplies the test fixtures, while the production fixes run independently of it.***

The frozen audit now passes **236/236 story checks**, including all **121 previously excepted states**, with accessibility failures set to `error` and no rule or subtree exclusions. Eight separate Chromium probes check native activation, exactly-once events, label focus, and independence of selection from rename/remove. The polishing run passes **220 tests in 26 affected client suites**.

***This is a bounded repair of the audited component states, not a claim of complete Galaxy accessibility or manual screen-reader verification.***

***This PR adds no Storybook dependencies or axe CI, and leaves workflow definitions and execution unchanged.***

<details><summary>Implementation and validation boundaries</summary>

- Shared fixes preserve visible/explicit tooltip names, associate labels with inputs, name modal/heading/wizard controls, correct list structure, and improve audited contrast and target sizing.
- Galaxy's existing vue-multiselect dependency patch owns combobox and removal semantics; the redundant wrapper-state composable is removed. The lockfile changes update that patch's hash.
- Permanent client regressions exercise the patched dependency, public ARIA semantics, label associations, emitted actions, and selection/editing independence.
- Strict axe and native keyboard probes use a disposable harness with frozen prototype stories; this PR adds no Storybook dependencies or permanent axe CI. [Reproduction instructions and results](https://github.com/jmchilton/galaxy-brain/tree/main/vault/repositories/galaxy/branches/active/fix_story_a11y/validation).
- The implementation pass also completed client type checking, changed-file lint/format checks, and desktop/narrow component screenshot review. These are component results; live Galaxy Selenium flows and manual assistive-technology review were not run.
- Workflow definitions, scheduling, and outputs retain their existing behavior. Workflow-facing changes concern zoom controls, progress announcements, and invocation navigation markup.

</details>

## Risks

These UI repairs are reversible and establish no new API or saved-workflow contract; the main risk is changing shared keyboard, focus, and selection behavior.

<details><summary>Risk Details</summary>

- Shared tooltip and multiselect changes affect more screens than the audited fixtures cover.
- Native controls and sibling actions change tab stops and event routing in collection builders and menus.
- List, contrast, and target-size changes can affect compact layouts. Reviewed component states fit desktop and narrow viewports; inherited narrow collection-name clipping remains.
- The vue-multiselect patch must be maintained when that dependency is upgraded.

</details>

<details><summary>Risk Review Advice</summary>

Review collection selection/rename/remove with both mouse and keyboard, searchable multiselect naming and tag removal, and tooltip naming on controls with visible or explicit labels. Check compact layouts in the surrounding Galaxy application and use a screen reader for the workflows you rely on; automated component checks cannot establish those results.

</details>

## Context

Motivated by the accessibility findings in the reference-only [vitest_story_a11y prototype](https://github.com/jmchilton/galaxy/tree/vitest_story_a11y). Production repairs are based directly on `dev`, and the running story migrations remain separate.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>The repairs stay within the audited component families.</summary>

Retained shared controls and dependent call sites together; considered labels-only contraction and separate batches. Control replacement, migration infrastructure, and a broader accessibility program remain outside this change.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Direct native controls and the existing dependency patch keep the repair maintainable.</summary>

The review identified no structural rewrite requirement. Resolved findings restore native manual-pairing selection, scope hover hints to one selection control, and remove the unused multiselect helper.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Observable regression assertions are supplemented by eight passing Chromium keyboard probes.</summary>

Retained tests of accessible names, associations, list/combobox semantics, and independent actions. Native browser checks verify Space/Enter activation and actual focus, which synthetic DOM key events cannot establish. Added heading state tests caught and fixed the collapsed ARIA state under Vue compatibility mode.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? Unnamed or unreachable controls impede navigation; existing request alerts and toasts remain.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes—public semantics, focus associations, and emitted actions.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? Zoom/progress announcements and navigation structure improve; execution and saved workflows do not change.
- [x] Who hits this in practice and what is the evidence? Users of these shared controls; 121 audited exception states, 236 strict passing story checks, and eight keyboard/focus probes.
- [x] Were simpler or existing approaches considered? Existing native controls and associations are reused; dependency-owned semantics stay in its existing patch.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Client regressions and reproducible browser checks</summary>

Run the affected client Vitest suites, particularly `MultiselectAccessibility`, `FormSelectMany`, `ListDatasetCollectionElementView`, `ClickToEdit`, `RoleForm`, `QuotaForm`, `ChangePassword`, `GHeading`, and `WorkflowInvocationState`. The validation directory linked above describes the separate frozen-story audit and native Chromium probes. Fork client CI was still pending during polishing; local results should not be read as completed fork CI.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
