# galaxy#23862 — Percent-encode panel view ids in tool search index dir names

- Author: mvdbeek
- Base: `dev` (milestone 26.2); reviewed at head `346d7d932ca` (merge-base with origin/dev `90eca92b007`)
- Size: +60/-3, 3 files; no CI failures at review time; no prior reviews/comments
- Fixes #23081 (startup `OSError: [Errno 22]` creating `tool_search_index/ontology:edam_operations` on NFS/SMB)
- Worktree: `~/projects/worktrees/galaxy/pr/23862`

## Change

New `panel_view_index_dir(index_dir, panel_view_id)` in `lib/galaxy/tools/search/__init__.py:76`
percent-encodes (UTF-8 bytes) every char outside `[A-Za-z0-9_-]`, so `ontology:edam_operations`
-> `ontology%3Aedam_operations`; `default` unchanged. Both index-dir construction sites use it:
`ToolBoxSearch.__init__` (:115) and `CachedToolboxSearch._sync_panel_searches` (:233). Those are
the only two places a panel view id becomes a path (grepped `lib/`).

## Verdict

Approve. Small, correct, both call sites covered, tests are red-to-green (on macOS/Linux the old
code happily creates `ontology:...`, so the directory-name assertions fail before the fix).

## Reuse check

- `galaxy.util.safe_filename_component` (`lib/galaxy/util/__init__.py:1276`) and
  `sanitize_for_filename` (:781) exist but are lossy (map to `_`) — would collide
  `ontology:edam_operations` with `ontology_edam_operations`. Not suitable; PR's own distinctness
  test pins exactly this.
- `urllib.parse.quote(id, safe="")` is the obvious stdlib alternative, but it leaves `.` and `~`
  unescaped — verified `quote("..", safe="")` stays `..`, so an id of `..` would resolve to the
  parent dir. The custom regex (which also encodes `.`) is justified. Not a finding.
- Helper is a single-purpose function next to its only consumers; no wider abstraction warranted.

## Findings

1. **low / question — stale old dirs.** On filesystems that accepted `:`, upgraded instances keep
   orphaned `ontology:edam_*` index dirs forever (PR body says "can be deleted"). Nothing in
   `get_or_create_index` (:90) or elsewhere prunes `tool_search_index_dir`. Fine to leave manual;
   a release-notes line would make it discoverable. Optional.
2. **low / question — backport.** #23081 is a startup crash reported on an older release; PR targets
   `dev`. The search module was heavily reworked on dev (`CachedToolboxSearch`), so a backport would
   only need the `ToolBoxSearch` half. Worth asking if a release-branch fix is wanted.
3. **nit — test overlap.** `test_panel_view_index_dir_encodes_unsafe_characters` /
   `..._keeps_distinct_ids_distinct` (`test/unit/app/tools/test_toolbox_search.py:35-46`) are pure
   helper tests alongside two real end-to-end tests (`test_panel_view_index_dirs_use_encoded_ids`
   :124, `test_search_index_dirs_use_encoded_panel_view_ids` in
   `test/unit/app/tools/source_store/test_multi_store_search.py:112`). The helper tests earn their
   keep via the `..`-traversal, unicode, and collision cases — not trivial. No action.

Imports: `re` at module top; test import at top. No obvious comments; docstring concise and
explains the why. No tests weakened.

Not run: no `.venv` in worktree; tests not executed locally.

## Draft PR comment (unposted)

> *Posted by Claude (AI assistant) on behalf of jmchilton — not authored by them personally.*
>
> Looks good to me — both places a panel view id becomes a path now go through the helper, and the
> tests fail on the old code. I checked whether an existing helper could do this:
> `galaxy.util.safe_filename_component` / `sanitize_for_filename` are lossy (would collide
> `ontology:edam_operations` with `ontology_edam_operations`), and `urllib.parse.quote(..., safe="")`
> leaves `.` alone so `..` would escape the index dir — so the small custom encoder makes sense.
>
> Two optional questions:
> - Worth a release-notes line about the orphaned `ontology:edam_*` index dirs on filesystems that
>   accepted `:`? Nothing prunes them.
> - #23081 is a startup crash on an older release — is a release-branch fix (just the
>   `ToolBoxSearch` half) wanted, or is dev-only fine?
