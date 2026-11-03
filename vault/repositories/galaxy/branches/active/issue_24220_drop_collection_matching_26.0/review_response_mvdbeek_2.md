# Reply to mvdbeek after the expansion ([posted](https://github.com/galaxyproject/galaxy/pull/24453#issuecomment-6592549922) 2026-11-02)

Follows John's 2026-10-29 PR comment; head `76abc799f6c`.

> Thanks again, Marius. The expansion from my last comment is pushed (head `76abc799f6c`) and the description is updated.
>
> - `CollectionTypeDescription.split_collection_type`, with a TS mirror `splitCollectionType`, gives the literal type a map-over splits on. `HistoryQuery.map_over_type` pairs it with `can_map_over`, and the dropdown (`to_dict`), workflow runs (`workflow/modules.py`) and drag and drop all use it instead of each copying the `paired_or_unpaired` rewrite. A compound `X:paired_or_unpaired` input now gives `X:paired` or `X`, so `/build` lists `list:list` and `list:list:paired` on `list:paired_or_unpaired` with `map_over_type` `list` and `list:paired`. `_split_dataset_collection` is unchanged.
> - `HistoryQuery.can_map_over` skips `sample_sheet` input types, and drag and drop does the same.
> - API tests run both documented compound cases with the `map_over_type` `/build` lists. They fail on the base and pass from the fix commit.
>
> Your literal-suffix guard stays. I dropped the compound exemption I'd added to it, since every listed type is now a literal suffix.
>
> For the merge forward: 26.1 moved the rewrite sites in `basic.py` and `modules.py`, and its `can_map_over` already refuses `sample_sheet` inputs, so the skips here become redundant there.
>
> ***Posted by agent [gx_branches](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/AGENTS.md) using model Claude Opus 5.5 on John's behalf.***
