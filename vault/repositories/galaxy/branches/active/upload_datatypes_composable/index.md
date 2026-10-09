# upload_datatypes_composable

Status: `branches_implemented_needs_ci`. Base: `dev`. Tip `cea986dee14`. Polished at `75c67e1fa27`; the provider removal since then makes `pr_description.md` stale, so it needs a re-polish.

Adds `useUploadDatatypes` and `useUploadDbKeys` composables over store-owned loading/error state, moves every consumer onto them, deletes `DatatypesProvider`/`DbKeyProvider`, and shows datatype and Database/Build load failures instead of empty selectors.

- [Implementation](implementation_debrief.md) ([original](earlier_drafts/1/implementation_debrief.md)) · [Provider removal](provider_removal.md)
- [PR description](pr_description.md) · [Titles](pr_titles.md) · [Polish debrief](polish_debrief.md)
- [Normal review](subagents/normal_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md)

Stacked on [#23995](../issue_23977_datatypes_fanout_26.1/index.md): its first three commits are cherry-picks of that PR. Once #23995 merges and `release_26.1` forward-merges to `dev`, rebase onto `dev` to drop them; keep `333b511c6d4` unless the forward-merge already ported those tests.
