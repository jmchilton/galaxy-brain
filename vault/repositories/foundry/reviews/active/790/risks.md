Risks are minimal - this change only adjusts heuristics in the `summarize-nextflow` extractor, adds no schema or persisted-format change, and can be reverted cleanly (a two-way door).

<details><summary>Risk Details</summary>

- Test-input candidacy changes from a param-name allowlist to "value looks like a path or URL with a file extension". This widens what becomes a test input (the bacass `assets/test_config_dfast.py` change shows it) and drops extensionless values such as directory-style index paths unless another path catches them; downstream summaries for other pipelines may shift.
- `extractBlockAt` now treats every `//` and `/*` outside quotes as a comment. Groovy slashy strings or regex literals containing `//` or `/*` (e.g. `~/a\/\/b/`) would be misread and could truncate a block; previously the bug ran the other way.
- `stripTrailingLineComment` only treats a whitespace-preceded `//` as a comment, so `value//comment` with no space is kept verbatim.
- Adding `main.nf` to the `getGenomeAttribute` scan and the primary-workflow side effect (`PREPARE_GENOME` to `NFCORE_RNASEQ`) change summary output for rnaseq and Sarek; anything consuming committed summaries sees different content.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should look at the new `isPathOrUrlValue` rule, since it replaces a name-based rule with a value-based one and affects every pipeline's test inputs; spot-check one or two pipelines beyond rnaseq, Sarek and bacass for unexpected additions or losses.

The comment-skipping in `extractBlockAt` is the root-cause fix and is worth a quick check against Groovy slashy-string and regex syntax, which the brace matcher does not model.

</details>
