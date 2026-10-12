# User-requested text/float split — 2026-10-12

John approved moving numeric-text initial defaults and connected-option preselection, newline-default row presentation, boolean/required-None validation and newline error guidance into PR #23992. Multiple float editor/default/API capability remains on the follow-up branch.

Previous implementation/review/screenshot records are in `earlier_drafts/1/`. The original PR will get one text-only commit; the follow-up is rebased onto it, retaining the float implementation and tests. Local backup ref preserves combined head `55ea1ee8f42ae8b6426c662184f38a844693b132`. No new PR will be opened. Update PR #23992's description after tests and normal review pass, including correction of unreachable float claims and the documented empty-valued restricted-option limitation.
