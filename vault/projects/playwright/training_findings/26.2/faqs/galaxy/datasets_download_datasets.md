# faqs/galaxy/datasets_download_datasets.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `0b9b1788274` (`faq_server.sh main`). A pasted txt:
expand it, the Download (save) icon. Embedded in `introduction/galaxy-intro-rdm`.

## GTN

- No findings. Expanding the item and the Download icon match 26.2.

## Galaxy

- The Download button's link is now `/api/datasets/{id}/download?to_ext=...`, which always 302s to
  `/display` (26.1 linked `/display` directly). Browsers follow it; see
  `datasets_download_using_command_line.md` for what it breaks.
- Covered: `_assert_downloadable` (button present) and `test_dataset_metadata_download` (clicks it).
  Added `test_history_dataset_copy_link` (`0b9b1788274`): the Download href and Copy Link URL are the
  same download link. No test checks the downloaded file; Playwright and Selenium save downloads
  differently, so a shared helper would be a bigger job.
- `test_library_contents.download_dataset_from_library` lacks the `test_` prefix, so it never runs.
- gxui: `dataset-copy-link HID` (tip `fa8cfda6c7c`); no verb saves a download.
