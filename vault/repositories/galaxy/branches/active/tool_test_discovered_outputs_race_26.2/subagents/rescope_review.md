# Rescope review

The review approved the branch and found no bugs. Nothing was changed as a result.

Findings not acted on:
- **Galaxy core still hardcodes the name format** in `output_collect.py`, `store/discover.py` and `model/__init__.py`. `tool_util` can't import from `galaxy.model`. Unifying these through `galaxy.util` is a follow-up for `dev`. Mention this in the PR body.
- **No mocked test of `resolve_tool_submission`:** the test challenge deliberately replaced that test with a pure `split_declared_job_outputs` test, so I didn't add it back.

<details><summary>Details</summary>

Tests: 160 passed. The behavior of `verify_output_dataset` and the selenium framework is unchanged. Imports are at the top of each module. The tests use hardcoded literals, which is good because they pin the name format.
</details>
