# Codex review

Codex (`codex exec -s read-only`, unprimed brief from #24220 plus the re-scoped goals) reviewed `d45d2fdb3bc..4e52bb43c07` and raised one P1. I confirmed and fixed it. Nothing was left unaddressed.

- **Fixed: a dropped collection element lost its map-over on form refresh.** The server's `DataCollectionToolParameter.to_dict` lists the selected DCE as `{id, hid: -1, name, src: "dce", tags}`, with no `map_over_type`. `formattedOptions` let that entry overwrite the client-built keep option, so the next emit was `batch: false, map_over_type: null`, and the whole `list:list` went to a `list` input as one job. I confirmed this with a throwaway API probe against `/api/tools/collection_creates_list/build` using a batch `dce` value: the server returned the bare DCE option. The fix: the merge in `FormData.vue` for other-source options keeps the cached `map_over_type` when the server's entry lacks one. The red test "keeps a dropped element mapped over after the form refreshes its options" was folded into `e42b197b14c` (element map-over). It fails at the parent and passes there.

<details><summary>Details</summary>

Coverage: the four changed files, plus `FormElement.vue`, `FormDisplay.vue`, `ToolForm.vue`, `Tool/services.js`, `collectionTypeDescription.ts`, and server `basic.py`, `meta.py`, `dataset_matcher.py`, `populate_model.py`, `type_description.py`, `query.py`, `sample_sheet_util.py`. Codex ran the FormData tests (42 pass) and reproduced the finding in memory.

Finding (P1, correctness, `FormData.vue:477`): "Dropped collection elements lose their mapping when options refresh". Codex's scenario: drop an element holding a `list:list` onto a `list` input, then refresh with the server's selected-DCE entry. The next emission is `batch: false, map_over_type: null`.

Round 1's Codex run (`earlier_drafts/1/codex_review.md`) missed this. Its brief didn't cover the refresh path, and it had no findings.

</details>
