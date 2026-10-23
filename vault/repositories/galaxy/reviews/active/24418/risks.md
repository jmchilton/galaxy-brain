Profile: gx_risk_assessment · Model: claude-opus-5-5 · Effort: low · Reviewed commit: bdfe24d00ed

Risks are minimal - this change only adds opt-in `validate()` implementations for `twobit` and `lav` plus unit tests, so it doesn't lock Galaxy into difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Validation runs only where Galaxy already requests datatype validation; no API, schema, tool, or workflow contract changes.
- New behavior is a stricter definition of "valid": a `lav` file without a trailing `#:eof` line, or a `twobit` whose last indexed record extends past EOF, will now be marked invalid. Producers that omit `#:eof` (non-lastz/blastz writers) would be flagged; reverting is a one-commit rollback.
- TwoBit check reads only the header, index, and the last record header, so cost stays small even for large genomes.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should confirm that `#:eof` is reliably written by the LAV producers Galaxy users rely on (lastz, blastz) and that the TwoBit end-offset arithmetic (n blocks, mask blocks, reserved word, packed DNA) matches the UCSC spec for both v0 and v1 files.

</details>
