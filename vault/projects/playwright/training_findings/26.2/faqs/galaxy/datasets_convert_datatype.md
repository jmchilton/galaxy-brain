# faqs/galaxy/datasets_convert_datatype.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `423abc6cdf8` (`faq_server.sh main`). The "Convert to
BAM" example on a SAM with a header: pencil > **Datatypes** > **Convert to Datatype** > Target
datatype `bam (using 'Convert BAM to coordinate-sorted BAM')` > **Create Dataset** ("The file
conversion of ... has been added to the Queue."); a new `bam` item appears. Embedded in 9 tutorials.

## GTN

- No findings. Section, gear icon, "Target datatype" and **Create Dataset** match 26.2. Options read
  `<datatype> (using '<converter>')`, lowercase (`bam`, not `BAM`) — marginal.

## Galaxy

- Gap: only the collection view's Convert tab was tested. Added
  `test_history_dataset_convert_datatype` (`423abc6cdf8`, tsv to csv, the framework's only python-only
  converter) with `edit_dataset_convert` and `edit_dataset_attributes.conversion_dropdown`,
  `conversion_option(datatype)` (by `data-option-value`) and `convert_button`. Green under Playwright
  and Selenium.
- Server, not GTN: the SAM/BAM converters failed with `samtools: command not found`. bioconda has no
  osx-arm64 samtools 1.17 (the converters' pin), so `faq_server.sh` now keeps a conda env of converter
  tools at `~/.cache/gxui-faq/tool_deps` (samtools 1.24) on the server's PATH.
- `test-data/1.sam` isn't valid SAM (an `@QNAME` header line); samtools can't read it.
- gxui: `dataset-convert HID DATATYPE` (tip `3e3bea0fcaa`).
