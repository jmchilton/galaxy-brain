# Screenshots successfully obtained

Independent screenshot review of `fix_story_a11y` completed on 2026-10-10 using pinned Node 22.20.0, installed Playwright, and Chromium. Read `GX_PROCESS_SCREENSHOTS.md` and its referenced `Component - E2E Tests - Writing.md` guidance. Captured the original strict stories overlaid with dev-based production repairs in the disposable Storybook at `http://localhost:6027`; the original server at 6017 was only read for comparison and was not changed.

All 22 final PNGs are saved in the branch notes' ignored `screenshots/` directory. Every final image was opened with `view_image`. Component screenshots use 1280- and 400-pixel browser widths, with a 1000-pixel viewport height and full-page capture. Captures waited for Storybook's render phase to reach `finished`, including story interaction steps. The observed document widths matched the browser widths for all seven primary stories at both sizes.

| Area / story state | Screenshots | Review result |
| --- | --- | --- |
| List collection, two datasets offered | [Desktop](screenshots/list-collection-1280.png), [Narrow](screenshots/list-collection-400.png) | Separate transfer arrows and editable dataset names render together at the column's left edge. The original far-right label gap was caught during review, repaired by the implementing agent, and these images were replaced and inspected after the fix. Transfer buttons measure approximately 27.89 x 24 CSS pixels. |
| List collection after selecting three datasets and refreshing history | [Desktop](screenshots/list-selected-1280.png), [Narrow](screenshots/list-selected-400.png) | Selected rows retain the requested order, with separate left-facing deselect arrows and readable dataset names. The story's interaction sequence completed successfully at both sizes. |
| Pair collection initial state | [Desktop](screenshots/pair-collection-1280.png) | Dataset buttons remain readable. The pre-existing reverse-label display issue is described below; this component is additional coverage, not evidence that issue is fixed. |
| FilesDialog, selected directory contents | [Desktop](screenshots/files-folder-controls-1280.png), [Narrow](screenshots/files-folder-controls-400.png) | Native folder controls, file labels, selection checkboxes, indeterminate directory selection, and Back / Cancel / Select buttons are readable and remain within the modal at both sizes. |
| FilesDialog, root sources with Accessibility panel | [Clean accessibility panel](screenshots/files-clean-accessibility-panel.png) | Verified the actual sources rendered and Storybook phase was `finished`; Accessibility reports **0 violations, 26 passes, 0 inconclusive**. This checks an actual component scan, not an empty or failed story. |
| RoleForm, open Users search | [Desktop](screenshots/role-users-picker-1280.png), [Narrow](screenshots/role-users-picker-400.png) | Required field labels, role type, groups picker, Users textbox, and matching user option are readable. Open menu overlays the Create button as expected for a dropdown. |
| RoleForm, existing role with selected group and user | [Desktop](screenshots/role-selected-1280.png), [Narrow](screenshots/role-selected-400.png) | Selected chips fit at both sizes. Their native remove buttons measure **24 x 24 CSS pixels**, have `tabindex=0`, and are named `Remove Bioinformatics core` and `Remove alice@example.org`. |
| ToolCard, admin options menu | [Desktop](screenshots/tool-options-1280.png), [Narrow](screenshots/tool-options-400.png) | Heading and menu triggers render without nested button appearance. All five admin options are readable; narrow menu stays within the viewport. |
| ToolCard, versions menu | [Desktop](screenshots/tool-versions-1280.png), [Narrow](screenshots/tool-versions-400.png) | Selected and alternate versions are readable. Captured after opening Select Versions once the original story completed. |
| InstallationSettings, installation modal | [Desktop](screenshots/installation-dialog-1280.png), [Narrow](screenshots/installation-dialog-400.png) | Installation heading, close button, associated Target Section label/control, helper text, advanced settings toggle, and footer actions remain readable and aligned. |
| Mixed quotas | [Desktop](screenshots/quota-summary-1280.png), [Narrow](screenshots/quota-summary-400.png) | Percentage labels remain readable; used, full, and unlimited bars retain their expected distinct display. Narrow text wraps without horizontal document overflow. |
| Workflow invocation, failed job while another runs | [Desktop](screenshots/workflow-progress-1280.png), [Narrow](screenshots/workflow-progress-400.png) | Colored scheduling/job progress bars retain their expected state, and dark progress text remains readable. Narrow labels truncate within their existing compact bars; tabs wrap and graph remains contained. |

## Existing E2E screenshot relevance

The branch does not add or alter Selenium screenshot tests. Existing relevant capture points already include:

- `lib/galaxy_test/selenium/test_collection_builders.py`: `collection_builder_wizard_list`, `collection_builder_paired_list`, and other collection builder captures.
- `lib/galaxy_test/selenium/test_admin_role_and_user_forms.py`: `admin_role_edit` and `admin_user_roles_and_groups`.
- `test/integration_selenium/test_admin_quotas.py`: `admin_quota_manage_users_and_groups`.
- `lib/galaxy_test/selenium/test_workflow_invocation_details.py`: `invocation_step_jobs` and failure-state job-detail captures.

`test/integration_selenium/test_upload_file_sources.py` and `test_upload_activity_remote_files.py` also exercise file source upload flows, although those files do not declare a dedicated screenshot capture for the repaired folder-control state.

These existing points show where live Galaxy composition could be reviewed. This pass intentionally used the strict Storybook fixtures to isolate the actual repaired controls, modal states, dropdowns, and bars at two widths. That is adequate component-level visual evidence for these repairs and complements the separately run strict browser suite. **It is not a live Galaxy Selenium run**, and does not prove routing, real backend requests, surrounding app layout, or every screen using the shared components. No inherited E2E tests were changed or run by this reviewer.

## Capture issues and inherited limitations

- Concurrent disposable-server hot reload briefly invalidated manager sessions (one partial capture reached a mocked 404 state; another rerender hit a `$route` property redefinition). Those unsuccessful captures were discarded. The final FilesDialog panel image was taken in a fresh browser context with its source list visible and successful render phase verified.
- At 400 pixels, the collection Name input remains cramped. Compared original server 6017 and repaired server 6027: the field measures **65.59 pixels on both**, versus **566.06 pixels on both** at desktop width. This is inherited layout debt, not a regression introduced by this repair. The same `Processing...` status appears in both original and repaired list screenshots.
- The additional PairCollectionCreator story displays `function reverse() { [native code] }:` as its reverse label on both original 6017 and repaired 6027. That inherited issue was reported to the implementing agent for follow-up and is outside these accessibility repairs.

The newly introduced collection alignment issue was resolved and rechecked. No unresolved screenshot blocker for this branch remains. These PNGs are review artifacts, not committed visual-diff baselines or a claim of complete accessibility coverage. This reviewer did not edit application files, stage changes, or commit.
