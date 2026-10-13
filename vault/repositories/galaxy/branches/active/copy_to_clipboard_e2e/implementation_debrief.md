# Implementation debrief — copy_to_clipboard_e2e

Head `c934fe06fc8`, one commit on top of #24104's `a46c20900d5`. Worktree `~/projects/worktrees/galaxy/branch/copy_to_clipboard_e2e`. It has no `.venv` of its own; runs borrowed `selenium_stories_core`'s.

## What changed

- `lib/galaxy/selenium/clipboard.py` (new): a `ClipboardCapture` protocol with `wait_for_text()`, and `RecordedClipboard`, which replaces `navigator.clipboard` with a recorder on enter and deletes the override on exit.
- `NavigatesGalaxy.capture_clipboard()`: the single entry point. To read the real clipboard instead (e.g. Playwright `grant_permissions` + `readText()`), change the class this method builds; tests stay the same.
- `test_personal_information.py::test_copy_api_key`: copies the key, asserts the copied text equals the key, then waits for the "Key was copied to clipboard" toast. Shared setup is extracted into `_create_api_key()`.
- `navigation.yml`: new top-level `toast` component (`message`, `message_with_text`) and `preferences.api_key_copy_button`. `APIKeyItem.vue` gains `data-description="copy api key"`; it falls through `CopyToClipboard` to `GButton`.
- Consumers migrated: the inline stub in `test_custom_tools.py::test_authoring_documentation_interactions` and the raw toast selector in `test_data_source_tools.py`.

## Evidence

- Red: with dev's `CopyToClipboard.vue` swapped back, the Playwright run fails with `TimeoutAssertionError: … waiting on text to be copied to the clipboard`.
- Green, Playwright and Selenium: `test_copy_api_key`, `test_api_key`, `test_authoring_documentation_interactions`. Run against this worktree's Galaxy on 8092 (master key `TEST123`, admin `test@bx.psu.edu`, beta tool formats) plus Vite 5182.
- `test_data_source_tools` was not run (needs the framework test toolbox). The new `toast.message` resolves to the identical CSS selector.
- ruff, black, isort, mypy (from `lib/`) and pre-commit are clean.

## Not done

- The `libraries.folder.toast_msg*` selectors duplicate the new top-level `toast`. Their only reference is a commented-out line, so they were left alone.
