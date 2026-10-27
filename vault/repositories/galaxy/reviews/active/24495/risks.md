Profile: gx_risk_assessment · Model: Opus 5.5 · Effort: low · Reviewed commit: d3a03e397a7a4be40bea03e3a2dbc133122218ee

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is a narrow fallback inside `get_fileobj_raw` (no API, tool, workflow, or UI contract changes) plus a small test fixture, and reverts cleanly.

<details><summary>Risk Details</summary>

- Any file where `zipfile.is_zipfile` is true but `ZipFile()` raises `BadZipFile` is now read raw instead of erroring. That includes genuinely truncated/corrupt zips, which previously failed loudly in sniffing and datatype code and will now be treated as uncompressed bytes (possibly sniffed as some other datatype).
- `get_fileobj_raw`/`get_fileobj` are shared by sniffing and many datatype `set_meta`/`sniff`/display paths, so the fallback applies broadly, not only to uploads.
- Only `BadZipFile` is caught; other failures (e.g. an empty archive's `namelist()[0]` `IndexError`, unsupported compression) still raise as before.
- Adds a binary fixture to `test-data/` on a release branch; harmless but permanent in history.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether silently treating a corrupt real zip as uncompressed data is acceptable versus the previous hard failure; it is the only user-visible behavior shift. Otherwise the change is a local, reversible bug fix appropriate for a 26.2 backport.

</details>
