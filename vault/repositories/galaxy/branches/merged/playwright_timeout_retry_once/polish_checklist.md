# Polishing checklist — 2026-10-13

Fresh independent GENERAL review: passes, no blockers. Human-read item remains unchecked for John. `WORKFLOW_RELATED` does not apply: browser-test infrastructure changes without changing editor, scheduler, invocations, collection mapping, or gxformat2 behavior.

| Item | Answer and evidence |
| --- | --- |
| What does the user see when it fails? | Test runners receive the original Playwright timeout after its second occurrence in one helper invocation. The bare raise preserves the exception and traceback. |
| Is the diff free of unrelated or stale generated changes? | Yes! |
| Are unit tests not just testing the literal implementation? | Yes. Observable callback counts and exception types reject both the old twelve-call behavior and removal of the surviving retry. The stale-element case rejects capping all transition errors. |
| Are the comments free of excess archeology? | Yes. Comments explain the different timeout budget and existing stale-element call count. |
| If comments describe previous implementation or bugs, what purpose do they serve? | The test comment explains the failure delays motivating the cap. |

The counter is local to each helper invocation, increments only after an accepted Playwright timeout, and re-raises on its second occurrence. Existing budget and exception-classification checks run first. The conflict-free rebase preserves the patch exactly (`git range-diff` reports equality), so its checklist answers still apply.
