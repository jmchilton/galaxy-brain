# Draft PR opened — 2026-10-14

- User explicitly requested a draft PR for nightly_unit_tests.
- Opened [galaxyproject/galaxy#24131](https://github.com/galaxyproject/galaxy/pull/24131) against dev, title **Move older-Python and legacy tool API CI to tracked nightly runs**, using the stored description verbatim (verified against API response, ignoring only a terminal newline).
- Head `321f8b4c0f288a17c3861602e92e635ea76d8844`; actual base dev advanced five commits to `b62d06dcdce`. Standing-authorized pre-opening rebase completed without conflicts; the net branch diff stayed byte-for-byte identical. Force-with-lease push went only to the jmchilton fork.
- GitHub confirms draft=true, dev base, intended head, MERGEABLE. Expected unit3.14, two Tool Shed3.14 client jobs and framework3.10/never jobs are queued. No zero-job startup failure observed; full runtime results pending.
- Local reporter harness passes seven cases and the source diff is whitespace-clean. No source changes beyond the conflict-free rebase.
- The PR description links the cross-release alternative rejected by John for verbosity. That branch was not changed. No @-mentions, reviewer requests or GitHub comments were added.
- Tracking status: ci_wait. Keep draft until John requests promotion; opening the draft does not authorize taking it out of draft.
