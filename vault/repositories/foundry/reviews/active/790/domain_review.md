# Domain review: galaxyproject/foundry#790

- Profile: foundry_domain_review (`wf_foundry/reviewers/foundry_domain_review.md`)
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `a84e0df5ce5c8893c6569ed1ed1bfd1d11da2925`

The PR is resolver code, tests and a changeset. It touches no Mold, Pipeline, scenario or eval text, so most of the checklist (§2, §3) does not apply. The Mold body already says `getGenomeAttribute` assignments can live in `main.nf` (`content/molds/summarize-nextflow/index.md` §params), so the resolver now matches it. Cast drift was reported clean.

## P2 1 — Reference-data research note now misstates where `getGenomeAttribute` provenance comes from

Checklist: §6.2 (reproducibility: changed behavior keeps its references in step), §6.6 (the note is a live Mold reference).

`content/research/nextflow-reference-data-classification/index.md` is loaded by `nextflow-summary-to-galaxy-reference-data` and `nextflow-summary-to-galaxy-interface`. It tells the runtime agent:

- line 39 ("None"): detection is "no `getGenomeAttribute` call in `nextflow.config`";
- line 72 ("key-expanded bundle"): `source_path` points "at `conf/igenomes.config` or `conf/genomes.config`. The resolver scans these files explicitly (galaxyproject/foundry#229)".

After 9c0bde9d the resolver also scans `main.nf`, and on nf-core/rnaseq all 14 `getGenomeAttribute` params now carry `source_path: main.nf`. An agent following line 72 could miss rnaseq's bundle, and one following line 39 could call it "None".

Fix: state detection by `params[].source_kind == "getGenomeAttribute"` alone, with no list of files, and drop the `(galaxyproject/foundry#229)` issue-history clause (§4 archaeology).

## P2 2 — Test-input selection now guesses from the value's file suffix and ignores the schema's declared path format

Checklist: §6.1 (source authority beats local copies), §6.3 (deterministic tools do deterministic work).

5d6fd074 drops the param-name allowlist (`isFixtureParam` plus the name regex). In its place, `isPathOrUrlValue` keeps any value whose last path segment ends in a 1–8 character alphanumeric suffix that isn't a size or time unit. nf-core pipelines already declare which params are paths: `nextflow_schema.json` `format: file-path | directory-path | path`. The resolver reads that schema elsewhere. The suffix heuristic gets both directions wrong:

- It drops extensionless or directory-valued paths and URLs, such as a pre-built index directory or an `s3://…/index/` prefix. The old name regex caught these through `genome`, `reference`, `db` and `database`.
- It admits dotted non-path strings. A version-like value such as `WBcel235.105` or `GRCh38.p14` ends in a suffix and now counts as a test input.

Fix: when `nextflow_schema.json` declares a path format for the param, decide from that format. Use the suffix heuristic only as a fallback for pipelines without a schema. Add a resolver test for a directory-valued param and for a dotted non-path value. The bug-checking reviewer owns confirming the exact misfires on the pinned fixtures; the domain ask is to use the declared format.

## P3 1 — Dead boolean check in `isCandidateInputParam`

Checklist: §4 (no accretion of code that cannot fire).

`if (/^(?:true|false)$/u.test(value)) return false;` can never change the result. `true` and `false` have no suffix, so `isPathOrUrlValue` already rejects them. The rnaseq integration test and the synthetic resolver test (`skip_bbsplit`) pass with or without the line. Remove it, or say in the test that the suffix rule is what excludes booleans.

## Not raised

- The rnaseq primary workflow moves from `PREPARE_GENOME` to `NFCORE_RNASEQ`, and the selection rule is deferred to part 3. The PR description calls this out explicitly, so the change is acknowledged, not left as a known-wrong shape (§5).
- The integration tests pin counts (`toHaveLength(20)`, `56`, `11`) to the fixture pins. These are fixture claims in tests, not prose, and the pins are explicit (§6.2).
- No upstream workaround (§1), no new runtime dependency, no generated files hand-edited.
