# Initial review: galaxyproject/galaxy#24271

- Profile: default (with shared.md, REVIEW_FOCUS.md)
- Model: claude-opus-5-5, medium effort
- Reviewed commit: `2959dfdd4dce4a85e69c6a5b6a2b0c181981eb28` (merge-base `5ff1e46b8c3`)
- Companion: galaxyproject/total-perspective-vortex#212 (open), which registers literal-named, literal-tagged TPV destinations on load and reload, keyed by the referring dynamic destination ID

## Summary

Small, focused change. `JobConfiguration` gets a per-source, copy-on-write registry of destination IDs by tag. Parsing the job config seeds it under source `None`, and `set_dynamic_destination_tags()` lets dynamic rules add to it. Both handler limit checks (`__check_user_jobs`, `__check_destination_jobs`) and `queue_with_limit()` now look tags up in the registry instead of in `get_destinations(tag)`. `queue_with_limit()` also gains the per-user tag-limit subquery it was missing, mirroring the per-user destination-ID subquery already there. That is a real fix in its own right: the handler's in-memory check was the only enforcement of per-user tag limits before.

The implementation is correct as far as I can tell. The lock and replace-don't-mutate pattern is sound: readers take one attribute snapshot and never need the lock. Empty `IN` sets render fine in SQLAlchemy 2. The job config is never reparsed at runtime (`_configure_from_dict` only runs from `__init__`), so overwriting the registry with `{None: ...}` cannot drop dynamic registrations. The new tests target the new behavior, and no existing assertions were weakened.

I couldn't run the tests: the worktree has no `.venv`.

## Findings

### P3 1: A job's own destination isn't counted toward its tag limits unless registered

In all three checks (`queue_with_limit`'s two tag loops and both handler tag loops), the count only covers `get_destination_ids_for_tag(tag)`. The tags come from `job_destination.tags`, so we already know the job's own destination carries the tag. Yet if that destination wasn't registered, its jobs are left out of the count. TPV#212 explicitly skips destinations with templated names or templated tags, and dynamic rules other than TPV register nothing. For these destinations, the new per-user tag limit in `queue_with_limit` and the existing total tag limit count zero jobs from the destination being queued to, so the limit silently does nothing.

Fix: add `job_destination.id` to the ID set at each lookup site, e.g. `destination_ids = self.app.job_config.get_destination_ids_for_tag(tag) | {job_destination.id}`. The handler sites would do the same with `job_wrapper.job_destination.id`. A helper taking `(tag, destination)` would keep the five sites from drifting apart. This doesn't make sibling unregistered destinations count, but it is strictly more correct and needs no cooperation from the rule. A broader option: the mapper (`JobRunnerMapper.__determine_job_destination`) already sees every destination a dynamic rule returns, so core could register `job_destination.id` under its tags there. Any dynamic rule would then benefit, including TPV's templated destinations once they have been mapped in that process. The explicit API would remain for registering up front. If adopted, the doc sentence "count toward a tag limit only if the rules register their tags" should be softened to match.

### P3 2: Five copies of the "count active jobs where" subquery

`queue_with_limit()` now has five near-identical `select(func.count(Job.id)).where(and_(Job.state.in_([QUEUED, RUNNING, RESUBMITTED]), ...))` blocks. The new per-user tag block is a fifth copy. A small local helper, e.g. `_active_job_count(*extra_conditions)`, would shrink the method a lot and leave one place to change the state list. This is in line with the review focus on leaving an abstraction behind rather than adding another copy. The duplication is pre-existing, so this is optional, but the PR adds to it.

## Non-findings / notes

- `_destination_tags: dict[str | None, ...]` uses `None` as the config-source key. This is documented in the docstring and type-safe, since `set_dynamic_destination_tags(source: str, ...)` can't overwrite it. Fine as is.
- `MockJobConfig` in `test_queue_limit.py` reimplements `get_destination_ids_for_tag` as a dict lookup. That is acceptable for a DB-level unit test of `queue_with_limit`, because the registry itself is tested against the real `JobConfiguration` in `test_job_configuration.py`.
- The handler-side tag checks have no new test coverage for dynamic IDs. The change there is a mechanical swap of the lookup, so I don't think it needs one.
- The handler check excludes `RESUBMITTED` while `queue_with_limit` includes it. This inconsistency predates the PR and is out of scope.
