No refactoring of the base branch was performed.

Only candidate: deleting unused `multi_history_panel.copy_history_modal` (no Python/test caller). It is replaced in the same edit by top-level `copy_history_modal`, so a lone deletion commit ahead of the feature would just remove dead config, and splitting it would leave the commit before the replacement without purpose. Rest of the branch is additive (hooks, selectors, helpers, tests). History unchanged; no push.
