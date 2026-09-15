# PR 424 — Update real user docs

PR: https://github.com/galaxyproject/pulsar/pull/424  
Reviewed: 2026-09-10  
Head: `497ff65ae6a37fb9f9d4660ae7ac97615f5f71a6`

## Recommendation

**Needs a small refresh before merge.** The technical change is correct and the merged documentation builds cleanly, but the branch is 197 commits behind current `master`, its only CI run is nearly ten months old, and that run still has a failed `install_wheel` job. Rebase or otherwise update the branch to trigger current CI, and polish the replacement sentence while touching it.

After that, this is safe to merge; there is no design or test-coverage concern for this one-paragraph documentation correction.

## Findings

### Minor: the new sentence is grammatically rough

`docs/job_managers.rst` currently proposes:

> In addition one needs to set the `submit_user` parameter to `$__user_name__`, see documentation in the sample job_conf.yml file

This is a comma splice, needs a comma after "In addition," and has no terminal period. It also leaves the location of the setting implicit. Suggested wording:

> Additionally, set the ``submit_user`` parameter to ``$__user_name__`` in Galaxy's Pulsar job destination, as shown in Galaxy's `sample job_conf.yml file <https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/config/sample/job_conf.sample.yml>`__.

This is not a correctness defect, but prose quality is the whole surface of this PR and is easy to fix before merge.

### Process: current CI has not exercised the change

- GitHub reports the PR as open, non-draft, and mergeable.
- The head is 197 commits behind current Pulsar `master` and one commit ahead.
- All checks date from 2025-11-18. The docs, lint, mypy, unit, and framework jobs passed then, but `Run Tests (install_wheel, 3.9)` failed. Its archived log is no longer available from GitHub (HTTP 410).
- CI and documentation dependencies have changed substantially since that run, including current Python coverage and a newer Sphinx configuration. A fresh run is appropriate even though this is docs-only.

## Correctness and integration

- The old `dev.list.galaxyproject.org` URL is dead, so removing it is warranted.
- The replacement instruction agrees with Galaxy's current `dev` sample job configuration, which still documents `submit_user: $__user_name__` for a Pulsar server configured to run jobs as the real user.
- The link target exists and intentionally follows Galaxy's live `dev` configuration example.
- The one-file change applies cleanly to current Pulsar `master`; GitHub also reports `MERGEABLE`.
- No new abstraction, imports, or executable behavior are introduced, so the repository's reuse and import-placement concerns do not apply.

## Validation

- `git diff --check origin/master...origin/pr/424`: clean.
- Cherry-picked the PR commit onto current `origin/master` in an isolated temporary clone: clean application, no conflict.
- `make lint-docs` on that synthetic current-master result: passed with no unfiltered Sphinx warnings.

