# summary-nextflow has no home for data flow inside subworkflows: hic's science is all there

- Target: galaxyproject/foundry (`packages/summarize-nextflow` schema and resolver, `summarize-nextflow` Mold §6). Foundry tracking needed: yes (this is the Foundry issue, or a comment on #215).
- Seen in: /home/ubuntu/foundry-runs/prose-nf2wb-hic-2026-11-01, phase 1 (summarize-nextflow rev 21, CLI @ `pipeline-run-chipseq` 52808616), 2026-11-01. Ledger id `snf-mold-subworkflow-internal-flow-unrepresented` (gap, major).
- Existing issues/PRs: no duplicate. Related: #215 (open, `priority/v2`: *derived* subworkflow-level edge view, deferred until "a second sarek-class pipeline" needs it; hic shows a different and stronger trigger, comment drafted below); 16 item 14 (subworkflow guards have no field; this finding is its edge and channel half); 16 items 20-21 (file-scope and rebound channels).

## Symptom
In nf-core/hic 2.1.0 (`fe4ac656`) the primary workflow HIC (`workflows/hic.nf:147`) calls 7 local subworkflows (PREPARE_GENOME, INPUT_CHECK, HICPRO → HICPRO_MAPPING, COOLER, COMPARTMENTS, TADS) plus FastQC/MultiQC. HiC-Pro mapping, ligation-site trimming, mate pairing, valid-pair filtering, both restriction-enzyme and DNase branches, contact maps/ICE, cooler and both TAD callers all run inside subworkflow bodies. The CLI output has 4 channels, 24 edges and 3 conditionals; the corrected summary has 20 / 76 / 34, and 49 of the 76 edges and 31 of the 34 conditionals are subworkflow-internal. To carry them at all, the correction pass put them into `workflow.edges`/`workflow.conditionals` with an invented `<SUBWORKFLOW>::<take>` naming and an "inside <SUBWORKFLOW>" note on each edge.

## Root cause
A contract gap, then a resolver one.
- Schema (`packages/summarize-nextflow/src/schema/summary-nextflow.schema.json` @ 52808616): `Workflow` (`:340-352`) holds `channels`, `edges`, `conditionals` and describes the primary workflow only. `Subworkflow` has `aliases, calls, inputs, invocations, kind, name, outputs, path, tests`: no channels, edges or conditionals. There is no way to name a take channel or an emit as an edge endpoint.
- Resolver (`resolver.ts:414-420`): `channels`, `edges` and `conditionals` are parsed from `primaryWorkflow.body` only; other workflows go through `stripWorkflowBody`.
- Mold §6 says to reconcile "the workflow DAG", i.e. the primary body.
Earlier nf-core runs hid this because their primary workflow calls most processes directly (chipseq CHIPSEQ: 134 edges after correction). #215 assumed the same ("flat process-tier `workflow.edges[]`") and framed subworkflow edges as an optional derived view. When the pipeline is built from local subworkflows, as older nf-core templates often are, the process-level DAG is simply absent.

## Evidence
- `jq '.workflow|{c:(.channels|length),e:(.edges|length),k:(.conditionals|length)}'`: CLI 4/24/3, corrected 20/76/34 (`summary-nextflow.cli.json`, `summary-nextflow.json`).
- Corrected summary warnings `workflow.edges rebuilt` and `workflow.conditionals rebuilt`; `phase1-notes.md` §3 table and §6 first assumption.
- Mode logic that lives only in subworkflows: `if (!params.dnase){` at `subworkflows/local/hicpro_mapping.nf:58` and `subworkflows/local/hicpro.nf:47`; `if (params.hicpro_maps){` at `hicpro.nf:105`; TAD callers `subworkflows/local/tads.nf:13,19`.
- The phase-2 brief's topology line relies on the hand-made split ("76 edges, 27 in the primary body and 49 inside subworkflows", `workflow-brief.md:194`).

## Proposed fix
1. Schema: add `channels[]`, `edges[]` and `conditionals[]` to `Subworkflow`, same item shapes as `Workflow`. Define endpoint naming for a subworkflow's `take:` and `emit:` (e.g. `take:<name>` / `emit:<name>`), and say that `Workflow` edges into a subworkflow call bind to its takes (#211's one-hop binding).
2. Resolver: run `parseWorkflowChannels`/`parseWorkflowEdges`/`parseWorkflowConditionals` on every non-utility workflow body, not only the primary one. This inherits 16 causes 2, 3, 20 and 21, so land it after (or with) those.
3. Mold §6: reconcile every live workflow body; state the take/emit naming. Fold 16 fix 10's `Subworkflow.conditionals[]` into this change rather than a separate prefix convention.
4. Add an nf-core/hic integration case: `subworkflows[HICPRO_MAPPING].edges` contains the trimmed-realignment chain, and `subworkflows[HICPRO].conditionals` contains `!params.dnase`.
#215's option (a) derived cross-subworkflow view stays optional on top of this.

## Draft issue
**Title:** summary-nextflow: subworkflows carry no channels, edges or conditionals, so subworkflow-built pipelines lose their DAG

`Workflow.channels/edges/conditionals` describe the primary workflow body only (schema `Workflow`; resolver `:414-420`), and `Subworkflow` has none of the three. On nf-core/hic 2.1.0 every analysis step runs inside 7 local subworkflows, so the CLI emits 24 edges and 3 conditionals for a 29-process pipeline; a hand correction found 76 and 34, of which 49 and 31 are subworkflow-internal (RE vs DNase mode switches, `hicpro_maps`, TAD caller selection). There is no schema place to put them, so the correction invented `<SUBWORKFLOW>::<take>` endpoints inside `workflow.edges`.

Proposal: add `channels`, `edges`, `conditionals` to `Subworkflow` with defined take/emit endpoint names; parse every non-utility workflow body; extend Mold §6 to match; add an nf-core/hic integration case. Subsumes the schema half of the subworkflow-guard gap. Related: #215 (derived view, still optional), #211 (one-hop bindings), #666.

### Draft comment for #215
nf-core/hic 2.1.0 is a stronger trigger than a dense sarek DAG: its primary `HIC` calls only subworkflows, and the resolver parses edges from the primary body only, so 49 of 76 process-level edges (and 31 of 34 guards) are not in the summary at all, not merely hard to group. That needs `Subworkflow.edges/conditionals` as primary data (new issue, linked), not the derived view this issue describes. Option (a) can then be computed from it.
