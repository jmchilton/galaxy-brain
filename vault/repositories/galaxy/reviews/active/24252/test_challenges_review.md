# Test challenges review — PR #24252

- Profile: gx_test_challenger
- Model: Claude Opus 5.5
- Effort: low
- Reviewed commit: 9246280e6eb

Tests are proportionate, use real engines and existing fixtures, and are verified red-to-green (sqlite test fails at merge-base implementation, passes with fix). No P1/P2.

### P3 1: No negative-case test

Probe treats any exception as "unsupported", so it can silently be wrong in either direction. A `skip_if_not_mysql_uri` test asserting `supports_returning(engine) is False` (MySQL lacks RETURNING) would pin the other branch. Optional for a release-branch fix.

Details: [test_challenges_debrief.md](test_challenges_debrief.md).
