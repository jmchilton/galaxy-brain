# Polish debrief — `issue_210_test_kind_checks`

Wrote [pr_description.md](pr_description.md), ran one strengthening subagent over both stacked descriptions, applied its tasks.

Applied:
- Claim fixes: real text output instead of a paraphrased `--json` block and a wrong "1.14.0" label; `workflow-graph` has a runtime dependency (`pyre-to-regexp`); "anything but `list`" into untyped collection inputs; corpus sweeps show no false positives, while egapx `star_bam` is the evidence the errors are real; Codex summary (two findings refuted by Galaxy source, not three); Foundry#731 context reworded (collection half of the Mold claim becomes true, datatype half still overclaims); IWC runs under planemo.
- Planemo vs Galaxy runner: planemo ignores top-level `collection_type` and dataset `ftype`; named Galaxy's runner as the reference and put the gap in Risks.
- Highlighted sentences for misreadings: error/warning split, datatype checks are input-only warnings, `valid: true` ≠ every output checked, no new errors on passing corpora.
- Opener changed Fix → Toward so the PR doesn't auto-close #210 (ask 3 deferred).
- Evidence re-run on `1cb4b41a` and pinned in [verification.md](verification.md); counted resolved outputs (Galaxy corpus 3 — input-side evidence only; IWC 612); populated a scratch cache for all 12 egapx tools — still 2/17 outputs resolve; root cause is connection validation skipping `pick_value` repeat inputs (follow-up, not this branch).
- Dropped the unlabelled-native-outputs risk: Galaxy tests address outputs by label.

Questions for John (not acted on):
- Split ask 3 (output `ftype`) into its own issue?
- Should `workflow_output_collection_type` stay an error given planemo ignores it?
- Report unresolved/skipped outputs in the JSON report?
- Follow-ups: per-test seeded output resolution; `pick_value` repeat inputs in connection validation; output `ftype` propagation; tool fetching in validate-tests.
