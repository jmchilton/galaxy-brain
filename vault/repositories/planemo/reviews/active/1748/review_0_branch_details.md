# Review branch `pr_1748_review_0`

This branch is based on PR head `14c205f7`. It rewrites the PR's new unit test so that it runs the real `GalaxyEngine._run` instead of a hand-written `_run`. Only Galaxy serving and `execute` are faked, so the test now fails if output collection ever moves outside the served context. It also trims two rationale comments to a single line each. The production logic is unchanged.

- `88fa39d5` Drive real GalaxyEngine._run in shutdown test: replaces `_ShutDownEngine` with a `GalaxyEngine` subclass and a monkeypatched `planemo.engine.galaxy.execute`. The test passes on the PR head and fails on the mutant and on base `interface.py`.
- `f45c16e6` Trim rationale comments on collected test data: shortens the `RunResponse.collected_test_data` comment and the `_collect_test_data` docstring to one line each.
