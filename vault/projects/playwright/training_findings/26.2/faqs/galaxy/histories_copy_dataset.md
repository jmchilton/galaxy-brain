# faqs/galaxy/histories_copy_dataset.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `7ee70847cf8`. Used by metabolomics/gcms and lcms, single-cell (bulk-music-4-compare,
scrna-data-ingest) and transcriptomics/ref-based (plus its translations). Replay: `histories_copy_dataset.gxui.sh`.

- `copy-dataset-stale-steps` (main), method 1:
  - History options is now ☰ (`galaxy-history-options`), not the gear.
  - The page is "Copy Datasets and Collections" and its button is **Copy Selected Items**, not
    "Copy History Items".
  - The success link opens the new history's page, where **Switch to this history** makes it current.
  - Step 5 is numbered twice.
- Method 2 says "dropdown arrow" for the same ☰ menu and numbers step 3 twice. **Select histories**
  and **Change Selected** still exist.
- `finding-datasets-user-menu` (main), method 3: there is no **User > Datasets**; it's the Activity
  Bar's **Datasets**. The row action is **Copy to current history**.

Galaxy:
- Method 1 is covered by `test_copy_hdca`. Added the gxui verb
  `history-copy-datasets HID... --new-history NAME`, and a docstring on `history_panel_click_copy_elements`.
- Method 2 (Multiview drag) works with `dataset-copy`, and `test_copy_dataset_between_columns` covers it.
- Method 3: the Datasets list's **Copy to current history** has no E2E test and no gxui verb (gap, not
  added).
