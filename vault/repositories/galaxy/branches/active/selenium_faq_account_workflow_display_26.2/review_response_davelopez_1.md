# Response to davelopez review (2026-10-30) — PR #24482

Commit `c22216c4565` (unpushed until approved); 8 touched E2E tests pass locally (Playwright). No contention; all points addressed except vitest rows (explained, kept).

## Inline replies

### navigates_galaxy.py `manage_information_save` email wait (r4424734541)

> Applied your suggestion as written — the helper now waits for the span to show the saved email, and only falls back to plain visibility for public-name-only saves. Thanks!
>
> ***Posted by model Claude Opus 5.5 at effort low on jmchilton's behalf***

### test_workflow_editor.py `test_edit_tags` (r4424734561)

> Good catch. The test now polls `GET /api/workflows` until the workflow carries the tag before leaving the editor, so the list can't load ahead of the save.
>
> ***Posted by model Claude Opus 5.5 at effort low on jmchilton's behalf***

## Top-level reply

> Thanks for the careful read — pushed fixes for both inline comments plus:
>
> - **Storage Refresh:** the helper now only clicks Refresh; the wait on the transient "recalculating" alert lives in the CI test (with a comment noting it can clear instantly under Celery).
> - **Display applications helper:** now returns an ordered list of `(label, links)` so duplicate labels can't collide.
> - **`test_best_practices_input_label`:** dropped the duplicate lint-status check.
> - **Best Practices:** split out `workflow_editor_open_best_practices()`; the two callers that only need the panel use it.
> - **`manage_information_save`:** skips navigating when Manage Information is already open, so `test_public_name` loads it once.
> - **`DisplayApplications.vue`:** removed the redundant inner `dataset &&`.
> - **`DisplayApplications.test.js`:** agreed "loading" only exercises the existing guard. "failed" (`{}`) does need the id check though — with only `v-if="dataset"` the new wrapper would render for an empty object — so I left both rows in.
>
> ***Posted by model Claude Opus 5.5 at effort low on jmchilton's behalf***
