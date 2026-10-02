### DO: Create an issue some amount of time before the pull request.

Do this when the PR changes semantics, adds a failure mode, or adds a capability. Skip it for "make X match Y" fixes, conformance fixes and tests-only proofs: those landed well without an issue (#22179, #21933, #22170). Evidence: `../gx_branches/pr_debriefs/workflows/{negative,positive}/`.

Issue Best Practices:

- **Lead with the symptom.** Include a minimal repro: the workflow, the input, and the traceback or wrong output. Put it on the first screen. (#23369 opened with a mechanism, and the reviewer couldn't find the bug.)
- **Evidence is concrete, never "an agent found / says X".** Use a workflow that fails, a thing we cannot do, a real workflow that hits it (IWC, published workflows, gxformat2 tests), or "none found". Answer "seen in the wild?" before it's asked (#23428, #23816). If an agent surfaced the problem, reproduce it as one of these first. If you can't, don't file yet.
- **State current behaviour, not interpretation.** Say what the code, the docs and the editor each do today. Leave out claims about what a structure "means" (#23369's `when_values` premise).
- **Show a disagreement as a table, not prose.** The two-row editor-vs-scheduler table on #23426 reached agreement within a day.
- **No proposed model or mechanism.** If there's a design choice, pose it as an open question with the options laid out, not as a decided answer.
- **Scope it.** Say what's in and what's explicitly out. Name the smallest fix that would resolve it (#23816 never offered `when_input_exact_match`).
- **Name the existing machinery considered.** For example, schema compilation or the custom tool editor. This pre-empts "did you explore X?"
- **Write it in your own voice, briefly.** Don't inline agent analyses. Read every repro an agent wrote before posting it.

Before opening the PR:

- [ ] Any objection on the issue, or on related threads, is answered in the PR description.
- [ ] The PR delivers what the issue asks for, not a by-product of it (#22217 shipped tests for a docs issue).
- [ ] The PR description quotes the issue's problem statement first, then the fix, then "why not the simpler option".
- [ ] If nobody responded to the issue, 24h is a fine default wait. The clock isn't the point: #22200 sat for 2 days and #22217 still stalled.
- [ ] Turn any agreement reached on the issue into written acceptance criteria before coding (#23426 → #23676).

### DO NOT: Cite an agent as evidence.

See details in [`GX_PR_DESCRIPTIONS.md`](../_shared/GX_PR_DESCRIPTIONS.md).

### DO NOT: File or PR a bug you can't state simply.

- The test: symptom plus trigger in 1–2 sentences, plus a reproduction. If it needs a model of how things "really work", it isn't ready.
- Keep investigating locally until it passes the test. Hard bugs are fine; vague ones aren't (#23369, #23676).
- If it splits into several simple statements, file several.

### DO: Add an explicit Workflow PR Checklist in addition to the Galaxy Checklist



See [`GENERAL.md`](../_shared/gx_pr_checklists/GENERAL.md) and [`WORKFLOW_RELATED.md`](../_shared/gx_pr_checklists/WORKFLOW_RELATED.md).
