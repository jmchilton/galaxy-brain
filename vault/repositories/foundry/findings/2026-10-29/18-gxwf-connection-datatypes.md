# gxwf validate --connections ignores datatypes

- Target: jmchilton/galaxy-tool-util-ts (`@galaxy-tool-util/connection-validation`, which `gxwf validate --connections` and `draft-validate --connections` call). Foundry tracking needed: yes. No Foundry issue tracks this gap, and Foundry's `content/cli/gxwf/validate.md` doesn't say datatypes go unchecked.
- Seen in: `/home/ubuntu/foundry-runs/prose-wb2g-callings-v0-2026-10-29`, phase 5 (advance-galaxy-draft-step loop), 2026-10-29. Ledger entry `gxwf-connections-ignores-datatype-compatibility` (major). It is cited as `gxwf-connections-no-datatype-check` in `galaxy-workflow-validation-result.json` (`residual_runtime_risks[implicit-datatype-conversion]`). Sibling entry: `implement-step-silent-on-implicit-datatype-conversion`.
- Existing issues/PRs: upstream [jmchilton/galaxy-tool-util-ts#208](https://github.com/jmchilton/galaxy-tool-util-ts/issues/208) is the same gap. It is open with no comments, filed 2026-10-25 from the smrnaseq run (txt into a bam input reports `ok`). This run is a duplicate. Related: gtu [#210](https://github.com/jmchilton/galaxy-tool-util-ts/issues/210) is the test-file side (finding 03). Foundry [#648](https://github.com/galaxyproject/foundry/issues/648) mentions a bam→gff3 negative control in passing but asks only for summary and `<filter>` fixes. No Foundry PR addresses it.

## Symptom

`gxwf validate --connections` reports `ok` for every data edge whatever the formats. The run hit this case without failing on it: `filter known sites by denylist/output` (bedtools, vcf) feeds BaseRecalibrator `known_sites` (`format="vcf_bgzip"`). That edge is legal only through Galaxy's implicit `vcf → vcf_bgzip` converter. The agent settled it by fetching release_26.1 `datatypes_conf.xml.sample` and the converter XML by hand, outside the bundle. The workflow output `known_snps` needed an explicit `CONVERTER_vcf_to_vcf_bgzip_0` step, because workflow outputs aren't converted. gxwf reports a converter-bridged edge and a hopeless one the same way, so the residual risk stayed open until the runtime test (pass, 24 jobs ok). A wrong edge would also have passed every static gate.

## Root cause

Confirmed (high confidence). The validator checks collection-type algebra only. The datatype data it needs is collected but never read. Line numbers are from gtu main `a0476900`, and the shipped 1.15.0 `dist` matches.

- `packages/connection-validation/src/connection-validator.ts:168-263` (`_validateSingleConnection`): status comes only from `isNullDesc`/`canMatch`/`effectiveMapOver`. `_outputToType`/`_inputToType` (`:391-409`) reduce each port to a `CollectionTypeDescriptor`, and a `data` port becomes `NULL_COLLECTION_TYPE_DESCRIPTION`. The file never mentions `extensions` or `format`.
- `graph-builder.ts:303,312` stores input `extensions`, and `:398-399` stores output `format`/`format_source`. No code reads them.
- `graph-builder.ts:117-121`: a `data_input` step's output is `{name, type: "data"}`. The workflow input's `format` is dropped, so input→tool edges have no datatype at all.
- The hierarchy primitives exist but aren't wired in. `packages/workflow-graph/src/connection-acceptable.ts:12` (`producesAcceptableDatatype`) and `datatypes-mapper.ts` (`DatatypesMapperModel.isSubType`) were ported from the Galaxy editor in gtu#64. Nothing outside `workflow-graph` imports them, and gtu has no bundled `types_and_mapping` snapshot (only a test fixture).
- Doc drift: `docs/packages/workflow-graph.md:89` says `producesAcceptableDatatype` is "Used by the connection validator", which isn't true. The package README (`:8`) scopes the validator to "collection-type algebra" and calls it a mirror of Galaxy's Python `connection_validation.py` (branch `wf_tool_state`), which has no datatype check either. So this is a parity-scoped gap, not a regression. No design note rules datatypes out explicitly.
- Implicit conversion isn't covered even by the editor primitives. Galaxy's `view_mapping` (`lib/galaxy/managers/datatypes.py:33-53`) holds only the subclass closure, and `Vcf`/`VcfGz` are sibling `BaseVcf` subclasses (`tabular.py:1096,1103`), so `isSubType("vcf","vcf_bgzip")` is false. Converters come from a separate endpoint (`view_converters`, `:74`, `/api/datatypes/converters`).

## Evidence

The tool cache (`prose-wb2g-callings-v0-2026-10-29.bin/tool-cache`) already holds the needed facts: `gatk4_base_recalibrator` 4.6.2.0+galaxy1 `known_sites` has extensions `['vcf_bgzip']` and `input_bam` has `['bam']`, and `snpSift_extractFields` output is `tabular`. Probe workflow `.../scratchpad/f18-conn-dt/mismatch.gxwf.yml` uses the run's tools. It wires a `bed` workflow input into `input_bam` (bam) and `snpSift_extractFields/output` (tabular) into `known_sites` (vcf_bgzip):

```
cd <WT> && GALAXY_TOOL_CACHE_DIR=<run>.bin/tool-cache node_modules/.bin/gxwf validate mismatch.gxwf.yml --json --connections --strict
rc=0  summary {ok: 2, fail: 0}  connection_report {valid: true, ok: 4, invalid: 0, skip: 0}
```

Both bad edges come back `status: ok, errors: []`, and `resolved_outputs` carries no format. The run's own probes (bed, vcf and fastqsanger inputs into `known_sites`) came out the same, per the ledger.

## Proposed fix

- **Upstream (gtu#208):** add an optional datatype pass, off by default for Python parity, alongside the collection check.
  - Inputs: a `DatatypesCombinedMap` plus a converter list from a Galaxy server (`/api/datatypes/types_and_mapping`, `/api/datatypes/converters`), or a bundled per-release snapshot, e.g. via `--datatypes <release|url>`.
  - Per edge, compare the source format (a tool output's `format`, or a workflow input's `format` list, which `graph-builder` must start keeping) against the target's `extensions`. Use `producesAcceptableDatatype` first, then a one-hop converter lookup.
  - Report `ok`, `ok` + `conversion: CONVERTER_x`, `invalid`, or `unknown`. `unknown` covers `format_source`, `change_format`, `format="input"`, `data`, or no datatype map. Make `invalid` a warning unless `--strict`.
  - Fix the `workflow-graph.md:89` claim now.
- **Foundry:** in `content/cli/gxwf/validate.md` (gotchas) and in advance/implement-galaxy-tool-step, say that `--connections` does not check datatypes. Add a manual check against `parsed_tool` extensions plus the release's `datatypes_conf` converters. The run ledger asked for this as the alternative fix. The sibling ledger entry's datatype-conversion note covers the "how".

## Draft issue

No new upstream issue. Post as a comment on jmchilton/galaxy-tool-util-ts#208:

> Another reproduction with `@galaxy-tool-util/cli` 1.15.0 (main `a0476900`), from the CalliNGS-NF wb2g run. With iuc `gatk4_base_recalibrator` 4.6.2.0+galaxy1, `snpSift_extractFields/output` (tabular) → `known_sites` (vcf_bgzip) and a `bed` workflow input → `input_bam` (bam) both report `status: ok`; `gxwf validate --connections --strict` exits 0. The run's real edge, bedtools vcf → `known_sites`, depends on the implicit `vcf → vcf_bgzip` converter and can't be told apart from these.
>
> Two details beyond the original report. First, `graph-builder.ts:117-121` drops a `data_input`'s `format`, so input→tool edges carry no datatype at all. Second, `producesAcceptableDatatype`/`DatatypesMapperModel` are already in `workflow-graph` but unused, while `docs/packages/workflow-graph.md:89` says the connection validator uses them. Subclass checks alone won't cover the converter case (`Vcf`/`VcfGz` are siblings), so the pass also needs `/api/datatypes/converters`, or a snapshot of it.

Foundry tracking issue (new; label `upstream/gxwf`, because `upstream/galaxy-tool-util-ts` doesn't exist in galaxyproject/foundry; also `agent/implement`):

> **gxwf `--connections` doesn't check datatypes; Molds and CLI docs don't say so.** Upstream: jmchilton/galaxy-tool-util-ts#208. In the CalliNGS-NF wb2g run (2026-10-29), tabular→vcf_bgzip and bed→bam edges validated `ok`. Until #208 ships, `content/cli/gxwf/validate.md` and advance/implement-galaxy-tool-step should state the gap and require a manual extension/converter check per new data edge.
