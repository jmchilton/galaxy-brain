# Choose Remote Files: long file names overflow into the Details column

Found by the FAQ loop (`faqs/galaxy/datasets_upload_from_genomeark.md`, 26.2). Fix on `jmchilton/selenium_history_filters_ftp_notice` (extracted 2026-10-23, stacked on #24380), commit "Wrap long names in the remote files browser" (first made on `galaxy_ui_driver` as `0cd9f75f9d1`); target `release_26.2`. `origin/dev` is affected too (2026-10-23).

## Symptom

Upload > **Choose Remote Files** > **Genome Ark** > `species/Taeniopygia_guttata/bTaeGut1/genomic_data/pacbio`. File names there are ~70-character run IDs with no spaces (e.g. `m151218_064724_42161_c100952770310000001823221506251610_s1_p0.subreads.bam.bai`). The table is `fixed` layout, the name `<span>` sits in a flex row and can't break, so each name runs under the Details cell (size and date). Both columns are unreadable, and the `.bam`, `.bai` and `.pbi` files of one run look identical. The GTN GenomeArk FAQ asks users to pick files individually from exactly these folders.

## Fix

A new `upload-browser-label` mixin in `Panels/Upload/shared/upload-table-shared.scss` sets `min-width: 0; overflow-wrap: anywhere;`, so names wrap inside the Name column. `RemoteFilesUpload.vue` applies it to `.remote-files-browser-label`. (8d02e258acc "Aligns remote file browser labels" set `text-align: start` on that class for long names, but didn't make them wrap.)

The Import from Data Library browser (`DataLibraryUpload.vue`) had the same bug for both library names and folder/dataset names, and now uses the same mixin. Its commit is "Wrap long names in the data library browser too".

Tests (added on the extracted branch). Both measure the label against its column with `assert_label_within_its_column`, and both pass under Playwright and Selenium:
- `test_long_remote_file_name_stays_in_its_column`: red before the fix, with 733px of overflow.
- `test_long_data_library_names_stay_in_their_column`: red before the fix; the library name overflowed by 1063px and the folder name by 917px.
