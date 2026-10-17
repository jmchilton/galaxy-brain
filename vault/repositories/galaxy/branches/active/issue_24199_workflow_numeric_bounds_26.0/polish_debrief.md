# Polish debrief

Polished at head `8df2892c73f` (base `release_26.0` @ `a6544be047d`). No branch commits; description, titles and tags only.

- **CI:** fork run on head still queued at polish time, no reds. Not yet evidence; check before approval.
- **Checklist** (GENERAL + WORKFLOW_RELATED, fresh subagent): all items pass. Judgement calls carried into the description rather than fixed:
  - the two changed Selenium assertions (still need John's OK; judged justified, server messages still pinned by a unit test);
  - "who hits this" is internal discovery only, stated plainly;
  - behavior change for existing bounded/inverted workflows is named in Risks.
- **Strengthening** (fresh subagent): no new development needed. Applied:
  - re-ran red/green on final head: head `test_modules.py` vs base lib gives 10 failed (all bug-asserting incl. inverted bounds), head 79 passed;
  - fixed overclaims: server validation qualifier (inverted bounds 400 vs 500), "silently corrected", the negate/exclude risk wording, the multiple-integer claim (run-form change only, not this head), "every new test red" narrowed, Codex review dated before K1;
  - added highlighted answers for misreadings: client correction, export format unchanged, tool-form impact, why 26.0; "(unsaved changes)" marker added to Risks.
- **Left over (not done, one round only):**
  - Codex/thermo reviews predate the K1 `get_errors()` commits; not re-run.
  - API tests' base failures argued, not run.
  - Multiple-integer forward-merge not re-checked with the full head; slider layout beside the remove button never checked.
  - Scope questions (all already follow-ups): live inverted-bounds feedback (K2), flag out-of-range defaults, `%s` for `0`, bounds-as-bounds export, merge order with `issue_24200_workflow_input_validators`.
- **Labels:** `kind/bug`, `area/workflows`, `area/UI-UX`.
