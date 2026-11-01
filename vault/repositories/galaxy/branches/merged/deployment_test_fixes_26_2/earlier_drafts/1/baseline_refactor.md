No refactoring of the base branch was performed.

Reviewed `origin/release_26.2..6a2cdd7f982`. The Python changes directly restore the existing decorator and context-manager contracts and add capability checks at established helper boundaries. They contain no behavior-preserving extraction or restructuring that would benefit from a preparatory commit.

The Bash argument-array adjustments are small corrections alongside the runner fixes. Splitting them into a separate refactor baseline would add history churn without improving review of this change. The existing passing `Baseline tests` commit (`89b8cc3b93a`) remains first, followed by the fixes and the independently reviewed test improvement. No code or history changes were made during this evaluation.
