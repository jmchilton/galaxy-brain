Add browser coverage and reusable navigation helpers for FAQ account, storage, workflow-editor and dataset-display operations on Galaxy 26.2.

Routine QA needs to verify that profile changes and workflow tags persist, storage Refresh acknowledges the request, and Visualize shows the configured display links. This adds four browser cases for existing behavior and moves repeated interactions into shared helpers used by both new and existing tests.

***This is developer-facing browser-test infrastructure: existing workflows keep their editing and execution behavior.***

| Operation | Observable result covered |
| --- | --- |
| Storage Dashboard → Refresh | Recalculation acknowledgement |
| Workflow editor → Tags | Tag persists in the workflow list |
| Dataset → Visualize | Configured application labels and link texts, including UCSC/main |
| Dataset with no display applications → Visualize | Successfully loaded empty catalog |
| Login → Reset password | Existing reset-request result and preserved email |
| Preferences → Manage Information | Saved email and public name |
| Workflow editor → Best Practices | Existing metadata and conditional-gate warnings |

The catalog helper waits for a successful response for the requested dataset, then returns its application labels and link texts, including `{}` for a valid empty catalog. Provider failure or stale data cannot satisfy that readiness marker. Existing profile tests now wait for rendered completion instead of fixed sleeps.

***Coverage stops at the reset request and display-link catalog; emailed password recovery and external display destinations are separate concerns. Storage Refresh coverage verifies acknowledgement of the request.***

<details><summary>Representative captured states</summary>

The implementation run captured and inspected seven states. These examples show the existing UI exercised by the new tests.

![Workflow tag in the Attributes panel](screenshots/workflow_editor_tags.png)

![Configured dataset display links](screenshots/dataset_display_application_links.png)

![Successfully loaded dataset with no display applications](screenshots/dataset_display_application_links_empty.png)

</details>

## Risks

This is a reversible test/helper change with small client instrumentation changes; it introduces no workflow-format, public API or database migration commitment.

<details><summary>Risk Details</summary>

- DisplayApplications now renders its wrapper only when the provider result matches the requested dataset ID; an incorrect identity contract could hide links.
- Browser helpers depend on UI readiness and selectors; regressions can cause timeouts or assertions in their callers.
- Storage Refresh coverage checks acknowledgement in the standard non-Celery test configuration, not completion of an asynchronous recalculation.

</details>

<details><summary>Risk Review Advice</summary>

Review the dataset identity guard and populated/empty catalog cases together. Check that profile completion waits and persisted-tag assertions observe the saved state. Existing component assertions retain modern and legacy link destinations, while the browser helper deliberately reports labels and link texts.

</details>

## Context

Extracted from the FAQ QA work on the Galaxy browser driver. Alternative kept on 🌿[selenium_faq_account_workflow_display_26.2_alt_original_scope](https://github.com/jmchilton/galaxy/tree/selenium_faq_account_workflow_display_26.2_alt_original_scope): the original extraction requires at least one display application, while this version also handles a successfully loaded empty catalog. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>The selected FAQ operations include populated and valid empty display catalogs.</summary>

The completed scope evaluation retains reusable helpers and real consumers. Richer display-link metadata, additional mutation operations and password-reset product fixes remain separate workstreams.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The final implementation has no outstanding structural review findings.</summary>

The shared navigation layer, existing tagging abstraction and Visualize target are reused. Modern and legacy display rendering retain their distinct navigation semantics.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Four baseline browser cases precede helper extraction, with persistence and configured-catalog assertions.</summary>

The first commit contains inline coverage and the required readiness instrumentation. The component fixture uses a real dataset ID; its original link assertions are unchanged. Four additional component cases distinguish loading, provider failure and stale identity from a successfully loaded empty catalog. The populated catalog independently requires UCSC/main before comparing all rendered entries with configuration, and the empty case loads a real text dataset.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>History separates baseline coverage, helper extraction and empty-catalog helper support.</summary>

The Visualize selector cleanup belongs to the extraction commit. The clean rebase preserves all three original patches unchanged; a final test-only commit adds the catalog readiness cases.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? Browser assertions/timeouts identify missing expected states; no new product error message is introduced.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; browser cases verify persistence and rendered state, with independent UCSC/main coverage.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes; the first commit contains four inline baseline cases and readiness instrumentation.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments describe previous implementation or bugs, what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? None.
- [x] Who hits this in practice and what is the evidence? Browser-test and QA authors; existing reset, profile and Best Practices tests consume the helpers.
- [x] Were simpler or existing approaches considered? Yes; existing tagging and Visualize helpers are reused, and inline-only coverage would omit the requested reusable QA operations.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Browser and component verification</summary>

All five DisplayApplications component cases pass under Node 22.20.0, including the four added during polishing. Formatting left all 2,782 Python files unchanged, commit hooks passed, and mypy diagnostics match the current base exactly (23 existing errors in imported files).

The implementation head passed all ten affected cases under both Selenium and headless Playwright, with seven screenshots inspected. The clean rebase preserves those implementation patches; the only later source change is the additional component coverage. Fresh local browser verification was incomplete: Playwright timed out on the initial page load before any test action, and Galaxy exceeded its startup limit before the Selenium batch could run.

The pre-rebase fork head passed all 23 CI workflows that ran; CWL conformance and Pulsar package tests were skipped. Fresh CI on the final head is queued as of 2026-10-26.

</details>

- [x] This is a refactoring of components with existing test coverage.

<details><summary>Existing consumers retained</summary>

Reset-request, email/public-name and Best Practices tests now use the shared helpers while retaining their result assertions. DisplayApplications retains its component assertions for modern and legacy links.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
