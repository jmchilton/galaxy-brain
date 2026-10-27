# topics/assembly/tutorials/vgp_genome_assembly/faqs/dataset_upload_fastqsanger_via_urls.md — 26.2, UI run (main)

GTN `45d4932d33`, `galaxy_ui_driver` `cdbfecd0b71`. Replay: `dataset_upload_fastqsanger_via_urls.gxui.sh` (passes fresh).

- Same old-dialog problems as datasets_import_via_link: `upload-tool-panel-button`, `upload-import-data-panel`, `link-add-urls` (FAQ added to each). In 26.2: Activity Bar **Upload** > **Paste Links/URLs**, paste, **Add URLs**, header **Type** sets every row, **Start**.
- `fastqsanger-url-typos`: `fastaqsanger` (no such type), "corect", "URLs above" with none listed.
- All 5 images show the old dialog: `gtn_screenshots_26_2.yaml` (high).
- Another Galaxy held port 8091, so `faq_server.sh` now takes `FAQ_PORT`; run used 8093.
