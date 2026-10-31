# gxwf: stateful convert/roundtrip counts a step's `when` input as a stray tool connection, and strict state rejects `null` for an unconnected optional data param

- Target: jmchilton/galaxy-tool-util-ts (`@galaxy-tool-util/schema` 1.15.0: `workflow/state-merge.js`, `workflow/stateful-validate.js`, `schema/parameters/gx-data.js`). Foundry tracking needed: yes, one doc line in `content/cli/gxwf/` (roundtrip `success: false` on gated workflows is a known false positive); put it in finding 18's tracking issue.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-cutandrun-v0-2026-10-31, phase 9 (validate-galaxy-workflow) and phase 5 loop iterations L7, L10, L21, L26, gxwf 1.15.0, 2026-10-31. Ledger `gxwf-convert-roundtrip-rejects-when-step-input`, `gxwf-strict-state-null-optional-data-cascading-errors` (minor), plus `gxwf-strict-state-accepts-unknown-state-keys` and `gxwf-validate-connections-strict-skips-unknown-input-port` (duplicates, below).
- Existing issues/PRs: (a) and (b) none (searched gtu "roundtrip", "when input connection", "Expected never", "optional data null"). Duplicates: unknown state keys = gtu [#203](https://github.com/jmchilton/galaxy-tool-util-ts/issues/203) (open; cutandrun adds a top-level `bogusKey` on plotCorrelation 4.0.0+galaxy1 and tp_awk keys, both exit 0); connection to a repeat instance the state lacks = gtu [#209](https://github.com/jmchilton/galaxy-tool-util-ts/issues/209) (open; cutandrun adds the `--connections --strict` side: tp_awk `variables_7|value` with 3 repeats → "skip: Cannot resolve input", exit 0, "Connections: OK"). Related: #112 (closed, conditional cascade), finding [24](24-draft-validate-structure-error-tree.md), finding [22](22-gxwf-connections-gate-input-cascade.md).

## Symptom
(a) `gxwf convert --to native` exits 1 and falls back to stateless conversion on 109 of 288 steps ("state failed post-conversion validation: when: input connection does not match a tool parameter"), exactly the steps with a `when` input; `gxwf roundtrip` reports `success: false` (109 conversion_error, 179 clean, 0 diffs). `gxwf validate --strict --connections` on the same file passes (288 ok, 606 connections ok).
(b) In samtools_view 1.22+galaxy2, `mode|filter_config|qname_file: null` (unconnected optional data) failed strict state with "Expected never, actual null", then errors on every rejected conditional branch (`mode.outtype: Expected "all_reads"...`). Deleting the line gave exit 0.

## Root cause
(a) `nativeConnectionsFromFormat2In` (`workflow/state-merge.js:26-33`) turns every `in:` entry with a source into a tool-state connection, including the step-level `when` input. `validateFormat2StepState` (`workflow/stateful-validate.js:94-112`) injects them and throws for any path left unmatched. The stateful converters call it with `step.in` unfiltered (`normalized/toNativeStateful.js:39-41`; `toFormat2Stateful.js:44`). `when` (and any gate-only step input) is a step input, not a tool parameter, so every gated step fails. The validate path tolerates leftovers, hence the disagreement.
(b) `gx-data.js:91-99` (dist): in `workflow_step` a data param is "always optional (absent only, no value possible)", so `null` is rejected. Galaxy's Python model accepts it: `DataParameterModel.pydantic_template` returns `type(None)` with `requires_value=False` for `workflow_step` (`lib/galaxy/tool_util_models/parameters.py:1323-1324`, dev @ 65e6daff). The branch-by-branch cascade is the same reporting class as #112/finding 24.

## Evidence
Run `.scratch/validate/convert.log`, `roundtrip.json`; driver-notes L7, L10, L21, L26; ledger entries above.

## Proposed fix
(a) Drop `when` (and inputs referenced only from `when`) from the connection set before stateful validation, as `validate --connections` already does; add a gated-step roundtrip test.
(b) Accept `null` for data/data_collection params in `workflow_step`, matching Python; when a conditional branch fails, report the innermost failing key of the selected branch only.
Foundry: `content/cli/gxwf/roundtrip` / `convert` docs: until (a) ships, `success: false` with only `when:` conversion errors is not a defect; draft-validate doc: omit unconnected data params from `state`.

## Draft issue
**gtu — Title:** Stateful convert/roundtrip: `in.when` treated as a tool-state connection; `null` optional data rejected in `workflow_step`

1. `gxwf convert --to native` (1.15.0) fails post-conversion validation on every step with a `when` input ("when: input connection does not match a tool parameter") and falls back to stateless; `roundtrip` reports `success: false` (109/288 steps in an nf-core/cutandrun port, exactly the gated ones; `validate --strict --connections` passes). `nativeConnectionsFromFormat2In` includes `when`, and `validateFormat2StepState` throws on unmatched paths. Fix: exclude step-level inputs (`when`, gate-only inputs) before injecting connections.
2. `gx-data.js` makes data params absent-only in `workflow_step`, so `qname_file: null` fails ("Expected never, actual null") and cascades into every conditional branch. Python's model accepts `None` (`parameters.py`, `workflow_step` → `type(None)`). Fix: accept `null`; report only the selected branch's failing key.

**Comments for existing gtu issues:** #203: "Also seen 2026-10-31 (cutandrun): top-level `bogusKey: 1` on plotCorrelation 4.0.0+galaxy1 passes `draft-validate --concrete --strict-state`; same for tp_awk keys." #209: "Connections side: `validate --connections --strict` reports a connection into `variables_7|value` (state has 3 repeats) as `skip: Cannot resolve input` and exits 0 with Connections: OK; under `--strict` an unresolvable target port should fail."
