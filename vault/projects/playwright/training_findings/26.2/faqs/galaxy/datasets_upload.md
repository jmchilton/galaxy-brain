# faqs/galaxy/datasets_upload.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `865d70395e8` (`faq_server.sh main`). Uploaded `1.bed` and
`1.fasta`, picked together, through Upload > **Upload from Computer**. Embedded by 4 tutorials
(`ecology/remote-sensing`, `microbiome/beer-data-analysis`, `microbiome/lotus2-identifying-fungi`,
`microbiome/mgnify-amplicon`).

## GTN

- `upload-tool-panel-button` (main): step 1's **Upload Data** is the Activity Bar's **Upload**.
- `upload-import-data-panel` (version): 26.2 has no **Choose local file**, "Drop files here" or
  **Close**. It's **Upload from Computer** > **Browse Files** (or drop on "Drag files here") > **Start**.

## Galaxy

- No test picked several files in one chooser selection; chained `stage_local_file` calls exist only
  for collections. `865d70395e8`: `set_file_input` takes a list, `stage_local_files`,
  `test_upload_files_from_one_selection`. Green under Playwright; under Selenium 2 of 3 runs passed,
  and the first failure's output wasn't kept. Not run red (it needs the new helper to run at all).
- gxui: `upload-file` takes several paths, picked in one selection.
