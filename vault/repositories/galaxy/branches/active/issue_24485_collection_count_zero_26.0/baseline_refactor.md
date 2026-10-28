No refactoring of the base branch was performed.

The fix is three `x and` → `x is not None and` substitutions in `verify_collection`; there's no structural change to pull ahead of it. Branch history is already `Baseline tests` then fix. Done inline by the coordinator (diff too small to warrant a subagent).
