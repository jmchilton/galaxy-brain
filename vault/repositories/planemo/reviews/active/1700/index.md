# Planemo #1700

## Rebase — 2026-10-11

Rebased onto upstream master `48725d692ee3371ace6a042b70ec3dc84a3b0ba6`
and pushed [head `d4772119`](https://github.com/jmchilton/planemo/commit/d4772119f763a136119287e96139f3565303c231)
to [anonymous-external-galaxy-api](https://github.com/jmchilton/planemo/tree/anonymous-external-galaxy-api).
The push used an explicit force-with-lease against the previously verified
remote head `03873c5c`. Conflicts in activity.py and its tests came from the
merged no-wait fix; resolution retains submission response initialization,
uses the available credential for waited job details, and preserves both the
no-wait and credential regression tests. Range-diff confirms the other three
feature commits are unchanged.

Validation: all 25 focused activity, engine, API, profile, and configuration
tests passed. Black, isort, Flake8, and diff whitespace checks passed. The
authoring worktree is clean. Earlier commit references below describe the
pre-rebase history; the current credential-fix commit is `d4772119`.

## Execution credential follow-up — 2026-10-11

John requested Marius's second review point be addressed and pushed. Commit
[`03873c5c`](https://github.com/jmchilton/planemo/commit/03873c5c4020b8d28386c8d68b9acd906e1697d6)
is pushed to [anonymous-external-galaxy-api](https://github.com/jmchilton/planemo/tree/anonymous-external-galaxy-api),
updating upstream #1700. The earlier optional diagnostics item in the October
ledger is now implemented.

Tool execution uses the supplied user key to fetch its job details when no
admin key is supplied; explicitly supplied admin keys still take precedence for
that lookup. Embedded tests use a Planemo interactor subclass that reports an
actionable `--galaxy_admin_key` error before requesting server-side test data
paths without an admin key. This check applies at the operation requiring admin
credentials, so public test definitions and modern test-data downloads remain
available. The change includes a HISTORY entry and HTTP regression coverage.

Validation: 24 focused activity, engine, API, profile, and configuration tests
passed with installed galaxy-tool-util 26.0.1. All 16 activity/engine tests also
passed with the actual 25.1.0 and 26.1.0 wheel sources loaded (verified by the
interactor module path). Black, isort, Flake8, and `git diff --check` passed.
Targeted mypy reports three existing staging errors at activity.py:29 and :467;
substituting the unchanged HEAD version of activity.py reproduces the same
errors. Live Galaxy execution was not rerun. No GitHub comment was posted.


## Marius companion #7 — 2026-10-11

[Independent fix review](marius_followup_7_2026-10-11.md). Companion #7 merged into anonymous-external-galaxy-api as b6f5af76209b428877e0d784f0014948c6e055ad. Nine focused tests passed. Upstream PR remains open. Decisions and follow-ups: [October ledger](../../../../../agents/planemo/PR_FOLLOW_UPS_EARLY_OCTOBER_2026.md).
