# Marius review follow-ups — 2026-10-14

PR: [galaxyproject/galaxy#24106](https://github.com/galaxyproject/galaxy/pull/24106). John requested implementation with thorough polish and a detailed explanation of any conflict between the creating-job boundary and provenance from jobs run on imported copies.

## Decision and relationship semantics

Keep the copy-chain strategy, but treat only ordinary copies as continuations of the same item. A pass-through or cached output is a distinct job output even when it shares data and has a copy link. Its own immediate job connections define its relationships.

The suspected clash with the existing jobs-on-copies behavior did **not** occur:

```text
Original history: A --T1--> B
Imported history: A' (copy of A), B' (copy of B)
New job:         A' --T2--> C
```

Clicking A' returns A', B', C. T2 consumes A', so it adds an input association, not a creating-job output association. The walk collects T2's output at A', then reaches A and collects T1's output. Mapping B back finds B'. Clicking B' returns A', B'; clicking C returns A', C. Copying the history again retains those results. These are unchanged expectations in the API regression and also covered for datasets and collections in the manager tests.

The walk includes the first job-created ancestor and collects that ancestor's connections. It stops *before following that ancestor's own copy link*. Checking the model's inherited creating-job property, or excluding the first creating-job ancestor entirely, would incorrectly break ordinary imported provenance. The implementation uses direct output associations.

For pass-through outputs, the difference is concrete:

```text
A --T1--> B --pick_value--> P
          B --T2---------> C
```

Clicking P returns B, P, excluding A and C. The original PR incorrectly followed P's copy link to B and included B's creator and other consumers. Imported P' still reaches P and obtains its own relationships, then maps B to B'. Cached outputs likewise retain the cached run's immediate inputs rather than another run's downstream outputs.

## The additional hidden-element trap

The real `__FILTER_FAILED_DATASETS__` API regression exposed a limitation of the proposed direct-row guard: its hidden output HDAs have a copy link but no individual `job_to_output_dataset` row. Their containing HDCA is the registered job output. The optional hidden-beneath marker is also unset in the reproduced case. Stopping only at explicit HDA output rows still highlighted the filter's hidden output when clicking an unrelated cat job's output: `[2, 9, 13]` rather than `[2, 13]`.

Collection output ownership is therefore detected using actual dataset-collection membership, including nested membership. That ownership check is batched across possible copy ancestors rather than repeated for every hop.

**Membership alone would create a clash:** a tool can reuse an existing imported input HDA inside an output collection. That does not make the HDA a newly produced output. The guard excludes collection jobs that consume the *same HDA*, either directly or through an input collection. Tests cover both forms of reuse. Thus ordinary imported input provenance remains available while newly copied hidden outputs stop at their producing collection job.

This boundary does not add missing individual job associations. A hidden collection output with no individually registered job connection can remain isolated when clicked, matching the existing limitation.

## Query changes

- A small metadata read resolves clicked IDs and per-type copy presence. One subsequent statement computes relationships and maps to hids; intermediate related IDs stay in SQL. Exactly two queries serve shallow and 20-hop chains of either item type.
- Dataset and collection mapping use association IDs and explicit ancestry, not shared `dataset_id`.
- Direct matches are returned without mapping ancestry. Absent types and types without copies omit recursion entirely. Ordinary histories avoid planning unused copy work.
- Copy ancestry uses primary-key joins, with the creating-job guard on the current ancestor before its next hop. The metadata read provides a one-row clicked seed. A scalar-lookup prototype prevented some broad scans but inflated recursive cost estimates and JIT; the final conditional join design measured substantially better.
- Hidden output classification computes possible dataset copy ancestors, batches their upward collection memberships, and excludes exact reused inputs.
- Distinct candidate and membership work sets reduce exaggerated downstream join estimates. The populated probe initially spent about a second on ownership checks; scalar and unused-recursion prototypes also incurred expensive PostgreSQL JIT. The final conditional query and current-item guard avoid those measured costs without changing database settings.
- Ordinary job joins use `UNION ALL`. Copy and membership recursion retain `UNION` to terminate malformed cycles. Mapping stops at a related association.
- Costs apply on refresh and pagination, not just clicking. Work still scales with candidate copies, ancestry depth, and containing collections.

## Validation

Final validation: **23 manager tests**, **8 SQLite API tests**, **8 PostgreSQL 18 API tests**, and **17 standalone PostgreSQL boundary cases** pass. Ruff, Black, and diff whitespace checks pass. Mypy retains seven pre-existing module annotation errors; the base module has nine. No new type error remains.

| Synthetic fixture | Metadata execution | Relationship execution | Relationship planning |
| --- | ---: | ---: | ---: |
| 10,000 histories importing the same two datasets | 0.029 ms | 1.004 ms | 1.644 ms |
| Ordinary history with 2,002 collections | 0.356 ms | 0.101 ms | 0.315 ms |
| History with 2,002 copied collections | 0.100 ms | 3.153 ms | 0.459 ms |
| Imported history with 250 populated collections and 750 hidden copies | 0.044 ms | 12.755 ms | 1.803 ms |

None of the final plans used JIT. The ordinary history's relationship query contains no recursive CTE. Parent lookup plans may choose indexed or hash joins; these measurements do not guarantee a production planner choice.

Plan timing details are in the compact summary; database execution time excludes Python/client overhead. These fixtures use committed `ANALYZE` statistics before a separate connection runs `EXPLAIN`. A development probe initially omitted that commit; those stale-statistics measurements are superseded. The exact reproduction scripts are [query_plan_probe.py](query_plan_probe.py) and [populated_collection_probe.py](populated_collection_probe.py); run them from the Galaxy worktree with `PYTHONPATH=lib` and `GALAXY_REVIEW_DBURI` pointing at an isolated PostgreSQL database. They create synthetic fixtures. [query_plan_summary.json](query_plan_summary.json) stores compact plan evidence.

The pre-fix manager failed the pass-through, cached-output, and query-count assertions in six parameterized unit cases. A 20-hop chain required 45 statements; the final implementation uses exactly two, also asserted for depth zero. Real `pick_value` and confirmed-cache-hit API cases failed at relationship assertions under the pre-fix manager. The hidden-element API assertion exposed the missing collection boundary during development; the final guard fixes it without weakening the expected result.

## Polish and remaining limits

Fresh checklist inspections cover the final batched implementation. Every agent-answerable item passes; the human-read item remains unchecked. The single strengthening round clarified that jobs run on ordinary imported copies remain related, that collection membership does not manufacture missing individual job connections, and why reused inputs are excluded from collection ownership.

The local PR description was rewritten around the final behavior and evidence. No GitHub discussion messages or live description edits were posted. A clean rebase onto actual dev `8ef56943b78` preceded the fixes. New implementation changes supersede the prior approval and require a fresh human read.

Library-dataset hops, implicit mapped-output graph gaps, and hid-order arrows remain outside this revision. The browser regression is unchanged; new-head browser CI remains pending. Synthetic PostgreSQL timings are not a production performance guarantee.


## Handoff

Committed `f9b57ed5793cd3e3b929bfcb37daef9e2b880bcb` after all Galaxy pre-commit hooks passed, then force-pushed only to `jmchilton` using an exact lease on `43b0f3e2c44435952625c0710d4ad5e2e498e92f`. GitHub confirms the new head and mergeability. It currently reports the PR as draft, with new-head CI queued/in progress; this session did not change draft state. The queue therefore tracks it under `ci_wait`. No new-head browser success is claimed. Human read and the revised local description remain for John.
