Reworking the design for cleaner tests mostly and a small fix. Looks good though - thanks! -John

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile gx_risk_assessment, claude-opus-5-5 at low effort, reviewed commit 2959dfdd4dce4a85e69c6a5b6a2b0c181981eb28.

The one lasting commitment is `JobConfiguration.set_dynamic_destination_tags(source, tags)`: a new public hook that TPV and other dynamic rules will call, so its name, signature, and replace-per-source semantics become hard to change once a TPV release depends on it. The rest is cheap to roll back.

<details><summary>Risk Details</summary>

- New public extension point (`set_dynamic_destination_tags` / `get_destination_ids_for_tag`) is effectively an API contract with TPV; changing it later means coordinating releases across both projects.
- Admin-visible behavior change: `destination_user_concurrent_jobs` tag limits are now also enforced atomically in `queue_with_limit`, not only in the handler's in-memory pass. Deployments with these limits configured may see jobs held that were previously let through under races.
- Tag limits now count jobs in runtime-created destination IDs once registered, so existing tag limits can start throttling more jobs on sites that adopt a TPV version calling the hook.
- Registrations are in-memory per process and are replaced wholesale with `{None: ...}` whenever the job config is parsed; each handler process has to register its own, and the caller has to register again after any re-parse.
- Accounting goes by `destination_id`: if a dynamic rule reuses or renames IDs, jobs can be over- or under-counted. Stale registrations stay until the source clears them.
- Docs and sample config describe the behavior only in terms of TPV.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should focus on the shape of `set_dynamic_destination_tags`: is a source-keyed, full-replace mapping of tag to destination IDs the interface TPV maintainers want long term, and is a matching TPV change ready so the hook isn't speculative? Agree on it with TPV before merge, since it's the part that's hard to walk back.

Also confirm that enforcing user tag limits in `queue_with_limit` is the intended change for existing deployments (worth a release note), and check what happens across job config re-parse and multiple handler processes, where dynamic registrations aren't shared.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24271_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24271_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24271_review_0), built on the reviewed commit `2959dfdd4dc`, with one commit per verified finding. It pulls the per-source tag map out of `JobConfiguration` into a `DestinationTagRegistry` class that the tests use directly. The two overlapping parsed-config tests become one, with the per-source replacement assertions moved into a direct registry test. It adds handler tag-limit tests on the real-database harness, and makes every tag check count the checked destination's own jobs even when that destination was never registered. It also replaces the five copies of the active-job count subquery in `queue_with_limit()` with one helper. The public `set_dynamic_destination_tags()` and `get_destination_ids_for_tag()` keep their signatures. One semantic difference: the PR's parsing replaced the whole map with `{None: ...}`, while the branch calls `register(None, ...)`, which keeps other sources' registrations. The two are equivalent today only because the job config is parsed once, at init. Tests run locally: `test_queue_limit.py` and `test_job_configuration.py` in full (56 passed), and `test_handler.py -k tag_limits` (4 passed on sqlite; the 4 PostgreSQL variants were skipped because `GALAXY_TEST_DBURI` is unset). The own-destination tests failed before the fix. mypy and black are clean on the touched modules.

