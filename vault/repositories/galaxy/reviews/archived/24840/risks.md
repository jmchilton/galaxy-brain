Mostly a two-way door (datatype sniff/metadata code, no API or schema change), but the tightened Otu/Sabund sniffers change which uploads auto-detect as mothur types on a release branch, and datasets sniffed or metadata-set under the new rules keep those values until someone re-detects them.

<details><summary>Risk Details</summary>

- Otu and Sabund sniffers now require a first column that is `unique` or a cutoff `<= 1` (e.g. `0.03`), with no repeated labels. Files with other labels, like integer labels or cutoffs above 1, no longer auto-sniff as `mothur.otu`/`sabund`/`list`/`rabund` and fall through to a later datatype such as tabular.
- Sabund now rejects zero or negative counts and rows with fewer than 3 columns, so it accepts fewer files.
- CountTable `set_meta` now passes `skip=1` and `max_data_lines=MAX_DATA_LINES` to `Tabular` and drops its manual `comment_lines`/`data_lines` adjustment. Line counts for large count tables may now be estimated rather than exact, and `comment_lines` comes from the parent class.
- GroupAbund ignores blank lines and sets `skip` from whether a header was seen, not from the last line read. This changes metadata for files whose header was not the last line.
- Empty datasets of AlignCheck, DistanceMatrix, CountTable and SffFlow now keep default metadata where they previously errored or got negative `data_lines`. Tools that read these fields get defaults (`columns 0`, `groups []`).
- Lower-triangle and square distance matrix sniffers now return False on empty or comment-only input. Previously they could raise or match.
- Metadata is stored per dataset, so existing datasets are unaffected until metadata is regenerated. Datasets created after the release keep the new values even if the change is reverted.

</details>

<details><summary>Risk Review Advice</summary>

Focus on the label regex and the `<= 1` bound in `is_mothur_label`. Check that they match every label mothur actually writes, such as `unique`, `0.03` and `1.00`, and any label formats from older mothur versions or other producers. A false negative here quietly changes auto-detection for real user uploads on a stable branch. Note that test-data `.otu`/`.sabund` files with non-conforming labels would now sniff differently.

Also confirm that the CountTable `set_meta` switch to `Tabular` skip/max_data_lines handling gives the same `data_lines`/`comment_lines` as before for normal tables. Mothur tool wrappers that use `metadata.groups` or `columns` should work with the empty-table defaults.

</details>
