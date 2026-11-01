# tools-iuc `map_param_value` sanitizes `unmapped.default_value` but not mapping values, so a bcftools format string is mangled

- Target: galaxyproject/tools-iuc (`tools/map_param_value/map_param_value.xml`, version 0.2.0). Foundry tracking needed: yes, label `upstream/tools-iuc`; local pattern change in 52808616 (map-workflow-enum-to-tool-parameter rev 4) carries the workaround.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-viralrecon-v0-2026-10-31, phase 10 attempt 3 (Nanopore `test_nanopore`, 70.5 min, 1 job error), Galaxy release_26.1, map_param_value @ 022a635f2283, 2026-11-01. Ledger `map-param-value-default-value-is-sanitized` (major). Repair R2.
- Existing issues/PRs: tools-iuc PR [#4847](https://github.com/galaxyproject/tools-iuc/pull/4847) "Disable sanitizer for map_param_value expression tool" (merged 2022) covered `input_param`, `from`, `to` only. No issue for `default_value`. Related: #5381 (boolean output display).

## Symptom
Step "bcftools query format" used `on_unmapped: default` with `default_value: "%CHROM\t%POS...[%AD\t]\n"`. iuc bcftools_query 1.24 received `--format 'XCHROMXtXPOS...__ob__XADXt__cb__Xn'`; the query tables held only literal header rows and the variants long table failed (`KeyError: 'AD'`). The same string as a mapping `to:` value survives.

## Root cause
`map_param_value.xml` (tools-iuc main): `input_param`, `from` and `to` each carry `<sanitizer sanitize="false"/>` (lines 4-12), but `<param name="default_value" type="text" .../>` (line 85) has none, so Galaxy's default text sanitizer maps `%`→`X`, `\`→`X`, `[`→`__ob__`, `]`→`__cb__`. The expression returns `$job.unmapped.default_value` unchanged (line 46). The tool's own test "mapping works in the presence of usually sanitized characters" (lines 123-132) covers only `to`. Confidence: high.

## Evidence
Run `foundry-feedback.ledger.yml` entry above (rendered command line, KeyError); attempt 4 passed after R2 moved both strings into explicit mappings with `on_unmapped: fail`.

## Proposed fix
Add `<sanitizer sanitize="false"/>` to `default_value` and a test with `%`, `\t`, `[`, `]` in `default_value`. Foundry: keep the rev 4 pattern sentence, but cite the upstream issue and drop it once a fixed revision is installable.

## Draft issue
**Title:** map_param_value: `default_value` is sanitized (`%`→`X`, `[`→`__ob__`), unlike `from`/`to`

PR #4847 disabled the sanitizer on `input_param`, `from` and `to`, but `unmapped|default_value` (`map_param_value.xml` line 85) still goes through Galaxy's default sanitizer. With `on_unmapped: default` and `default_value: %CHROM\t%POS\t[%AD\t]\n`, the output parameter is `XCHROMXtXPOS...__ob__XADXt__cb__Xn`; the same string as a mapping `to` value is passed through intact. Fix: add `<sanitizer sanitize="false"/>` to `default_value`, plus a test mirroring the existing "usually sanitized characters" test for the default path. Seen with bcftools_query `--format` in an nf-core/viralrecon port on Galaxy 26.1.

**Foundry tracking comment** (label `upstream/tools-iuc`):
> Tracking galaxyproject/tools-iuc#NNNN: "map_param_value: `default_value` is sanitized, unlike `from`/`to`". Until a fixed revision ships, map-workflow-enum-to-tool-parameter (rev 4) says to put special-character values in explicit mappings with `on_unmapped: fail`. Remove that sentence once fixed.