- [`5cfe5b72ae5`](https://github.com/jmchilton/galaxy/commit/5cfe5b72ae5) Use real JobDestination in queue limit tests: `create_mock_destination()` returns a `JobDestination` instead of a `Mock` (P3 5).
- [`0961ba45769`](https://github.com/jmchilton/galaxy/commit/0961ba45769) Extract DestinationTagRegistry from JobConfiguration: `register()`/`ids_for_tag()` hold the lock and copy-on-write map; `JobConfiguration` delegates to it, `MockJobConfig` holds a real instance, and a direct registry test covers per-source replacement (P3 2).
- [`5feb65ae527`](https://github.com/jmchilton/galaxy/commit/5feb65ae527) Fold overlapping dynamic destination tag tests: drops the parsed-config replaced-per-source test, whose assertions now live in the registry test, and adds source removal to the remaining parsed-config test (P3 4).
- [`9aa7a4a842d`](https://github.com/jmchilton/galaxy/commit/9aa7a4a842d) Test handler tag limits against registered dynamic destinations: the handler harness gets a real registry, and a new test covers total and user tag limits for a destination registered via `set_dynamic_destination_tags()` (P2 1).
- [`cb3ec53d621`](https://github.com/jmchilton/galaxy/commit/cb3ec53d621) Count the checked destination's own jobs toward its tag limits: unions the destination's own ID into all four tag checks, adds red-to-green tests in `test_queue_limit.py` and `test_handler.py`, and narrows the doc and sample-config wording (P3 1).
- [`92f58c518c5`](https://github.com/jmchilton/galaxy/commit/92f58c518c5) Share active job count subquery in queue_with_limit: a local `active_job_count(*where)` helper replaces five copies, and the unused `and_` import is dropped (P3 3).

</details>

</details>

### P2 1: Handler tag-limit checks are untested (implementation verified)

`JobHandlerQueue.__check_user_jobs` and `__check_destination_jobs` in `lib/galaxy/jobs/handler.py` now count tag limits through `get_destination_ids_for_tag()`. With `track_jobs_in_database` this is the main enforcement path, but no test covers tag limits there, dynamic or otherwise. The new tests only exercise `queue_with_limit()`, and nothing shows a `set_dynamic_destination_tags()` registration reaching a handler limit check.

`test/unit/app/jobs/test_handler.py` already has a real-database harness that tests ID and user limits. Add tag-limit cases there. Each case runs a job in a destination known only through the dynamic registry and asserts that a new job waits while the total or user tag limit is reached, then dispatches once the limit is lifted.

<details><summary>Details</summary>

The review branch adds `test_tag_limits_count_dynamic_destinations`, parametrized over total and user tag limits and over sqlite and PostgreSQL. The harness's `SimpleNamespace` job config now holds a real `DestinationTagRegistry`. The test registers the running job's destination with `set_dynamic_destination_tags()`, as TPV#212 does. A sanity run with the registration call removed fails both sqlite cases. The PostgreSQL variants were skipped locally because `GALAXY_TEST_DBURI` is unset.

</details>

Fixed on the review branch in [`9aa7a4a842d`](https://github.com/jmchilton/galaxy/commit/9aa7a4a842d).

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

Fixed on the review branch in [`cb3ec53d621`](https://github.com/jmchilton/galaxy/commit/cb3ec53d621).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Tag registry is embedded in `JobConfiguration`, so tests exercise a re-implemented fake (implementation verified)

The source → tag → IDs map and its lock form a standalone abstraction inside `JobConfiguration`. `MockJobConfig.get_destination_ids_for_tag` in `test_queue_limit.py` re-implements it as a dict lookup, so the "dynamic" part of the queue-limit tests exists only in the fake. Testing the per-source replacement semantics also means parsing the full advanced sample config twice (XML and YAML).

Extract a small `DestinationTagRegistry` class that `JobConfiguration` delegates to, and test it directly. `MockJobConfig` and the handler harness can then hold a real instance. `set_dynamic_destination_tags()` and `get_destination_ids_for_tag()` keep their names and signatures on `JobConfiguration`, since TPV#212 calls the former.

Fixed on the review branch in [`0961ba45769`](https://github.com/jmchilton/galaxy/commit/0961ba45769).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: Five copies of the active-job count subquery in `queue_with_limit()` (implementation verified)

`queue_with_limit()` now has five near-identical `select(func.count(Job.id)).where(and_(Job.state.in_([QUEUED, RUNNING, RESUBMITTED]), ...))` blocks. The new per-user tag block is the fifth. All five use the same state list. A local `active_job_count(*where)` helper leaves one place to change the state list and cuts the method by about 100 lines. The duplication predates the PR, but the PR adds to it.

Fixed on the review branch in [`92f58c518c5`](https://github.com/jmchilton/galaxy/commit/92f58c518c5).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: Overlapping dynamic-registry tests (implementation verified)

`test_dynamic_destination_tags_replaced_per_source` covers most of `test_dynamic_destination_tags`. Both parse the advanced sample config, and both run twice (XML and YAML subclasses), only to test an in-memory map. Keep one test that parses the config and checks how config tags merge with dynamic tags. Move the per-source replacement assertions into a direct registry test (see P3 2). No assertions need to be dropped.

Fixed on the review branch in [`5feb65ae527`](https://github.com/jmchilton/galaxy/commit/5feb65ae527).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 5: Use a real `JobDestination` in `test_queue_limit.py` (implementation verified)

`create_mock_destination()` is a `Mock()` with attributes set by hand, and the new tests reuse it. `JobDestination(id="one", runner="test_runner", tags=["one", "two"])` behaves the same, is type-correct, and costs nothing. The helper predates the PR, but the PR's three new queue-limit tests are built on it.

Fixed on the review branch in [`5cfe5b72ae5`](https://github.com/jmchilton/galaxy/commit/5cfe5b72ae5).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
