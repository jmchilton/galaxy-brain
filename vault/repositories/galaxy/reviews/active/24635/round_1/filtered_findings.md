# Filtered findings, round 1

- Round-0 P2 2, job-time guard tested through heavy `BaseJobRunner` mocks: mostly resolved at `9ee89b52d9`. The author deleted the mocked unit file and moved its cases onto the existing `JobWrapper` test harness. The declared-vs-resolved case no longer applies, because `prepare` never resolves containers. What's left, end-to-end coverage of the allowed and admin-tool paths, is carried as round-1 P3 2.
- Round-0 P3 1, rejection placed and handled differently from the #24607 role recheck: resolved at `9ee89b52d9`. The check now runs in `JobWrapper.prepare` and raises `InsufficientPermissionsException`, which Pulsar fails without resubmission.
- Round-0 follow-up refactor issue section 2 (one enforcement point for user-tool rejections): resolved by the same commit. It was dropped from the revised [followup_refactor_issue.md](followup_refactor_issue.md).
