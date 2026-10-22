# Library folder "Download" Selenium test never runs, and would fail if it did

`test_library_contents.py` has a test for downloading selected library datasets as a zip, but it is named `download_dataset_from_library`, without the `test_` prefix, so pytest never collects it.

```python
    @selenium_test
    @requires_admin
    @requires_new_library
    def download_dataset_from_library(self):
        self.test_import_dataset_from_history()

        self.components.libraries.folder.select_one.wait_for_and_click()
        self.components.libraries.folder.download_button.wait_for_and_click()
        self.sleep_for(self.wait_types.UX_RENDER)
        folder_files = os.listdir(self.get_download_path())

        expected_filename = "selected_dataset_files.zip"
        assert expected_filename in folder_files
```

The library folder's **Download** button (selected items as a zip) has no browser coverage. Renaming the test is not enough. Two of its other expectations don't match current `dev` (0073b5e9224):

| What the test uses | Test expects | `dev` has |
| --- | --- | --- |
| `libraries.folder.download_button` (`navigation.yml`) | `#download-btn` | `<GButton id="download--btn">` in `FolderTopBar.vue` |
| zip name | `selected_dataset_files.zip` | `archive_name="selected_library_files"` in `api/library_datasets.py` `download()` |

<details><summary>History</summary>

- The test was added in 164c3216b74 (2020-08), already without the `test_` prefix. It then clicked a download dropdown, and the server named the archive `selected_dataset_files`.
- 59aeb996bb2 (2020-12) replaced the dropdown with `<button id="download--btn">` and, in the same commit, pointed the test at a new `download_button: '#download-btn'` selector. That selector has never matched.
- d4552d31cb0 (2020-12) renamed the archive to `selected_library_files`. `selected_dataset_files` now appears only in this test.

</details>

## Proposed Approach

Rename the test to `test_download_dataset_from_library`, give the button a stable hook (fix the `download--btn` id typo or add a `data-description`) and point `libraries.folder.download_button` at it, and expect `selected_library_files.zip`. Then run the test under Selenium and Playwright and fix whatever else has drifted.

<details><summary>Approach details</summary>

- `get_download_path()` returns the Selenium driver's fixed download directory (`/tmp/`). A leftover zip from an earlier run would make the `in os.listdir(...)` check pass without a download. Clearing the file first, or waiting for it to show up, makes the assertion mean something.
- `sleep_for(UX_RENDER)` may not be long enough for the archive to finish downloading. Polling for the file is sturdier.
- Playwright saves downloads differently from Selenium, so the download check may need a per-driver helper, or the test can be marked `@selenium_only("...")`.

</details>

## Alternative Approaches

Delete the test and cover `/api/libraries/datasets/download/{archive_format}` with an API test instead (none exists today). That would be cheaper and more reliable than checking a browser download, and is worth adding either way. But it leaves the button untested: its selection handling and the "You must select at least one dataset to download" toast. Only a browser test checks those, so fixing this one is preferred.

<details><summary>Alternatives In Detail</summary>

### Alternative: Remove the browser test and rely on API coverage

<details><summary>Description</summary>

#### Details

Delete `download_dataset_from_library` and the `libraries.folder.download_button` selector. Add an API test for `/api/libraries/datasets/download/zip`; no API test hits this endpoint today.

#### Why the proposed approach is preferred

An API test can't catch a broken button, a wrong selection payload, or a UI regression. Those are what this test was written to cover. The fix is small, and it adds real coverage of a user-facing feature.

</details>

</details>
