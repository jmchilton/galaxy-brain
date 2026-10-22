# galaxy#24376 — Library folder "Download" Selenium test never runs, and would fail if it did

[Issue](https://github.com/galaxyproject/galaxy/issues/24376) · label `release-testing-26.2` · [proposal](proposal.md) · [debrief](debrief.md) · [source](issue_draft.md)

Filed 2026-10-22 from 26.2 release testing. `download_dataset_from_library` lacks the `test_` prefix. Its selector `#download-btn` doesn't match `id="download--btn"`, and it expects `selected_dataset_files.zip` but the server writes `selected_library_files.zip`.

Next: rename the test, fix the button hook and the zip name, wait for the download file, then run it under Selenium and Playwright.
