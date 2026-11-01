### P2 1: Handler tag-limit checks are untested (implementation verified)

`JobHandlerQueue.__check_user_jobs` and `__check_destination_jobs` in `lib/galaxy/jobs/handler.py` now count tag limits through `get_destination_ids_for_tag()`. With `track_jobs_in_database` this is the main enforcement path, but no test covers tag limits there, dynamic or otherwise. The new tests only exercise `queue_with_limit()`, and nothing shows a `set_dynamic_destination_tags()` registration reaching a handler limit check.

`test/unit/app/jobs/test_handler.py` already has a real-database harness that tests ID and user limits. Add tag-limit cases there. Each case runs a job in a destination known only through the dynamic registry and asserts that a new job waits while the total or user tag limit is reached, then dispatches once the limit is lifted.

<details><summary>Details</summary>

The review branch adds `test_tag_limits_count_dynamic_destinations`, parametrized over total and user tag limits and over sqlite and PostgreSQL. The harness's `SimpleNamespace` job config now holds a real `DestinationTagRegistry`. The test registers the running job's destination with `set_dynamic_destination_tags()`, as TPV#212 does. A sanity run with the registration call removed fails both sqlite cases. The PostgreSQL variants were skipped locally because `GALAXY_TEST_DBURI` is unset.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: A destination's own jobs don't count toward its tag limits unless the destination is registered (implementation verified)

All four tag checks count only the IDs that `get_destination_ids_for_tag(tag)` returns. These are the total and per-user tag loops in `queue_with_limit()` and in both handler checks. The tags being checked come from the job's own destination, so that destination is known to carry them, yet its jobs are left out of the count unless something registered it. TPV#212 skips destinations with templated names or tags, and dynamic rules other than TPV register nothing. For those destinations, the total tag limit and the new per-user tag limit in `queue_with_limit()` count zero jobs and never hold anything back.

<details><summary>Evidence</summary>

New tests `test_destination_tag_limit_counts_unregistered_destination` (`test_queue_limit.py`, total and user limits) and the `unregistered_own` cases of `test_tag_limits_count_dynamic_destinations` (`test_handler.py`) failed before the fix, with the limit logic unchanged from the reviewed commit: a second job was queued past a limit of 1. They pass with the fix.

</details>

Fix: add the checked destination's ID to the set at each site. This doesn't make unregistered sibling destinations count, but it is strictly more correct and needs no cooperation from the rule. The doc and sample-config sentence ("count toward a tag limit only if the rules register their tags") should be narrowed to match.

<details><summary>Details</summary>

`queue_with_limit()` computes `own_destination_ids = {job_destination.id} if job_destination.id else set()` once and unions it into both tag loops. The handler sites become `tag_ids = get_destination_ids_for_tag(tag) | {id}` followed by a `sum(...)`. This also stops the old `for id in ...` loop from rebinding the destination `id` variable. A broader option: `JobRunnerMapper.__determine_job_destination` sees every destination a dynamic rule returns, so core could register `job_destination.id` under its tags there. Every dynamic rule would then benefit, including TPV's templated destinations once mapped in that process, and the explicit API would stay for registering up front.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Tag registry is embedded in `JobConfiguration`, so tests exercise a re-implemented fake (implementation verified)

The source → tag → IDs map and its lock form a standalone abstraction inside `JobConfiguration`. `MockJobConfig.get_destination_ids_for_tag` in `test_queue_limit.py` re-implements it as a dict lookup, so the "dynamic" part of the queue-limit tests exists only in the fake. Testing the per-source replacement semantics also means parsing the full advanced sample config twice (XML and YAML).

Extract a small `DestinationTagRegistry` class that `JobConfiguration` delegates to, and test it directly. `MockJobConfig` and the handler harness can then hold a real instance. `set_dynamic_destination_tags()` and `get_destination_ids_for_tag()` keep their names and signatures on `JobConfiguration`, since TPV#212 calls the former.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: Five copies of the active-job count subquery in `queue_with_limit()` (implementation verified)

`queue_with_limit()` now has five near-identical `select(func.count(Job.id)).where(and_(Job.state.in_([QUEUED, RUNNING, RESUBMITTED]), ...))` blocks. The new per-user tag block is the fifth. All five use the same state list. A local `active_job_count(*where)` helper leaves one place to change the state list and cuts the method by about 100 lines. The duplication predates the PR, but the PR adds to it.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: Overlapping dynamic-registry tests (implementation verified)

`test_dynamic_destination_tags_replaced_per_source` covers most of `test_dynamic_destination_tags`. Both parse the advanced sample config, and both run twice (XML and YAML subclasses), only to test an in-memory map. Keep one test that parses the config and checks how config tags merge with dynamic tags. Move the per-source replacement assertions into a direct registry test (see P3 2). No assertions need to be dropped.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 5: Use a real `JobDestination` in `test_queue_limit.py` (implementation verified)

`create_mock_destination()` is a `Mock()` with attributes set by hand, and the new tests reuse it. `JobDestination(id="one", runner="test_runner", tags=["one", "two"])` behaves the same, is type-correct, and costs nothing. The helper predates the PR, but the PR's three new queue-limit tests are built on it.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
