# Filtered findings — PR #24511 round 0

- test_challenges P3 3 (history purge ordering test coupled to celery internals): not actionable. Patching `purge_hda.delay` is how the test models purge tasks that haven't run yet, which is the race under test. The suggested extraction would add a helper only for the test.
- performance P3 1 (job finish holds the `galaxy_user` row lock across tool post-processing): not actionable on a release branch. The reviewer notes that moving the charge breaks the `total_size is None` invariant `fail()` relies on. The lock window is unmeasured and usually milliseconds.
- performance P3 3 (building a collection from another user's datasets charges per element): low value. The element builder already issues several queries per element (`get_accessible`, `get_owned`, tags). Two more, only for cross-user elements, don't change its scaling. Unmeasured.
- thermo note (`User._pending_disk_usage_delta` / `ClauseElement` sniffing): not a finding. Kept as step 5 of the follow-up issue.
