Polished TRS manual-import waits using the existing navigation target and typed the newly added browser cases and shared launch helper.

Read the E2E writing and smart-component notes, then inspected the public/owned preview tests, TRS launch tests, manual import callers, navigation targets, and shared click/wait implementation.

Changes applied directly to `test/integration_selenium/test_trs_import.py`:

- `_click_wizard_import_button()` now calls `workflows.import_next_button.wait_for_and_click()`. This reuses the existing `.go-next-btn` navigation target and its enabled/clickable wait instead of constructing a raw DOM selector and adding a fixed UX_RENDER sleep.
- Removed the obsolete `wait_for_validation` parameter and its five caller arguments. Manual search, ID, and URL import callers share the same observable button-readiness wait.
- Added `-> None` to the four new run-form test methods and typed `_import_workflow_by_url(import_url: str, run_form: bool = False) -> None`, avoiding new untyped-definition diagnostics in the strict integration test package. The touched manual-click helper is also annotated.

The earlier challenge step added the standard `selenium_test` wrapper to the four new browser cases. No other source was changed here; temporary client reversions used by the primary's baseline experiment were left untouched.

The extracted `workflow_preview_open()` helper already centralizes the public/default-tab card action and waits for the preview container. The launch helper is shared across all auto-import variants. Browser actions use navigation.yml targets; existing data-description hooks cover both Import controls, and the scoped Run href target expresses the actual run route without depending on translated text or layout. Further DOM decoration or client refactoring is not needed.

The public flow records its preview and pre-import run form. TRS launch cases wait for the run URL and compare its workflow ID and stored version provenance to the actual import; they do not require a rendered Run button or capture the resulting page because the standard test server lacks the live workflows' Tool Shed tools. Actual run-form rendering is covered by the local public-workflow fixture. Final screenshot capture and visual verification belong to the scheduled screenshot step. No fixed sleeps remain in the TRS test file. Existing diagnostic page-error collection was preserved because it reports remote-service errors rather than driving UI interactions.

Pinned `isort`, `black`, and `git diff --check` pass. Browser runs remain with the primary to avoid concurrent browser/server use; rerun the four decorated run-form cases and representative manual imports with these changes. The subsequent baseline-refactor step relocated the already-working `trs_version_id` case into the first baseline commit without changing the final tracked tree.
