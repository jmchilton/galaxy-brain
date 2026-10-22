# faqs/galaxy/datasets_import_via_link.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `162dfdb49b4` (`faq_server.sh main`). Ran it three ways:
- one link with Type `interval` and Reference `mm9`;
- two links as a List;
- two links as a List of Pairs.

275 tutorials embed this FAQ. Their include params: `format` (29), `collection` (8), `collection_name`
(7), `collection_type` (List, List of Pairs, Paired: 1 each), `link`, `genome` and `box_type` (2
each), and `reset_form`, `pairswaptext` and `collection_name_convention` (1 each).

## GTN

Every 26.2 change is `version`. In 26.1, Upload was the modal dialog with Regular and Collection
tabs, Paste/Fetch data, Build, Reset and Close.

- Added to `upload-import-data-panel`:
  - **Paste/Fetch Data** is now the **Paste Links/URLs** method.
  - "Type (set all)" and **Genome** are now the table's **Type** and **Reference** columns. Their
    headers set all rows.
  - There's no **Close**: Start opens Upload Progress.
- `link-add-urls`: the pasted text only becomes rows (name, URL, Type, Reference) after **Add URLs**.
- `link-collection-switch`: the Collection tab, Collection Type dropdown, Build, Swap and
  Create list are gone.
  - Instead, the **Create a collection from these files** switch gives **Collection Name** and a
    **Collection Type** of List or List of Pairs. **Start** builds it directly.
  - A List of Pairs pairs the URLs in pasted order and previews Forward/Reverse. So
    `pairswaptext` becomes "paste the forward link first".
  - There's no single **Paired** type. `single-cell/scrna-preprocessing` passes
    `collection_type="Paired"`, so its fix has to choose List of Pairs or Build Dataset Pair after the
    upload.
  - Tutorials affected: `metabolomics/lcms`, `lcms-preprocessing`, `gcms`, `gc_ms_with_xcms`,
    `transcriptomics/full-de-novo`, `variant-analysis/trio-analysis`,
    `proteomics/maxquant-msstats-tmt` and `single-cell/scrna-preprocessing`.
- `link-reset-form`: there's no **Reset** button. Each time the Paste Links/URLs method opens it starts
  empty, so `galaxy-interface/collections`' `reset_form="True"` step should go.
- Screenshots: `datasets_import_via_link.gif` and `datasets_import_via_link_collection.gif` show the
  26.1 dialog (high).
- Not a finding: 4 metabolomics tutorials pass `renaming=false`, which the FAQ never reads.

## Galaxy

- Covered:
  - per-row name, Type and Reference on links (`test_upload_activity.test_multiple_paste_links`);
  - List and List of Pairs from links (`test_upload_activity_collection`).
- `test_upload_activity_collection` has its own navigation and collection-switch helpers, which
  duplicate `upload_context().to_list()`/`to_paired_list()`. Not refactored.
- Helper bug, fixed in `162dfdb49b4`: `start_for_uploaded_hids` counted one hid per staged file. A
  collection upload adds the collection, then its elements as hidden datasets, so
  `start_and_wait_for_uploaded_hids` waited on an element. The bug predates the branch (upstream's
  private `_start_and_wait_for_uploaded_hids`). Red to green via `test_upload_pair`, which now
  asserts `[1]`. Green under Playwright and Selenium.
- Minor, not filed: links `…/1.bed` and `…/2.bed` give a pair named `.bed`. `_guessNameForPair`
  only strips an extension past index 0.
- gxui:
  - `upload-url` gained `--dbkey`, `--collection NAME` and `--collection-type list|list:paired`.
  - `history-wait` (and so every upload) now fails on a collection whose `populated_state` is
    `failed`, e.g. one with a dead URL. Before, it waited out the deadline.
