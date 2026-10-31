# gxwf validate --connections: gate-only step inputs are "unresolved", and the skip cascades to everything downstream

- Target: jmchilton/galaxy-tool-util-ts (`@galaxy-tool-util/connection-validation`, `graph-builder.ts` and `connection-validator.ts`). Foundry tracking needed: yes, a doc line in `content/cli/gxwf/validate.md` (report `summary.skip`; `valid: true` with skips is not a pass). Put it in the Foundry tracking issue drafted in finding [18](18-gxwf-connection-datatypes.md), not a new one.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29, phases 5 and 9 (loop close, validate-galaxy-workflow rev 5), gxwf 1.15.0, 2026-10-29. Ledger `gxwf-validate-reference-silent-on-connection-skips` (minor).
- Existing issues/PRs: no duplicate. Cause of the cascade: gtu [#204](https://github.com/jmchilton/galaxy-tool-util-ts/issues/204), fixed by PR #205 ("skip downstream of unknown map-over"). That is correct for really unknown types, and it makes this bug spread. Same "by name, not by source" mistake as Foundry [#653](https://github.com/galaxyproject/foundry/issues/653) (tool-state side, which passes on 1.15.0). Related: gtu #208 (finding 18, datatypes), Foundry #668 item 3 (`--connections` report undocumented).
- chipseq: v0 (/home/ubuntu/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30, phases 5 and 9, gxwf 1.15.0, ledger `gxwf-validate-cli-ref-silent-on-connection-skip-coverage`): 464 ok / 52 skip with `valid: true` (22 root gate inputs, 30 cascade, 19 compound-gated steps); the whole DESeq2 QC and MultiQC tail went unchecked. That hid a real defect: the `__BUILD_LIST__` steps over per-antibody DESeq2 outputs (steps 255, 257, both `skip` from gated step 231/232) made MultiQC map over, failing planemo attempt 2 (73 min).

## Symptom
`gxwf validate --strict --connections` on the final 149-step workflow: `connection_report {valid: true, ok: 110, invalid: 0, skip: 252}`. So 70% of edges were never checked, and the result still reads as a pass. The ledger blamed parameter outputs (pick_value `integer_param`) and collection ops. That is wrong.

## Root cause
Confirmed by rerunning the command (`gxwf` 1.15.0, the run's tool cache) and classifying every skip:
- **94 skips** are `Cannot resolve input '<name>' on step N`. Every one is a gate-only step input (`skip_qc`, `skip_fastqc`, `narrow_peak`, `skip_merge_replicates`, `macs_gsize`, ...) on 64 steps. `graph-builder` synthesizes a boolean input only for the literal key `when`: `dist/graph-builder.js:120-121` and `:147-148`, `if (step.when && "when" in connections) inputs.when = {type: "boolean"}`. Any other name feeding the expression has no input definition, so `_validateSingleConnection` returns `skip` (`connection-validator.js`, the `targetResolvedInput === undefined` branch).
- **158 skips** are `Cannot determine output type`. All of them sit on those 64 gated steps (70) or downstream of them (88). Any skip sets `mapOverUnknown`, so `_markOutputsUnknown` (`connection-validator.js:90-96`) types every output as ANY, and each consumer edge skips in turn. None starts at a parameter output or a collection op.
- `_isValid` (`:97-107`) fails only on `invalid` or step errors, so `valid: true` even with 252 skips.

Galaxy treats every step input that isn't a tool input as an expression input (`ToolModule.execute`, `extra_step_state`). Name and source define it, not the key `when`.

## Evidence
`cd <WT> && GALAXY_TOOL_CACHE_DIR=<run>.bin/tool-cache node_modules/.bin/gxwf validate <run>/galaxy-workflow.gxwf.yml --json --connections --strict` gives rc 0, `{ok: 110, invalid: 0, skip: 252}`. A classifier script over `connection_report.step_results[].connections[]` found 94 unresolved-input skips (all non-tool step inputs, none named `when`), 70 skips from those steps' outputs and 88 further downstream, with 0 roots elsewhere. The workflow imports and runs green (attempt 3, 340 jobs ok), so the gated edges were fine. They just weren't checked.

## Proposed fix
- **Upstream:** when a step has `when`, give every connection key that isn't a tool input a synthetic gate input (`type: boolean` for `when`, and a scalar parameter type for other names, or infer it from the source). Validate the edge as dataset/parameter → scalar. A gate edge shouldn't add to step map-over unless the source is a collection, since Galaxy maps over iteration elements. Optionally, warn when a key isn't referenced in the expression. Also report a top-level `unverified` count, or `valid: "partial"`, when `skip > 0`.
- **Foundry:** `content/cli/gxwf/validate.md` and validate-galaxy-workflow should report `connection_report.summary.skip` and treat a high count as unverified.

## Draft issue
**Title:** `--connections`: step inputs that feed a `when` expression under any name but `when` are unresolved, and the skip cascades downstream

With `@galaxy-tool-util/cli` 1.15.0, a 149-step gxformat2 workflow (nf-core/atacseq port, 64 `when`-gated steps using named gate inputs such as `in: {skip_qc: skip_qc}` with `when: $(!inputs.skip_qc && !inputs.skip_fastqc)`) gives `connection_report {valid: true, ok: 110, invalid: 0, skip: 252}`.

All 252 skips trace to gate inputs. 94 are `Cannot resolve input 'skip_qc' on step N`, because `graph-builder` only synthesizes a boolean input for the literal key `when` (`if (step.when && "when" in connections)`). The other 158 are `Cannot determine output type`, on those steps' outputs and everything downstream: since #205, any skipped edge marks the step's outputs ANY. So adding gates to an otherwise clean workflow turns off connection checking for most of the graph, and `valid` stays `true`.

Galaxy passes every step input that isn't a tool input to the expression (`lib/galaxy/workflow/modules.py`, `ToolModule.execute` builds `extra_step_state`), so name and source define a gate input, not the key `when`.

Expected:
1. On a step with `when`, resolve any connection key that isn't a tool input as a scalar gate input, validate its source, and don't mark map-over unknown for it.
2. Surface skips at the top level (`unverified: N`, or a non-`true` `valid`) so a mostly-skipped report doesn't read as a pass.

Foundry tracking: a comment on the Foundry tracking issue from finding 18 (`upstream/gxwf`):

> Also from the atacseq wb2g run: `--connections` skipped 252/362 edges with `valid: true`. All of them trace to named `when` gate inputs (upstream issue above). Until it ships, validate-galaxy-workflow and `content/cli/gxwf/validate.md` should report `connection_report.summary.skip` and treat a large count as unverified, not as a pass.
