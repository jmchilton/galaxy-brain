# mvdbeek performance review comments

`mvdbeek` mostly flags performance by asking what the code does at worst-case scale, not by spotting a slow line. He asks about unbounded reads (no SQL `LIMIT`, whole collections or all histories loaded), per-item round trips and extra flushes, and joins that fan out on popular values. He also asks for evidence (`EXPLAIN`, SQL variants, a before/after profile) and prefers eliminating work (do not fire the request, do not query when a cached count exists) over tuning it. Newer reviews (2026) include benchmarked numbers on large synthetic histories and databases.

Note: several 2026 comments (#22831 issue comment, #21932 issue comments, #23076, #23429, #24106) appear AI-assisted (the author says so on #21932 and the issue comment on #22831 is a "Code review" bot-style comment). Treat them as his review output, not necessarily hand-written heuristics.

These patterns feed the [Galaxy performance challenges](../../../_shared/GX_PROCESS_CHALLENGE_PERFORMANCE.md) run on John's branches and PR reviews.

## Patterns / checklist

- Unbounded query: is there a SQL `LIMIT`/offset, or does it load everything then slice in Python? Batching in Python does not help if the DB already returned the full result (#22831, #22361, #21932, #23076).
- Is "chunking" or batching actually reducing anything, or only adding round trips while everything is held in memory anyway? (#21932)
- Per-row round trips on a shared list endpoint: an "expensive" field (aggregate per history) added to a common API call makes every caller pay; make it opt-in (#23076).
- Flush/commit hygiene in ORM loops: use `stage_addition` + one `add_pending_items`, avoid redundant flush/commit, and profile before/after (#18970).
- Use cheap existing counts (`hdca.collection.element_count`) rather than iterating elements, which pulls them all into memory (#22361).
- Do not issue the request at all: if inputs are already known on initial build, skip the update call instead of debouncing (#18969).
- Joins that fan out from the "historical" side on popular values (empty files, common hashes) multiply rows before the filter; filter from the requested side first and check the plan (#23429).
- Recursive CTEs: filter placed outside the CTE is not pushed in; seed only with relevant rows, use `UNION ALL`, check missing composite indexes (`(history_id, dataset_id)`) and whether the work runs on every ordinary fetch (#24106).
- Ask "did you look at the generated SQL and the plan?" and request SQL variants to run against a production-size DB (#23429, #24106).
- Sync DB code inside async handlers blocks the event loop (#22361).
- Subprocess / import-time overhead for many small items; prefer keeping the work in an existing process or lazy imports over local imports (#11558, #23247).
- Prefer out-of-band precomputation (celery beat) over computing expensive graph/aggregate data per request (#21932).

## #18970 Optimize to_history_dataset_association in create_datasets_from_library_folder
- PR: https://github.com/galaxyproject/galaxy/pull/18970 | author `arash77` | merged 2024-10-11
- Comments: https://github.com/galaxyproject/galaxy/pull/18970#discussion_r1795079125 , https://github.com/galaxyproject/galaxy/pull/18970#discussion_r1795188659
- Context: PR optimizing library-folder-to-history dataset copy.
- Flagged: "add_dataset also causes a flush, the modern way of handling this is `history.stage_addition` and then at the end `history.add_pending_items`. With optimizations like this it's usually a good idea to profile the changes so you can see a before/after" (links the "finding and improving slow code" docs). Follow-up: "you know your committing in there, so no need to [flush] again"; asked where `flush=True` ever makes sense.
- Outcome: changed. Final diff uses `target_history.stage_addition(hda)` and `add_pending_items()`.

## #22831 [26.1] Optimize the purge_historyless_hdas case
- PR: https://github.com/galaxyproject/galaxy/pull/22831 | author `bgruening` | merged 2026-06-09
- Comments: https://github.com/galaxyproject/galaxy/pull/22831#discussion_r3367069897 , https://github.com/galaxyproject/galaxy/pull/22831#issuecomment-4638153103 , https://github.com/galaxyproject/galaxy/pull/22831#issuecomment-4638226122
- Context: `pgcleanup` purge of historyless HDAs was getting OOM-killed.
- Flagged: "this is probably still loading unbounded elements from the database, there should probably be a limit clause somewhere in the sql." The follow-up comment notes the SQL `UPDATE` CTE has no `LIMIT`, so the whole result set is held before Python-side batching of 1000 helps.
- Outcome: changed. Final diff adds a `batch_size` option and a `WITH batch_ids AS (... LIMIT :batch_size)` update. He later wrote "Looks good, thank you!"

## #21932 Add the History Graph API
- PR: https://github.com/galaxyproject/galaxy/pull/21932 | author `guerler` | merged 2026-05-02
- Comments: https://github.com/galaxyproject/galaxy/pull/21932#discussion_r3085622644 , https://github.com/galaxyproject/galaxy/pull/21932#issuecomment-4199303814 , https://github.com/galaxyproject/galaxy/pull/21932#issuecomment-4235050668 , review https://github.com/galaxyproject/galaxy/pull/21932#pullrequestreview-4112543084
- Context: new `history_graph.py` manager building edges over tool requests/jobs.
- Flagged: "What is your idea with the chunk strategy? You're holding all objects in memory anyway (candidates) so what are we optimizing here? This is only causing more requests to the database for no gain." Also shared an agent review prompt asking about unbounded data and queries-per-request, and asked "Have you considered an out-of-band data structure that is incrementally updated via a celery beat?"
- Outcome: changed. A "Drop chunking mechanism" commit landed; his review says "Thanks for working through the unbounded queries, this does look better." The celery-beat idea is a suggestion; not verified if adopted.

## #22361 Galaxy Notebooks: Persistent Narrative for Human-AI Collaborative Science in Galaxy
- PR: https://github.com/galaxyproject/galaxy/pull/22361 | author `jmchilton` | merged 2026-05-20
- Comments: https://github.com/galaxyproject/galaxy/pull/22361#discussion_r3268662015 , https://github.com/galaxyproject/galaxy/pull/22361#discussion_r3268670909 , https://github.com/galaxyproject/galaxy/pull/22361#discussion_r3268688740 , https://github.com/galaxyproject/galaxy/pull/22361#discussion_r3268800178
- Context: new notebook API/manager code and FastAPI handlers.
- Flagged: "You'll probably want to limit and offset in SQL, this could still blow up memory as an unbounded query"; `hdca.collection.element_count` "should be a lot cheaper"; "that's probably still pulling in all elements into memory"; DB queries inside `async` handlers "would block the event loop. This is a must before merging" (aiocop should have flagged it).
- Outcome: not verified per comment. Merged after his review.

## #23076 Add bulk copy action for datasets
- PR: https://github.com/galaxyproject/galaxy/pull/23076 | author `itisAliRH` | merged 2026-07-18
- Comments: https://github.com/galaxyproject/galaxy/pull/23076#pullrequestreview-4694709304 , inline blocker https://github.com/galaxyproject/galaxy/pull/23076#discussion_r3579348285 (thread of the same review; the blocker is on `history.services.ts:87`)
- Context: history picker requested `contents_active` via the shared `getHistoryList`.
- Flagged: "Blocker: this makes every history-list call in the app do per-history aggregate queries." `contents_active` is a per-history `UNION ALL` aggregate (one round trip per history), runs on every login, and `loadHistories(false)` is unbounded. Suggested threading an `extraKeys` param so only the picker pays, as the file's existing `extendedHistoryParams` already does, and capping the unbounded load.
- Outcome: changed. Final diff no longer contains `contents_active`.

## #23429 [26.2] Enable hash-based job matching for datasets without extra files
- PR: https://github.com/galaxyproject/galaxy/pull/23429 | author `nsoranzo` | closed (not merged) 2026-10-16
- Comments: https://github.com/galaxyproject/galaxy/pull/23429#discussion_r3913425341 , https://github.com/galaxyproject/galaxy/pull/23429#discussion_r3916589784 , https://github.com/galaxyproject/galaxy/pull/23429#discussion_r4291579618 , https://github.com/galaxyproject/galaxy/pull/23429#discussion_r4291579622 , https://github.com/galaxyproject/galaxy/pull/23429#issuecomment-5512475614 , review https://github.com/galaxyproject/galaxy/pull/23429#pullrequestreview-5543875463
- Context: job-cache matching query joined hashes of historical vs requested datasets.
- Flagged: "That looks expensive? Have you looked at the generated SQL and plan?"; "now the outerjoin might become expensive... I would need a few different versions of this to check the real impact." Later: joining from the historical side multiplies rows for popular hashes before the HDA filter ("26-29 s vs 72-150 ms for a requested-side uncorrelated subquery in my benchmark"); multiple hash rows per dataset add fan-out; "Can we avoid the subquery? I think we should add the index as a last resort."
- Outcome: PR closed; not merged. Not verified whether a replacement landed.

## #24106 Make the related filter work on imported and copied history items
- PR: https://github.com/galaxyproject/galaxy/pull/24106 | author `jmchilton` | merged 2026-10-17
- Comments: https://github.com/galaxyproject/galaxy/pull/24106#discussion_r4267772619 , https://github.com/galaxyproject/galaxy/pull/24106#discussion_r4267772627 , https://github.com/galaxyproject/galaxy/pull/24106#discussion_r4281885110 , reviews https://github.com/galaxyproject/galaxy/pull/24106#pullrequestreview-5514243136 and https://github.com/galaxyproject/galaxy/pull/24106#pullrequestreview-5531739659
- Context: walking `copied_from_*` chains via recursive CTE on every contents fetch with the related filter.
- Flagged: no `(history_id, dataset_id)` index and nested-loop risk; the `ancestor_id IN (...)` filter sits outside the recursive CTE; every ordinary history pays; suggested seeding the recursion only with copied rows, `UNION ALL` instead of `UNION`, and per-hop indexed `EXISTS`. Reported "about 325 ms of 480 ms" for the CTE on a 30k-dataset copied history.
- Outcome: changed. Second review: single-statement rewrite, query count constant (3 at copy depths 0-20). He added "I am just very sensitive to tweaking stuff that looks like it could bring down the server."

## #18969 Reduce tool form building frequency
- PR: https://github.com/galaxyproject/galaxy/pull/18969 | author `davelopez` | open
- Comments: https://github.com/galaxyproject/galaxy/pull/18969#discussion_r1795040749 , https://github.com/galaxyproject/galaxy/pull/18969#discussion_r1795174317 , https://github.com/galaxyproject/galaxy/pull/18969#issuecomment-2479096556 , review https://github.com/galaxyproject/galaxy/pull/18969#pullrequestreview-2438384903
- Context: client tool-form rebuild/refetch storm; PR added debounce.
- Flagged: "This is a workaround though, not a fix. If we come in with a defined set of inputs, there's no reason to fire off any requests." Also: "500ms delay is a lot of delay and a high price to pay"; "I don't think request volume / debounce tradeoff is worth it."
- Outcome: PR still open; author reverted to the original approach in discussion. Not verified beyond that.

## #23247 Perf/metadata registration
- PR: https://github.com/galaxyproject/galaxy/pull/23247 | author `joachimwolff` | open
- Comments: https://github.com/galaxyproject/galaxy/pull/23247#issuecomment-5168130962 , https://github.com/galaxyproject/galaxy/pull/23247#issuecomment-5168170033
- Context: speeding up set-metadata startup by moving imports local.
- Flagged: "Local imports are problematic optimizations that lead to more complex code and hard to debug issues"; asked to compare against Python 3.15 lazy imports, and noted celery set_meta exists for this reason.
- Outcome: open; no outcome verified.

## #11558 [WIP] Move pysam index to external process
- PR: https://github.com/galaxyproject/galaxy/pull/11558 | author `nuwang` | open
- Comment: https://github.com/galaxyproject/galaxy/pull/11558#issuecomment-792008997
- Context: indexing moved into a subprocess.
- Flagged: "Can you make this optional? For traditional Galaxy job runners this runs as a external process already... When creating many small files creating a subprocess for this is going to be significant overhead."
- Outcome: open WIP; no outcome verified.
