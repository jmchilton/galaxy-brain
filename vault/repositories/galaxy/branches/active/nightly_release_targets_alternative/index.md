# nightly_release_targets_alternative

Status: `branches_need_decision`. Base: `dev`. Reference-only alternative; do not open a PR or promote automatically.

**John rejected this implementation on 2026-10-14 for being too verbose and unreadable.** Keep it available for Marius to assess whether cross-release nightly coverage justifies the added machinery. No endorsement or feedback from Marius is recorded; no message or comment was posted to him.

[Implementation branch](https://github.com/jmchilton/galaxy/tree/nightly_release_targets_alternative) · [Extension-only diff](https://github.com/jmchilton/galaxy/compare/b2a792c206ded6040be900adef9b4b52f3819719...nightly_release_targets_alternative) · [Main proposal](../../merged/nightly_unit_tests/index.md)

[Alternative PR description snapshot](pr_description.md) · [Title snapshot](pr_titles.md) · [Implementation/review evidence](release_nightlies_debrief.md) · [Checklist](release_nightlies_checklist.md) · [Description review](release_nightlies_strengthening.md)

## Preserved implementation

Fork head: `a13b016c0ff9575606639bfb8273f2572f68ed56`. Extension parent: `b2a792c206ded6040be900adef9b4b52f3819719`. The branch preserves the entire proposal plus the extension in one commit. Its description/title snapshots preserve John's latest local edits; the title is descriptive context, not approval to open a PR.

The extension dispatches from dev to test dev and releases26.0/26.1/26.2, with one configurable Python version per target (initially3.10), pinned tested SHAs, suite/branch-specific issues and release-specific test setup. It does not reduce the release branches' existing PR matrices; that needs separate policy backports.

## Disposition

The active `nightly_unit_tests` proposal reverted the extension in `2ac1e9cc820`. Its resulting tree exactly matches `b2a792c206d`. The active PR description points here as an alternative rejected by John for verbosity. Retain this branch pending Marius's feedback; it is not abandoned and should not be deleted.

Local selector/reporter tests, schema, actionlint and configured security lint passed when implemented. Full release runtime/upstream reporting remains unverified. Passing checks do not change John's rejection.
