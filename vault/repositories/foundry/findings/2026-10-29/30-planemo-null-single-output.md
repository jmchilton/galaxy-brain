# planemo reads a `when`-skipped single-dataset output (expression.json `null`) as missing, and no Foundry note says what a skipped output looks like

- Target: galaxyproject/planemo for the "not found" report (planemo has the output and throws the information away). galaxyproject/foundry for the idioms note (`content/research/planemo-asserts-idioms/index.md`), which has no section on skipped outputs at all. Foundry tracking needed: yes, label `upstream/planemo`; the same Foundry issue carries the idioms half.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30, phase 7 (test plan) and phase 10 attempt 4, case `skip_trimming`, Galaxy release_26.1, planemo master 2a815808, 2026-10-30. Ledger `asserts-idioms-skipped-single-dataset-output-unassertable` and `asserts-idioms-silent-on-skipped-gated-outputs` (both minor).
- Existing issues/PRs: none for this. planemo PR #1761 (merged into 2a815808) fixed falsy values (`false`, `0`, `""`, `[]`) and says in its body that "`None` keep[s] [its] existing failure behavior; this does not add null assertions". planemo #1759 / PR #1760 is the collection-element case (skipped elements inside a collection), which works on master. Related: finding [14](14-collection-assertion-idioms.md), Foundry #661 (skipped outputs are present-but-null).

## Symptom
`run_trimmed_read_counts` (tp_awk, gated `when: skip_trimming` false) is a workflow output. In the `skip_trimming` case Galaxy registered it as an invocation output: dataset state `ok`, ext `expression.json`, content `null`. The test asserted it with `has_text: null`. Planemo reported `Expected output [run_trimmed_read_counts] not found in results.` In the same case `run_trim_reports` (a mapped-over collection of skipped elements, `element_tests` with `has_text: null`) passed. The repair dropped the output from the skip_trimming test, so the gate-off state of a single-dataset output is untested.

## Root cause
Confirmed in source.
1. Galaxy writes a skipped job output as `expression.json` containing JSON `null` (`HistoryDatasetAssociation.set_skipped`, `lib/galaxy/model/__init__.py:5585-5597` on release_26.1).
2. Planemo `GalaxyBaseRunResponse.collect_outputs` (`planemo/galaxy/activity.py:674-760` @ 2a815808) finds the output (`output_src` is set, so it does not take the "not created" branch at `:729-733`), then calls galaxy-tool-util `output_to_cwl_json`. For an `expression.json` dataset that function returns the parsed JSON (`lib/galaxy/tool_util/cwl/util.py:539-541`), i.e. Python `None`. Planemo stores that as the output value (`activity.py:743-745`).
3. `structured_data` (`planemo/runnable.py:614-617`) treats `output_value is None` as "not found". A created output whose value is `null` is indistinguishable from an output that was never created.
Collection elements take another path (`_collect_collection_output`, `activity.py:651-656`, keeps the downloaded file), which is why skipped elements assert fine since #1760.

The same applies to any expression tool output whose value is `null`, not only skipped steps.

## Evidence
- Ledger entry 24 evidence: invocation output present, state ok, ext expression.json, content null; planemo "not found".
- `galaxy-test-plan.yml` and the plan's unresolved item: the representation of skipped outputs came from Galaxy source, outside the bundle.
- `content/research/planemo-asserts-idioms/index.md` (worktree `pipeline-run-chipseq` @ 38400847): no mention of skipped outputs, `null`, or "not found in results".

## Proposed fix
1. Planemo: keep a "not created" sentinel separate from a `null` value. In `collect_outputs`, record that an `hda` output exists even when its expression.json value is `null` (for example keep the downloaded file properties beside the value, as the collection path does), and let `structured_data` run the test's assertions against it. At minimum, report "output [x] is null (skipped step?)" instead of "not found".
2. Foundry idioms note: add "Skipped and filtered outputs": a skipped single output is `expression.json` `null`; skipped elements of a mapped step are `null` elements (`element_tests` with `has_text: "null"`); filtered-away elements give an empty collection (`element_count: 0`, `element_tests: {}`). Until planemo changes, omit a skipped single-dataset output from the test and assert a downstream witness instead. Add "Expected output [x] not found in results" to the failure table with both causes (never created; `null` value).
3. Test-plan Mold: point gate-off cases at that section.

## Draft issue
**planemo — Title:** Workflow tests report a `null`-valued output (e.g. a `when`-skipped step) as "not found in results"

When a workflow step is skipped by `when`, Galaxy writes its output as an `expression.json` dataset containing `null` (`HistoryDatasetAssociation.set_skipped`). If that output is a single-dataset workflow output, `planemo test` reports `Expected output [<label>] not found in results.`, although the invocation lists it. `collect_outputs` gets the value from `output_to_cwl_json`, which returns the parsed JSON (`None`) for `expression.json`, and `structured_data` (`planemo/runnable.py:615`) treats `None` as missing. #1761 fixed this for other falsy values and deliberately left `None` alone.

Reproduce: a workflow with a boolean input `run_it`, one `cat1` step with `when: $(inputs.when)` fed by `run_it`, its output as a workflow output; test job `run_it: false`, output assertion `has_text: {text: "null"}`. Expected: the assertion runs (and passes). Actual: "not found in results". On master 2a815808 with Galaxy release_26.1. Skipped elements of a mapped-over collection work (#1760).

Suggested fix: distinguish "output not created" from "output value is null" in `collect_outputs`/`structured_data`, and run file assertions against the downloaded expression.json; or at least name the null case in the message.

**Foundry tracking comment (label `upstream/planemo`):**
> planemo master reports a `when`-skipped single-dataset workflow output as "Expected output [x] not found in results" (upstream: <link>). Until it's fixed, planemo-asserts-idioms should say to omit such outputs from tests, and it needs a skipped-outputs section (single `null` output, `null` elements in mapped collections, empty collections after filtering). Seen in the nf-core/chipseq wb2g run, 2026-10-30.
