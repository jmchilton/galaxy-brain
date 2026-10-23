# Choose Remote Files: long file names overflow into the Details column

Found by the FAQ loop (`faqs/galaxy/datasets_upload_from_genomeark.md`, 26.2). Fix on `jmchilton/galaxy_ui_driver` (`0cd9f75f9d1`, "Wrap long names in the remote files browser"); target `release_26.2`. `origin/dev` is affected too (2026-10-23).

## Symptom

Upload > **Choose Remote Files** > **Genome Ark** > `species/Taeniopygia_guttata/bTaeGut1/genomic_data/pacbio`. File names there are ~70-character run IDs with no spaces (e.g. `m151218_064724_42161_c100952770310000001823221506251610_s1_p0.subreads.bam.bai`). The table is `fixed` layout, the name `<span>` sits in a flex row and can't break, so each name runs under the Details cell (size and date). Both columns are unreadable, and the `.bam`, `.bai` and `.pbi` files of one run look identical. The GTN GenomeArk FAQ asks users to pick files individually from exactly these folders.

## Fix

`RemoteFilesUpload.vue` scoped style: `.remote-files-browser-label` gets `min-width: 0; overflow-wrap: anywhere;` so names wrap inside the Name column. (8d02e258acc "Aligns remote file browser labels" set `text-align: start` on the same class for long names, but not wrapping.)

No automated test: a CSS overlap check isn't worth an E2E. Verified by eye on the FAQ server.
