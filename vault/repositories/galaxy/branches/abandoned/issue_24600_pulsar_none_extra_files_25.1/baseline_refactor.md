Run via Opus at low effort.

No refactoring of the base branch was performed.

## Evaluation

Branch `issue_24600_pulsar_none_extra_files_25.1`, reviewed against `origin/release_25.1` at HEAD `bf1ec9728a6`:

1. `f728652f009` Baseline tests for PulsarComputeEnvironment extra files rewrites
2. `bf8723a0b9d` Fix Pulsar extra files paths when nothing is staged
3. `0f3ed112d3f` Annotate Pulsar extra files rewrite hooks as returning str
4. `4d18da26fee` Trim PulsarComputeEnvironment unit tests to the rewrite action
5. `bf1ec9728a6` Fix Pulsar file action docs in the sample job confs

The production change is a 6-line fix in `lib/galaxy/jobs/runners/pulsar.py`. When `input_path_rewrite`/`output_path_rewrite` return `None`, `input_extra_files_rewrite` and `output_extra_files_rewrite` now return `dataset.extra_files_path` early. The branch also adds `-> str` annotations to both hooks. Nothing in the fix is a refactor: the change is the behavior change itself.

Candidates considered and rejected:

- **`-> str` annotations (commit 3).** These could be moved ahead of the fix, since on base the hooks either return a `str` or crash. They are two tokens, though, and are only clearly true once the `None` branch exists. A separate base-level commit would add review overhead and give nothing back. Leaving them after the fix is right.
- **Sample job conf doc fixes (commit 5).** These do not depend on the fix and could sit anywhere in the history. They are a small separate docs fix, not a refactor that prepares the base for the change. They already have their own commit, so they can be split out or dropped without touching the fix.
- **Test commits.** The baseline tests are already first, as the workhorse policy requires. Commit 4 only trims tests and is not a refactor.

No history was changed, committed or pushed. The branch is already pushed and force-pushing is not allowed here, but the history would have been left alone even without that limit.
