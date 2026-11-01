```yaml
documents:
  - path: vault/repositories/galaxy/branches/merged/fix_story_a11y_followups/review_response_mvdbeek.md
    why: Records that menu-selection focus loss (CellAction direct visible write, CellAdd .popper-close delegation) was deliberately deferred to #24335, and the close()/hide() design choices reviewers accepted.
    load_when: Implementing the fix or writing the PR/issue reply; confirms why the existing handlers were left alone.
  - path: vault/repositories/galaxy/branches/merged/fix_story_a11y_followups/implementation_debrief.md
    why: Design of Popper close(), hide(), focusReturnTarget and the release_26.2 targeting rationale this branch builds on.
    load_when: Choosing how to expose close() and what tests to extend.
  - path: vault/repositories/galaxy/branches/merged/fix_story_a11y_followups/scope_evaluation.md
    why: Scope boundary decisions for the Popper focus policy (what is in/out, e.g. no generic hover/focus policy).
    load_when: Deciding whether to widen beyond the two Markdown menus.
  - path: vault/repositories/galaxy/branches/merged/fix_story_a11y_followups/test_challenges_debrief.md
    why: Prior challenge of the Popper focus tests; useful template for testing focus return.
    load_when: Writing or reviewing tests.
  - path: vault/repositories/galaxy/branches/merged/fix_story_a11y_followups/screenshot_debrief.md
    why: How browser/keyboard verification of Popper focus return was done last time.
    load_when: Verifying the keyboard flow in a browser.
  - path: vault/projects/just_jesting_around/BUGS_FOUND.md
    why: Ledger of Popper and Markdown editor a11y/bug findings from story work (close icon, TextEditor insertion).
    load_when: Checking whether adjacent Popper or Markdown editor issues are already known.
  - path: vault/research/Component - Galaxy UI Buttons and Tooltips.md
    why: GButton is the trigger for both menus (CellAdd/CellAction pass buttonRef.$el as referenceEl); explains its rendering and tooltip behavior, but excludes Popper.
    load_when: Reasoning about which element receives returned focus or about tooltip side effects.
research_requests:
  - vault/agents/gx_research/todo/popper_popovers_and_focus.md
```
