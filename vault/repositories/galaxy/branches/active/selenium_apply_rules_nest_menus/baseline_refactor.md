# Baseline refactor: selenium_apply_rules_nest_menus

No refactoring of the base branch was performed.

Head stays `3948673005b` (one commit on `origin/release_26.2`, +64/-0). Nothing was rewritten or pushed, and E2E wasn't rerun because nothing changed.

## Why

- Every hunk in `git diff origin/release_26.2...HEAD` is an addition: one navigation target in `navigation.yml` and `schema.ts`, two new `NavigatesGalaxy` helpers, and one new test. No existing line changes, so there's no base behavior a refactor commit could restore or reshape.
- The only refactors in reach rewrite existing code, and earlier steps already settled both:
  - **Shared open → select input → edit rules test helper** (touches `_tool_apply_with_source`): declined by the normal review, test challenges, polish, and thermo reviews (2-3 callers, coverage-only PR).
  - **Rule-builder editor abstraction / moving the 12 sibling helpers onto `rule_editor_column_selector`**: the thermo review parked this as a dev follow-up. Doing it here would rewrite 12 helpers on release_26.2.
- **Splitting the new helpers and nav target into their own commit before the test**: rejected. That's additive scaffolding with no other callers, not a refactor, and splitting it only adds a commit to review.
- **`history_wait_for_new_collection`**: still byte-identical to `jmchilton/selenium_collection_build_convert`. Moving it into a separate shared commit would make that commit differ from the other branch's history without merging any better. `git merge-tree` is already clean.
