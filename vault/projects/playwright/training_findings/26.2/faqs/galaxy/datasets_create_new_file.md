# faqs/galaxy/datasets_create_new_file.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `f0f2a98992e` (`faq_server.sh main`). The "specific file"
example plus a genome: Upload > **Paste File Content**, paste space-separated text, name it
`SARS-CoV-2 feature mapping`, Type `tabular`, Reference `hg19`, tick **Spaces→Tabs**, **Start**. The
item is tabular, hg19, 3 tab-separated columns. Embedded in 20 tutorials.

## GTN

- "**Upload Data** at the top of the tool panel": there's no such button, in 26.1 either; upload is
  the Activity Bar's **Upload** (`upload-tool-panel-button`).
- 26.2 replaces the upload dialog with the Import Data panel (`upload-import-data-panel`; 26.1's
  Upload still opens the dialog with **Paste/Fetch data**):
  - **Paste/Fetch Data** is the **Paste File Content** card; its form opens in the center panel.
  - The default name is "Pasted Dataset 1", not "New File".
  - **Genome** is the **Reference** column.
  - **Convert spaces to tabs** is a per-row **Spaces→Tabs** checkbox, not a Settings (gear) menu item.
  - There's no window to **Close**; Start switches the center panel to Upload Progress.

## Galaxy

- Covered: `test_paste_content` (name, type, genome). Gap: Spaces→Tabs. Added
  `test_paste_content_spaces_to_tabs` (`f0f2a98992e`) with `UploadMetadata` `space_to_tab`,
  `UploadItem.set_space_to_tab` and `upload_activity.row_space_to_tab_checkbox`/`_label` (by title;
  the checkbox has no test id). Green under Playwright and Selenium.
- At 1280px with the Import Data panel open, the row table is wider than the center panel: Reference
  and Spaces→Tabs sit off to the right behind a horizontal scroll.
- gxui: `upload-paste` gains `--dbkey` and `--space-to-tab` (tip `fa8cfda6c7c`).
