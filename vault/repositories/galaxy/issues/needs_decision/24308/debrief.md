# Debrief: type_source direct match before map-over

Source: [`issue_draft.md`](issue_draft.md) (from #24303 research). Proposal: [`proposal.md`](proposal.md).

## Research

- Re-pinned from `release_26.2` `e2649e52818` to `dev` `2cca8565861`. Line refs moved only slightly (`create_collection` 1215-1238, `query.py` 69-81, `structure.py` 213-217, `terminals.ts` 829-880).
- **Path 1 (direct run) reproduced.** Throwaway tool with `collection_type="list,list:list"` + `type_source`, run directly on a `list:list`: output created as `list`.
- **Path 2 (mapped precompute) reproduced, as predicted.** Throwaway `paired_or_unpaired` tool mapped over a `list:paired` (`map_over_type: paired`): implicit `list:paired`, element `paired_or_unpaired`.
- **Path 3 (editor) from code only.** No `node_modules` in the temp worktree or the main checkout, so no vitest run. The issue says so.
- **Path 4 (subworkflow export) dropped.** Already fixed on the #24303 branch, commit `c400bb3af48` "Resolve sliced type_source type in subworkflow editor export". Mentioned in Context only.
- **Blast radius audited.** All in-tree `type_source` tools declare one type, none, `list,list:paired`, or `sample_sheet` variants; none overlap by map-over. So the bug is latent for shipped tools; the issue says so up front.
- **Duplicates:** none. #23886 (closed, conditional/digit-name crash), #23444 (nested references), #23897 (legacy XML collection output) are adjacent, not overlapping.

## Repro gotchas

- `create_list_of_pairs_in_history` ignores `wait=True`; call `wait_for_fetched_collection` or the run maps over an unpopulated collection and gives an empty, misleading `list:list`.
- The first data fetch after server start can exceed 60 s; rerun before trusting a timeout.
- Env: `GALAXY_TEST_TOOL_CONF="lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml" GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false`, main checkout `.venv`, detached worktree in the scratchpad.

## Rewrite

- Led with a two-row table of reproduced behavior; editor rule follows, marked as code-reading.
- Opener is one line; code walk, tool XML and audit in details.
- Proposed approach is one paragraph; alternatives: lint overlapping declarations, prefer declared type everywhere.

## Review

One subagent round, nothing egregious. Changes:
- Added open PR #24227 (jmchilton, `release_26.0`) to Context: it rewrites the editor's `getCollectionTypeFromInput` to the server's current map-over-first order, fixing the `list:paired` → `list:paired_or_unpaired` example but copying the rule this issue reports.
- Proposed Approach made one rule: output type = the collection each job receives (HDCA's own type direct; sliced subcollection mapped).
- Flagged that naive `direct_match`-first breaks the DCE (mapped) case; details now branch on HDCA vs DCE.
- `structure.py` ref 214-217; audit wording includes sample_sheet.

Open:
- Concrete-vs-declared type for mapped outputs conflicts with one #24227 test assertion; decide before filing, or land #24227 first.
- Row 1 was observed in an earlier run whose log was overwritten; rerun if log evidence is wanted.
