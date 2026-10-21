# Keyboard dismissal consistency

Scope review identified that Escape could still hide a focused Popper control without restoring focus. Accepted this modest expansion: Escape bubbling from within the popup now uses the same close handler. Added a failing-sensitive regression covering focus and visibility. The original implementation is preserved on `fix_story_a11y_followups_alt_original_scope`; no story lane changed. Five suites pass 74 tests after the addition. Fresh review and hardening follow.
