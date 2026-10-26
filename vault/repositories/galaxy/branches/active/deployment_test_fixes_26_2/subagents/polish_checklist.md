All agent-answerable general checklist items pass at `9d5f0d32df81`; no fixes required. Human reading remains unchecked for John.

- Failure behavior: propagated history-body failures and explicit runtime skips reach pytest; publishing tests remain collectible.
- Diff hygiene: Yes!
- Tests: exercise callable preservation, argument/result behavior, and independently enabled restrictions.
- Baseline: `89b8cc3b93a` leads implementation; baseline and red regression evidence are in the test-challenge debrief.
- Comments: explain current restrictions without excess archaeology; historical-description item is N/A.

The independent reviewer inspected the full diff and hardening notes. Galaxy workflow execution/editor contracts are untouched, so the workflow checklist does not apply. Live deployment validation remains unverified.
