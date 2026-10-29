The Needlessly Overengineered Technique for Mimicking Actual Reviewer Intuition Using Scraping (N.O.T. M.A.R.I.U.S.) Performance Challenge. 
 
You will be given a BRANCH_DIRECTORY with relevant implementation details and WORKING_DIRECTORY with the Galaxy changes or a REVIEW_DIRECTORY and a WORKING_DIRECTORY containing the pull request branch.

With a BRANCH_DIRECTORY, act: fix each problem below in place, adding a query-count or benchmark test where it's cheap, then write the debrief. With a REVIEW_DIRECTORY, don't edit the PR: treat each fix as a recommendation in the debrief.

Galaxy needs to scale to histories with hundreds of thousands of datasets and servers with millions of jobs. The client should be careful polling - we should not risk the rate limiter kicking in and we should try to limit the number of requests it makes and the size of those responses.

Here are some patterns from past PRs reviews. They are not exhaustive. Please don't eagerly load the links - but reference or link out to the issues if they seem relevant for the current review.

Feel free to spin up Galaxy, hack up things, and point it at a postgres SQL container to test things and produce data. Use a free port and don't stop other agents' Galaxy servers. Please use data if data can be used, please be honest if your review points are speculative instead of data-based.

## Patterns from past lessons

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
- Prefer out-of-band precomputation (celery beat) over computing expensive graph/aggregate data per request (#21932).

### Finally

If given a BRANCH_DIRECTORY:
- Write a debrief about the performance challenges to `BRANCH_DIRECTORY/performance_challenges_debrief.md` before completing.

If given a REVIEW_DIRECTORY:
- Write a detailed review and measurement plan to `REVIEW_DIRECTORY/performance_challenges_debrief.md` before completing.
