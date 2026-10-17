# Baseline refactor

No refactoring of the base branch was performed.

The implementation is one changed line in `WorkflowProgress.set_outputs_for_input` (`lib/galaxy/workflow/run.py`), plus new tests. There is nothing to split out ahead of the fix. Earlier drafts extracted `_check_dataset_ready` and `post_job_action_replacement_parameters`; reviews removed both before this step. Done directly, not by subagent, given the one-line diff.
