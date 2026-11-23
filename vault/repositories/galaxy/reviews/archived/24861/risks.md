Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 15b1e13ac15c5624cab3593a5eecf73850a8f54a

This changes the meaning of `md5`/`checksum` on tool and workflow test outputs that also set `decompress: true` (checksum is now taken over the decompressed content), a semantic choice for tool/workflow test artifacts that is hard to walk back once tools are written against it, and it lands on a release branch.

<details><summary>Risk Details</summary>

- Existing tool tests that combine `decompress="true"` with an `md5`/`checksum` of the compressed file, and pass today, will start failing after upgrading to this 26.1 point release.
- Once tools (IUC, IWC workflow tests) adopt checksums of decompressed content, reverting would break those tests, so the new semantics are effectively permanent.
- The XSD/schema docs now promise this behavior, publishing it as part of the tool-format contract.
- For zip outputs only the first member is checksummed, so a decompressed checksum can pass while other members differ.
- Decompression failures in checksum checks now raise a new assertion error path instead of comparing raw bytes.

</details>

<details><summary>Risk Review Advice</summary>

Decide whether redefining checksum semantics under `decompress` is a bug fix suitable for `release_26.1` or a behavior change better targeted at `dev`; a quick search of tools-iuc and IWC for tests combining `decompress` with `md5`/`checksum` would show whether anything currently relies on the old behavior.

The `decompress_bytes` refactor in `verify_assertions` is a two-way door; reviewers can focus on the checksum branch in `verify()` and the zip first-member caveat.

</details>
