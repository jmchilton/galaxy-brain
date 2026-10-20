# Debrief: output_collection_type_prefix

Source: `to_file/output_collection_type_prefix.md`, which came out of the #24190 review. Proposal: `to_file/proposed_output_collection_type_prefix.md`. Prepared 2026-10-20 against `dev` `2cca8565861`.

## Research

- **The premise isn't on `dev` yet.** `dev` Nest still has `collection_type="list,paired"` and `type="list:list"`. There, `list:paired` maps over its pairs, and the declared type agrees with that (wrong) runtime. The mismatch only appears with #24190, which is open against `release_26.0` with head `a6d7e445d63`. So the issue is framed as a follow-up to #24190, with 🌿 `pr_24190_review_0` (head `6f36ac97004`, pushed to the fork but not into the PR) as context.
- **Evidence** is the review's focused reproduction (`reviews/active/24190/reproduction-output.txt`) and the branch API test `test_nest_map_over_list_of_lists_of_pairs`. The editor consequences are inferred from the code (`get_all_outputs`, `OutputCollectionTerminal`). Nobody observed them in a browser, and the issue says so.
- **No duplicates.** The draft searched 5 queries and the reviewer 11. #23444, #23886 and #23897 are adjacent to `type_source`, not duplicates.
- **Stale line refs.** All of the source draft's line refs were stale against `dev`, so I re-pinned them as permalinks at `2cca8565861`.
- **Missed touch point.** The source draft missed the non-mapped runtime path, `create_collection` in `tools/actions/__init__.py:1221`, which is where `type_source` is actually resolved. The proposal adds it.

## Rewrite

- Restructured to `GX_ISSUE_DESCRIPTIONS.md`: a single-line opener, then a table of declared vs runtime types, with outcomes in the body. The proposed approach is one paragraph, with syntax, touch points, tests and open questions folded into details. The Alternatives section covers the Python hook, per-type Nest tools, and a templated type expression.
- The source's outcome table claimed `list:record → list:list:record` and similar. That only holds if Nest's input lists those types, so the table is now per accepted input type.

## Review round (subagent, one pass)

The reviewer found no pushback on the premise and made these corrections, which I spot-checked against `dev`:

- **Runtime vs editor resolution.** At runtime, `type_source` resolves to the *matched declared* type only when mapping over. On a direct match, `can_map_over` is false and the runtime falls back to the connected collection's own type. The client always uses the declared match. The two diverge for `list:paired` connected to a `list:paired_or_unpaired` input, and for `sample_sheet` connected to a `list` input.
- **Map-over beats direct match** on both server and client, so accepting both `X` and `list:X` resolves oddly. The proposal now states one shared resolution rule: direct match first, otherwise the mapped-over declared type.
- **Second in-tree consumer.** `convert_sample_sheet.xml:19` says "type_source is a lie". Its `sample_sheet:X → list:X` transform can't be expressed by a prefix. This is added as supporting motivation, and the "no other consumer" claim is corrected.
- **False table row.** "list only + list:record maps over" was false: `list:record` is rejected today. The table was rebuilt.
- One link was moved from `terminals.ts:812` to `:824`, plus some wording fixes.

## Left over

- Should the shared resolution rule be fixed in this issue, or as a separate fix to plain `type_source`? It's a latent issue: no in-tree tool hits it today.
- tools-iuc hasn't been surveyed for other consumers.
- The editor behaviour hasn't been observed in a browser.
- Timing: #24190 is unmerged, and the hook branch isn't in the PR yet. Filing now references unmerged work.
- Attribute name (`type_prefix`?) is John's call.
