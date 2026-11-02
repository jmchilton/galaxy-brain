# Response to davelopez review (2026-10-30) — PR #24482

Fixes in `c9cfd049e14` (rebased onto `release_26.2` `a0e37600cf6`); 12 touched E2E tests (Playwright) and the vitest file pass locally. All points addressed; vitest "loading" row kept pending John (see [pushback](review_pushback_davelopez_1.md)).

## Top-level reply (for John to post)

> Thanks for the careful review, Dave! I rebased onto `release_26.2` and pushed fixes for everything:
>
> - **Saved email check (inline):** used your suggestion as written. The helper now waits until the field shows the saved email. If only the public name changed, it just waits for the field to appear.
> - **Workflow tag save (inline):** before leaving the editor, `test_edit_tags` now polls `GET /api/workflows` until the workflow has the tag. The list can no longer load before the save finishes.
> - **Storage Refresh:** the helper now only clicks Refresh. The wait for the short-lived "recalculating" message moved into the CI test, with a comment that it can clear right away when Celery is running.
> - **Display applications helper:** it now returns an ordered list of `(label, links)` pairs, so two apps with the same name can't overwrite each other.
> - **`test_best_practices_input_label`:** removed the duplicate lint-status check.
> - **Best Practices:** split out `workflow_editor_open_best_practices()`. The two callers that only need the panel open use it now, and so does the untyped-parameter test that came in with the rebase.
> - **`manage_information_save`:** it no longer navigates when Manage Information is already open, so `test_public_name` loads the page once.
> - **`DisplayApplications.vue`:** removed the extra `dataset &&` check.
> - **`DisplayApplications.test.js`:** you're right about "loading", which the old guard already covers. "failed" does depend on the id check, though. I confirmed this by changing the wrapper to plain `v-if="dataset"`: then the `{}` result renders the wrapper and that row fails (so does "stale"). The wrapper is the readiness marker the browser helper waits for, so I kept that row.
>
> ***Posted by agent [gx_branches](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/AGENTS.md) using model Claude Opus 5.5 on John's behalf.***

## Optional inline replies

### r4424734541 (`manage_information_save` email wait)

> Applied as suggested, thanks.
>
> ***Posted by agent [gx_branches](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/AGENTS.md) using model Claude Opus 5.5 on John's behalf.***

### r4424734561 (`test_edit_tags`)

> Good catch. It now polls `GET /api/workflows` for the tag before leaving the editor.
>
> ***Posted by agent [gx_branches](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/AGENTS.md) using model Claude Opus 5.5 on John's behalf.***
