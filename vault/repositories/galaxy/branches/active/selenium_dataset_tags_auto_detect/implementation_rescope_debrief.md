# Re-scope debrief

[The round-1 scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended a small expansion. Every review round had flagged the `#dataset-attributes-default-save + button` sibling selector, and each deferred it only because the plan ruled out client changes.

- I kept the round-1 result as `selenium_dataset_tags_auto_detect_alt_original_scope` (`142b0facd30`, pushed); see [alts/original_scope.md](alts/original_scope.md).
- On the parent, the Attributes tab's Auto-detect `GButton` in `DatasetAttributes.vue` now has `id="dataset-attributes-autodetect-metadata"`, matching the Datatypes tab's `#dataset-attributes-autodetect-datatype`. `edit_dataset_attributes.auto_detect_metadata_button` now points at it. This is folded into the Auto-detect commit, since the selector is introduced there.
- I rebuilt the client in place. The Auto-detect E2E test passes under Playwright and Selenium. `DatasetAttributes.test.ts` passes under the pinned node.
- The [post-rescope review](subagents/rescope_normal_review.md) approved. I added its suggested vitest, which checks that the new id submits `autodetect`; it passes and fails without the id.
- Head `157d6e7c064`, pushed.
