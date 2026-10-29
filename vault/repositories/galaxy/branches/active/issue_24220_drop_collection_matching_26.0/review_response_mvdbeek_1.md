# Response to mvdbeek review 1 (2026-10-25)

Review: https://github.com/galaxyproject/galaxy/pull/24453 (no inline comments; one review body).

## Taken

- Marius' commit `93ee487fbe5` ("Refuse dropped collections the server cannot split for map over"), fast-forwarded and pushed to `jmchilton`. Head now `93ee487fbe5`. `FormData` vitest dir: 72/72 pass.
- Resolves the record's open decision: map-over drops onto `sample_sheet` inputs are refused, not relaxed.
- Merge-forward note corrected: `canMatch` → `accepts` already on `release_26.1` (39597b33667), not only `dev`.
- API-shard red `test_data_input_recovery_on_delayed_input` recorded as unrelated.

## Right level? (vs `doc/source/dev/collection_semantics.md`)

Marius' commit refuses two families. They're not equal:

1. **`sample_sheet` map-over target — right level.** `COLLECTION_TYPE_REGEX` only allows `sample_sheet` as an outer type, so no split ever yields one. Semantics doc says nothing about it. Remaining bug is server-side: `/build` lists it at all.
2. **Compound `X:paired_or_unpaired` — wrong level, fine as 26.0 stopgap.** Semantics doc says these are *valid*:
   - `MAPPING_LIST_LIST_OVER_LIST_PAIRED_OR_UNPAIRED`: "the nested list can be mapped over a `list:paired_or_unpaired` input to produce a flat list".
   - "A `list:list:paired` can be mapped over ... a `list:paired_or_unpaired` input to produce a flat list (`list`)."

   Marius' new refusal rows `["list:list", ["list:paired_or_unpaired"]]` and `["list:list:paired", ["list:paired_or_unpaired"]]` encode the server limitation, contradicting the spec. Root cause: `basic.py` (`to_dict` listing), `workflow/modules.py` (invocation) and client `collectionMatch.ts` each copy a rewrite that only turns bare `paired_or_unpaired` into a literal split type (`paired` / `single_datasets`). None turns compound `X:paired_or_unpaired` into the literal suffix `_split_dataset_collection` needs (`list:list` → `list`, `list:list:paired` → `list:paired`). The yml label only has a `workflow_editor` test; no tool-run/API test, so it never ran.

Proper fix: one "concrete split type" helper on `CollectionTypeDescription` (Python + TS mirror) used by all three sites; then Marius' literal-suffix guard only fires for `sample_sheet`. Client-only rewrite now would make drop value disagree with dropdown (Marius wants agreement) — don't.

Side effect to note in follow-up: server/client pick deepest map-over first (`HistoryQuery.can_map_over`), so `list:list` on `["list:paired_or_unpaired", "paired_or_unpaired"]` is now refused even though the shallower `paired_or_unpaired` (`single_datasets`) runs.

Follow-up draft: [followup_issue_split_paired_or_unpaired.md](followup_issue_split_paired_or_unpaired.md). Not posted.

## Not acting on

Nothing pushed back. Server fix kept out of this 26.0 PR (scope; John's call where it lands).

## Suggested PR reply (not posted)

> Thanks Marius, took the commit as-is (head `93ee487fbe5`) and fixed the Risks section, which was wrong about `sample_sheet`. Also corrected the merge-forward note for 26.1.
>
> One note on the compound case: `collection_semantics.md` documents `list:list` → `list:paired_or_unpaired` (`MAPPING_LIST_LIST_OVER_LIST_PAIRED_OR_UNPAIRED`) and `list:list:paired` → `list:paired_or_unpaired` as valid map-overs. So I read those refusals as a stopgap for a server gap rather than the intended semantics. The listing (`DataCollectionToolParameter.to_dict`) and `workflow/modules.py` only rewrite bare `paired_or_unpaired` to a literal split type. Rewriting compound `X:paired_or_unpaired` to the collection's literal suffix (`list`, `list:paired`) should make `_split_dataset_collection` work unchanged. Then the client guard only needs to cover `sample_sheet`. I'll write that up as a follow-up issue.
>
> ***Posted by agent [gx_branches](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/AGENTS.md) using model Claude Opus 5.5 at effort low on John's behalf.***
