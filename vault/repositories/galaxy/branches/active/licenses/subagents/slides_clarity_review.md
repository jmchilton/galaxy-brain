# Licenses slides clarity review

Reviewed `jmchiltondotnet/src/content/slides/licenses.mdx` against Galaxy `cd37d851bb2` on 2026-10-25. Audience: Galaxy developers and reviewers; ten main slides for approximately ten minutes, followed by a divider and four supporting slides.

## Assessment

The main sequence explains the saved-checkbox problem, declares the XML contract, locates server enforcement, separates agreement identity from acceptance lifetime, follows a fixture tool and nested workflow, explains refusals, and closes on a concrete adoption step. The two diagrams earn their space: one locates the code boundaries, and the other explains delayed workflow authorization. Storage detail and historical test results are qualified; the talk does not equate recorded affirmation with proof of legal entitlement or claim current CI is green.

Sources were checked in `lib/galaxy/tools/preconditions.py`, `lib/galaxy/managers/license_agreements.py`, `lib/galaxy/workflow/modules.py`, `test/integration/test_license_acceptance_workflows.py`, the workflow framework fixture/test definitions, current developer documentation, and the branch debrief/scope evaluation. No newly discovered implementation defect or unsourced substantive claim resulted from this pass. This was a communication review, not an exhaustive implementation audit or new execution of the Galaxy suites.

## Changes made

Only slide 7 and its speaker note changed:

- Replaced a generic workflow summary with the concrete existing twice-nested fixture: two nested tool steps share an agreement hash and produce one prompt. The notes name `test_subworkflow_used_twice_reports_and_pins_both`, `TWICE_NESTED_WORKFLOW`, and `test_run_form_lists_nested_license_agreements_once`; their assertions show paths `[0, 0]` and `[1, 0]`, two pins and two jobs.
- Qualified the revocation statement: later jobs are blocked when they rely on remembered acceptance. Jobs already created keep running. This avoids implying that revocation invalidates separately pinned one-time authorization.

The 15-slide structure and timing are unchanged. These are small content edits; the parent should rerender slide 7 and run its final checks. A new full rendering-polish pass is unnecessary. No Galaxy source or PR-description text was edited.

## Recommendations to offer John

1. **A production-wrapper pilot is the strongest next evidence.** This is an already-recorded companion follow-up, not a new defect or a reason to grow Galaxy's core branch. Prepare a draft migration for one unconditional wrapper with its maintainers, check the actual affirmation/terms with an operator, and demonstrate tool submission, shared workflow prompting, and a new rerun. It remains dependent on a compatible 27.0 server/tool-util environment. This would connect the well-tested fixtures to a real adoption case without adding conditional or alternative-entitlement semantics.

2. **Reconcile issue #23261 with the implemented contract.** This is source-text polish, not a feature expansion. Current code/docs use profile 27.0, submission-bound rerun/remap authorization, and all-of requirements. The older issue still has conflicting profile/lifecycle text and a MAKER alternative-entitlement recipe that must not be implemented as two required agreements. Make these corrections only in a separately authorized issue edit; this slides task did not change the issue. The PR description already states the current limitations and was preserved.

3. **Optional branch-code cleanup: share remembered-acceptance sequencing.** This is the existing small polish proposal in `scope_evaluation.md`, not a newly discovered bug. `ToolForm.vue`, `WorkflowRunForm.vue` and `WorkflowRunFormSimple.vue` each call `acceptRememberedLicenseAgreements` before submission with similar try/catch blocks. A narrowly scoped composable helper could own that ordering while preserving each form's error sink and spinner behavior. If John wants this added to the branch, retain the current behavior that remembered acceptance may persist even if job submission subsequently fails; verify all three entry points and remembered-acceptance failure before submitting. The benefit is reducing duplicated sequencing, not changing consent semantics; the current implementation is correct. It is reasonable to leave this for review-time cleanup.

4. **Keep Planemo integration as a companion task after the workflow-test default is decided.** This is already known work in another repository, not a Galaxy-branch expansion. Current workflow framework tests opt in with `accept_license_agreements: true`; Planemo workflow tests do not yet transmit the hashes. Settle the default before introducing that user-visible behavior there.

No additional core scope is recommended from making this deck. Conditional applicability, alternative entitlements, administrator acceptance, and a public per-job authorization view remain separate designs. The shared-submit cleanup is the concrete optional code improvement to offer if John wants a small branch expansion; the wrapper pilot has higher adoption value.
