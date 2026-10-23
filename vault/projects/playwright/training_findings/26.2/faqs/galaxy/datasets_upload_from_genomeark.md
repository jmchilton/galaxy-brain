# faqs/galaxy/datasets_upload_from_genomeark.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `0cd9f75f9d1` (`faq_server.sh main`). The server now has
usegalaxy.org's anonymous **Genome Ark** S3 source, which needs network.
- Walked Upload > Choose Remote Files > Genome Ark > `species/Taeniopygia_guttata/bTaeGut1/genomic_data/pacbio`.
  `species` has 948 folders over many pages, so search finds the species. `pacbio` has several pages.
- Imported a 16-byte `.bai`.
- Embedded in `assembly/vgp_genome_assembly` and `assembly/vgp_workflow_training`.

## GTN

- `genomeark-choose-remote` (main): "**Choose remote files** tab" is the **Choose Remote Files**
  method, and <kbd>Ok</kbd> is **Add Selected Files** then **Start**. 26.1 had **Choose from
  repository** and **Select**, so it was wrong there too.
- The rest holds: the **Genome Ark** source, **species**, the
  `/species/Genus_species/specimen/genomic_data` path, and "multiple pages".

## Galaxy

- Bug, fixed (`0cd9f75f9d1`) and queued (`remote_files_upload_long_names_overlap`). PacBio run names
  (~70 characters, no spaces) ran under the Details column, so the `.bam`, `.bai` and `.pbi` of a
  run were unreadable. The name label now wraps. Checked by eye; no test.
- Abstraction (`de467e6fcb9`): the upload helpers couldn't open a folder, though 3 tutorials pass a
  remote-files `location`. Adds `open_remote_folder(source, path)` and `path=` on
  `stage_remote_file(s)`; each folder is searched, then opened. A click can land on a row the
  debounced search is about to replace, so it waits for the filtered list first. Adds
  `upload_activity.remote_files_current_folder`, `remote_files_browser_labels`, and
  `test_upload_from_remote_file_source_folder` (posix `subdir1/b`).
  - Green under Playwright and Selenium; the rest of `test_upload_activity_remote_files.py` is green
    under Playwright.
  - GenomeArk itself is untested in CI (no network).
- `faq_server.sh`: Genome Ark source.
- gxui: `upload-remote --path` (tip `7e323178dc0`).
