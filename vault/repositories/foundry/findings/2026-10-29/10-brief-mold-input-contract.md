# Workflow Brief producer: undeclared caller/environment inputs, no home for expert test-input requirements, undefined confidence scale

- Target: galaxyproject/foundry (all three gaps are in Foundry content: the brief Mold's frontmatter and the `workflow-brief-design` research note it loads verbatim); Foundry tracking needed: yes
- Seen in: /home/ubuntu/foundry-runs/prose-nf2wb-callings-2026-10-29, phase 2 (nextflow-summary-to-workflow-brief, Mold revision 2, foundry 9f83fd55), 2026-10-29
- Existing issues/PRs: none covers these gaps. Related: #563 (closed, Workflow Brief origin); #688 (merged, added proposals and `Confidence: low`); #694 / PR #696 (open, edits `workflow-brief-design` to revision 7, so a fix will conflict there; no overlap in content); #725 / PR #728 (open, same Mold's scope paragraph, adjacent lines).

## Symptom
The phase-2 agent built the brief from three files the Mold never names: `caller-request.md`, `environment-probes.txt` and `phase1-notes.md`. It had to guess where "test with both replicates" belongs, and it invented `Confidence: medium/high` because the coordinator asked for counts by confidence. The caller's "search for GATK4 wrappers, cite any substitute/drop" was not performed (correctly) and was carried as an attributed instruction to downstream design, with no contract saying that is the right handling.

## Root cause
1. Input contract. `input_artifacts` lists only `summary-nextflow`, but the body consumes the caller's scope and supplied environment evidence. The pipeline's harness note says "the caller supplies the desired objective and selected scope" without naming an artifact. The same holds for `freeform-summary-to-workflow-brief` and the paper/interview pipelines. Optional, role-tagged inputs already exist (`optional: true`, `role: source-evidence` on `workflow-brief-to-galaxy-template`), so the fix fits the current schema.
2. Test-input placement. The note bans final test declarations and moves test development downstream, but it has no rule for an expert requirement on *which data* the test uses, or how it overrides the summary's `test_selection`.
3. Confidence scale. The note defines only `Confidence: low` (with `Missing:`). Pipelines nonetheless sort by confidence ("low-confidence proposals first"), and the definition draft's `acceptance` carried "fixture if known".
4. Caller instructions addressed to later stages (the GATK wrapper search). The note says expert Galaxy requirements "may be recorded with attribution". It does not say that an instruction to *do* design work (searching for tools, justifying substitutes) is recorded and not executed. The run's handling works because consumer Molds treat brief expert requirements as authoritative (interface :92, template :174), but that was the agent's judgment call.

Confidence: high for 1-3 (the text is plainly absent); medium that 4 needs normative text rather than an example.

## Evidence
- Mold `content/molds/nextflow-summary-to-workflow-brief/index.md:14-17`: only `summary-nextflow`. Body uses undeclared inputs at :75 and :81 ("the caller's selected scientific scope", "stated objective and selection") and at :89 ("Use supplied environment evidence"). :85 bans "available tools".
- Sibling `content/molds/freeform-summary-to-workflow-brief/index.md:14-17`: same single input.
- Pipeline `content/pipelines/nextflow-to-workflow-brief/index.md:15-16` (caller supplies scope, no artifact) and :19-21 (sorts by confidence). Identical wording in paper/interview pipelines :15, :19. `workflow-brief-to-galaxy/index.md:33` also sorts "low-confidence answers first".
- Note `content/research/workflow-brief-design/index.md:30` (Requirements row), :48 (no final test declarations, "test development belong[s] to downstream"), :50 ("mark it low confidence"), :52-59 (only `Confidence: low` defined), :66 ("A separate preflight result should record…", no artifact).
- Mold eval `content/molds/nextflow-summary-to-workflow-brief/eval.md:23-26`: checks only low confidence. :18-21 judges environment claims without naming the evidence input.
- Run: `caller-request.md:9-10` (two replicates; wrapper search). `workflow-brief.md:71` and :159 (test requirement placed in Requirements, and a Decision overriding `pipeline-defaults` for `profile:cluster`), :73 and :160 (wrapper instruction deferred to design), :94-154 (low/medium/high used). `run-summary.md:34-38,45,58-61`. Ledger `foundry-feedback.ledger.yml:149-207`.
- `vault/agents/wf_foundry/WORKFLOW_BRIEF_DEFINITION.md:36,59`: the original #563 proposal kept `acceptance` fixtures "if known" and a separate preflight result bound to the brief revision.

## Proposed fix
One PR, rebased after #696 and #728:
- Both brief-producer Molds: add optional inputs `caller-request` (role `expert-intent`: objective, scope selection, expert requirements) and `environment-evidence` (role `environment-preflight`: probe output). Optionally add `source-notes` (role `source-evidence`). State the precedence: expert intent > source summary > supplementary notes. Each needs an artifact id and description. Shape stays free Markdown for now.
- `workflow-brief-design`: (a) expert requirements on test data or test coverage go in Requirements and preferences with attribution and rationale. Overriding a summary's selected test candidate is a Decision naming both candidate ids. This is not a test declaration. (b) Define `Confidence: high | medium | low` on every open question. `Missing:` is required only for low. (c) A caller instruction addressed to a later stage (tool search, substitution evidence, review gates) is recorded verbatim with attribution and the stage it binds. Brief production does not carry it out.
- Mold `eval.md`: extend the open-question property to require a defined confidence level. Add an assertion that downstream-stage instructions are carried, not executed.
- Pipeline harness notes: name the two inputs the caller supplies.

## Draft issue
**Title:** Workflow Brief producers: declare caller-intent and environment inputs; define test-input placement and the confidence scale

`nextflow-summary-to-workflow-brief` (and `freeform-summary-to-workflow-brief`) declare only the source summary in `input_artifacts`. The procedure still depends on the caller's objective and scope selection and on "supplied environment evidence" (index.md:75,81,89). In a CalliNGS-NF run these arrived as undeclared harness files (`caller-request.md`, `environment-probes.txt`, phase-1 notes), with no contract for their shape or precedence.

`workflow-brief-design` also leaves two gaps. First, it does not say where an expert's test-input requirement goes ("test with both replicates", which overrode the summary's rep1-only `pipeline-defaults` candidate). Second, it defines only `Confidence: low`, while the pipelines sort open questions by confidence. A related gap: the caller asked for a GATK4 wrapper search with cited substitutes or drops. The brief may not claim tool availability, so the agent recorded the request as an attributed instruction for design. The note should make that the rule.

Proposed:
- Optional `caller-request` and `environment-evidence` inputs on both producers, with precedence expert intent > summary > notes.
- In the note: test-data requirements go in Requirements, and summary-candidate overrides go in Decisions naming both ids. Use `Confidence: high|medium|low` on every question, with `Missing:` for low. Caller instructions addressed to later stages are recorded with attribution and the stage they bind, not executed.
- Matching eval assertions.

Related: #688, #694/#696 (same note), #725/#728 (same Mold).
