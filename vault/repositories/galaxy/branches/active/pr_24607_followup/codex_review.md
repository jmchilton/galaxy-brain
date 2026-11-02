Run via gpt-6-sol at medium effort.

# Codex review

One finding, confirmed and fixed in `2a91b2acb42`. Nothing else reported.

## Acted on

- **P2, `lib/galaxy/jobs/handler.py:343`: startup log blames the job's owner for any uuid lookup failure.** CONFIRMED. Public (admin-created) dynamic tools also go through uuid lookup (`lib/galaxy/tool_util/toolbox/base.py:907-915`), and a deactivated one raises `ObjectNotFound` (`managers/tools.py:115-117` filters on `public == true()` only, and the toolbox lookup raises when nothing is found). The log said "not available to the job's owner" for those too. Fix: the reason is now `(uuid ...) unavailable: <error>`, so the exception text carries the cause. Updated the unit test assertion and the PR description. Startup unit tests: 2 passed.

## Not acted on

- None.

<details><summary>Raw Codex output</summary>

Coverage: handler.py, test_unprivileged_tools.py, populators.py, both unit tests, toolbox/base.py, tools/__init__.py, managers/tools.py, managers/group_users.py, api/group_users.py, model/__init__.py. No live-server tests.

> P2 correctness, handler.py:343, "Startup recovery attributes missing public dynamic tools to the job owner." The exception handler applies the owner-specific reason to every UUID lookup. Public dynamic tools also use UUID lookup, and deactivating one makes lookup raise ObjectNotFound. That failure has nothing to do with the owner's permissions. Failure scenario: a job using a public dynamic tool is pending when that tool is deactivated. On restart, recovery fails the job and logs that the tool is unavailable to the job's owner, giving the administrator the wrong reason. Confidence: certain.

</details>
