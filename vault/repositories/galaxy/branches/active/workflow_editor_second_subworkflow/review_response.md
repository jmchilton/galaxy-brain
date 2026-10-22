# Review response — #24314 (mvdbeek, approved at `41125e9268d`)

Tone: approving, no design contention. One optional inline suggestion, applied in `41c4bed8e84`.

## Inline comment 4337968814 (`navigates_galaxy.py:1484`, spinner wait)

Applied, adapted: `node.loading(label=name)` raises `KeyError: '_'` because `${_}` children only resolve through the parent template, so the helper binds `node._(label=name)` first and uses `.loading` (same idiom as `node.title` / `node.destroy`). Selector is `.loading-icon`, not a new `data-description`, to keep the release-branch diff test-only. Verified `onInsertWorkflow` → `insertStep` → `getModule` sets loading before its first `await`.

Draft reply (not posted):

> Applied in 41c4bed8e84, thanks. `onInsertWorkflow` goes straight through `insertStep`, so the spinner is up the same tick the node is added. One adjustment: `node.loading(label=name)` raises `KeyError: '_'` because `${_}` children only resolve off the parent template, so it's `node._(label=name).loading`, the same pattern as `.title`/`.destroy`. I kept the `.loading-icon` selector so the release branch stays test-only, and dropped the trailing `UX_RENDER` sleep in `setup_subworkflow`. `test_editor_embed_two_workflows`, `test_editor_embed_workflow` and `test_conditional_subworkflow_step` pass on Playwright.
>
> ***Posted by model Opus 5.5 on jmchilton's behalf***
