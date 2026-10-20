# selenium_standalone_package

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:selenium_standalone_package?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_standalone_package)

## Status

Implemented on `dev`, head `bb1add2eeba`. 58 files, +365/−190 against dev.

No PR.

CI not yet observed.

## Scope

Makes `galaxy.selenium` usable outside the test suite:
- extraction step helpers move into `NavigatesGalaxy` (5a);
- public Playwright locators, upload hids and sub-components (5b);
- `resolve_component(path)` returns Targets (5c);
- docstrings on methods used outside the tests (5d);
- Upload Activity helpers move to `galaxy.selenium.upload_activity_helpers`, plus `workflow_run_wait_for_ok` (7k);
- test-framework context checks leave the package suite (7l);
- `galaxy_url` keeps a path prefix (7n).

**Consumer** (new commit, `bb1add2eeba`): `GalaxySeleniumContext` includes `UsesUploadActivity`, so a standalone `GalaxySeleniumContextImpl` can upload. Test classes drop their own `UsesUploadActivity` mixin; `TestDataset(UsesUploadActivity, SeleniumTestCase)` would otherwise be an MRO error. `UsesUploadActivity` comes first in the bases, because under `TYPE_CHECKING` it subclasses `NavigatesGalaxy`. The other order made mypy report ~1700 errors. `writing_tests.md` was updated to match. New E2E test `test_upload_activity.py::TestUploadActivity::test_paste_content_from_standalone_context`. The no-test-framework import check now covers `galaxy.selenium.context`.

**Dev-only fix-up in 7k:** dev's newer `test_workbook_mapping.py` imported the old `.upload_activity_helpers`. Its import was moved with the rest. Context conflict on 7n (the tool-form code isn't on this branch), resolved to the `urljoin` import and `galaxy_url` only.

Red → green:
- The new test passes under Playwright and Selenium. Without the mixin it fails with `AttributeError: … no attribute 'upload_context'`.
- Spot checks pass under Playwright: `test_uploads::test_upload_list`, `test_dataset::test_history_dataset_rename` (the MRO case), `test_workbook_mapping::test_dataset_mapping_from_workbook`, both extraction tests using the moved helpers, and `test_workflow_run::test_execution_with_multiple_inputs`.
- Every Selenium test module imports cleanly.
- The touched unit tests pass.
- mypy from `lib/` gives the same 23 errors as the other dev branches.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Once it merges, gxui's `GxuiContext` can drop its own `UsesUploadActivity`. A dev-only merge keeps these commits on `galaxy_ui_driver` until it restacks onto a base that has them. Open question: is it too big for one PR? 7k alone moves about 1,000 lines.
