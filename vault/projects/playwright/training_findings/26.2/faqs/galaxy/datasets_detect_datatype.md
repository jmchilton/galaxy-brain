# faqs/galaxy/datasets_detect_datatype.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `53ab472b46d` (`faq_server.sh main`). A FASTA pasted as
`txt`: pencil > **Datatypes** > **Auto-detect**; the item becomes `fasta`. Embedded in 3 tutorials.

## GTN

- No findings. Pencil, the **Datatypes** tab and **Auto-detect** match 26.2.

## Galaxy

- Covered by `test_history_dataset_auto_detect_datatype`. Lifted its clicks into
  `edit_dataset_auto_detect_datatype` (`53ab472b46d`) so gxui shares them; the test keeps its
  assertions. Green under Playwright and Selenium.
- After Auto-detect the edit view reloads onto the Attributes tab and the success alert can be gone
  before a slow observer looks (the E2E sees it). gxui waits on the dataset instead.
- gxui: `dataset-detect-datatype HID` (tip `2e5ed648b97`).
