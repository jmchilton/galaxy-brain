# galaxy#23863 — [26.1] Match empty collections in the job cache

- Author: mvdbeek
- Base: `release_26.1` (merge-base `167c26bc68c`)
- Reviewed head: `d0b4ffa9730`
- Fixes: #23570 (metaSPAdes rerun not cached; optional `multiple` inputs mapped over `list:list` with all-empty inner lists from `__FILTER_EMPTY_DATASETS__`)
- Worktree: `~/projects/worktrees/galaxy/pr/23863`
- CI at review: 28 pass, 28 pending, 1 fail (`Mulled Unit Tests` / `test_quay_search` — network flake, unrelated)

## Change

`JobSearch` matches collection inputs by a signature of leaf datasets plus a pre-filter needing
at least one shared dataset. An empty collection has no leaves, so it never matched anything.

`lib/galaxy/managers/jobs.py`:
- New `_is_empty_collection_of_type()` (correlatable `EXISTS`: collection of given type,
  `populated_state == ok`, no elements) and `_is_empty_collection()` (runs it for one id).
- `_build_stmt_for_hdca` (:959-968): when requested HDCA is an empty populated collection, join
  job's input HDCA and require it to be an empty populated collection of the same type; skip the
  signature CTEs.
- `_build_stmt_for_dce` (:1197-1215): same for a DCE whose child collection is empty, plus
  element identifier equality.
- `.scalar()` -> `.one()` / `.scalar_one()` on the collection type lookups.

`lib/galaxy_test/api/test_tools.py`: `_run_and_get_job` helper + 3 API tests (map over
`list:list` with an empty inner list; empty `list` passed directly; `{a: []}` vs `{b: []}` not
reused). First two use a fresh user via `_different_user_and_history` + `@requires_new_user`.

## Verdict

Approve. Targeted, correct for the reported case, appropriate scope for a release branch. One
design note worth a `dev` follow-up (finding 1); rest are nits.

## Findings

1. **Medium (design / follow-up, not blocking for 26.1)** — special-case branch instead of fixing
   the signature. `jobs.py:959`, `:1197`. The signature CTEs inner-join every level down to an HDA
   (`jobs.py:988-996`, `:1022-1031`, `:1074-1084`, `:1112-1121`, and the DCE equivalents
   `:1248-1260`, `:1366-1380`), so any path ending in an empty subcollection is silently dropped.
   The PR patches only the "whole thing is empty" case. Consequences that remain (reasoned from the
   SQL, not run):
   - Unmapped `list:list` `{a: []}` vs a copy of `{a: []}` still misses (PR says so explicitly;
     the new test only checks the negative `{a: []}` vs `{b: []}`).
   - Mapping over `list:list:list` with empty innermost lists: DCE child is a `list:list` with
     elements but no leaves → still misses. Same class as #23570, one level deeper.
   - Pre-existing false positive: `{a: [x], b: []}` and `{a: [x]}` / `{a: [x], c: []}` produce
     identical signature arrays (and identical leaf counts in the DCE path, `:1465-1468`), so a
     job is reused across inputs with different element structure. A tool that reads identifiers
     (e.g. `identifier_all_collection_types`) would get the wrong cached output.
   A signature that emits one row per *terminal path* (HDA leaf, or empty subcollection with a
   marker like `a;b;<empty:list>`) via outer joins would fix all three and remove both new
   branches plus the extra round trip. Suggest as a `dev` follow-up issue; the narrow fix is fine
   for 26.1.

2. **Low** — `jobs.py:912-913`, `:959`, `:1197`: `_is_empty_collection` is an extra DB round
   trip per collection input. In the HDCA path, the preceding query (`:945-950`) already selects
   `id, collection_type`; the emptiness `EXISTS` could be another column of that same select.
   Minor; job search already does several lookups.

3. **Low (tests)** — `test_run_identifier_all_collection_types_empty_inner_lists_use_cached_job`
   passes on the base branch too (signature path never matched empty-leaf collections). It's a
   guard against an over-broad fix, not red-to-green — fine to keep, but worth knowing. If
   finding 1 is ever fixed, a positive `{a: []}` vs `{a: []}` assertion belongs next to it. Also
   this test lacks the fresh-user isolation the other two needed; once empty-leaf structures can
   match, a leftover `b` job from a previous run against a persistent DB would make it flaky.

4. **Nit** — tests 1 and 2 run the populated collection first (as a distractor that must not be
   matched), but nothing says so; a short comment would explain why that run exists. The existing
   comment about fresh-user isolation is useful, not obvious — keep it.

5. **Nit** — `_is_empty_collection_of_type(self, collection_id, ...)`: `collection_id` is
   untyped (it takes an int or a column); the sibling is typed `int`.

Checked, no action:
- New branches drop the candidate-HDCA history owner/published filter the signature path uses
  (`:1083`, `:1109`), but `_filter_jobs` (`:692-700`) still restricts to the user's jobs or
  published histories, and an empty collection carries no data. No leak.
- Imports: `Exists` under `TYPE_CHECKING`, `requires_new_user` at module top. Fine.
- `_run_and_get_job` is a small reusable helper; the `get_job_details(outputs["jobs"][0]["id"],
  full=True)` pattern appears ~8 more times in the file and could adopt it later.
- `populated_state == ok` on both sides prevents a not-yet-populated collection being treated as
  empty. Good.
- `copy_collection` defaults `copy_elements=True`, so tests compare distinct `DatasetCollection`
  rows, not the same one.

## Draft PR comment (unposted)

> *Posted by Claude (AI assistant) on behalf of jmchilton — not written by them personally.*
>
> Looks right for #23570 and a sensible scope for 26.1. Approving.
>
> One thing for a `dev` follow-up rather than this PR: the signature CTEs inner-join every level
> down to an HDA, so any branch ending in an empty subcollection drops out of the signature. This
> PR fixes the "entirely empty" case, but a few neighbours remain:
>
> - unmapped `list:list` `{a: []}` vs a copy of `{a: []}` still misses (you call this out);
> - mapping over a `list:list:list` whose innermost lists are empty still misses — the DCE child
>   is a `list:list` with elements but no leaves;
> - (pre-existing) `{a: [x], b: []}` and `{a: [x], c: []}` have the same signature array, so a job
>   can be reused across inputs with different structure — wrong for tools that read identifiers.
>
> Emitting one signature row per terminal path (leaf HDA, or empty subcollection with a marker)
> via outer joins would cover all three and let the two new early-return branches go away.
>
> Small things, take or leave:
> - In `_build_stmt_for_hdca` the emptiness check could be one more column on the existing
>   `id, collection_type` select rather than a second query.
> - `test_run_identifier_all_collection_types_empty_inner_lists_use_cached_job` passes on the base
>   branch as well — fine as a guard, but it doesn't need the fresh-user isolation only because
>   empty-leaf structures can't match yet.
> - A one-line comment on why tests 1/2 first run the populated collection would help.
