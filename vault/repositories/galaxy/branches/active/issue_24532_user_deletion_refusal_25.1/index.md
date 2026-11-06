---
upstream_base_branch: release_25.1
---

# Explain a refused account self-deletion (#24532)

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:issue_24532_user_deletion_refusal_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24532_user_deletion_refusal_25.1)

## Status

Polished for [#24532](https://github.com/galaxyproject/galaxy/issues/24532) at `cc83de7a759`, awaiting final review; re-scoped once (alt `_alt_original_scope`).

No PR yet; see [description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md) and [polish debrief](polish_debrief.md).

Fork CI queued at `cc83de7a759`; green at the tree-identical pre-rebase `551bc3a8e7f`.

## Base choice

The bug exists on every branch since 25.1 (#19658); on 25.1 and 26.0 the 403 branch also never assigns the message. A small, clean client fix, so it targets the oldest supported release.

## Merge-forward

From 26.1 on, `UserDeletion.vue` conflicts. Keep 26.1's GModal template, and port this branch's `requestDeletion()`, which holds the `CONFIG_DOES_NOT_ALLOW` mapping and the `try/catch` that 26.1 lacks. Call it from 26.1's `handleSubmit` in place of the raw `GalaxyApi().DELETE`; the two `handleSubmit`s otherwise have the same shape. Drop `event.preventDefault()`, because GModal's `:close-on-ok="false"` already keeps the modal open.

The test hunks probably merge cleanly into 26.1's vitest/GModal test file but won't run there unchanged:
- `submitDeletion()` must emit `ok` with `findComponent(GModal).vm.$emit("ok")` instead of clicking `.btn-danger`.
- `expectModalStillOpen` (BModal's `change`) has to go or be rewritten for GModal.
- The `.btn-danger` disabled checks need GModal's OK-button selector.

Issue notes: [queued/24532](../../../issues/queued/24532/index.md).
