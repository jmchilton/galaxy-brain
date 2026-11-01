Run via Claude Opus 5.5 at high effort.

No refactoring of the base branch was performed.

Re-evaluated fresh. Only refactor-shaped commit is `c324c6103c9` (one XML helper for direct-download settings). Hoisting it before the fix would mean a helper returning only `enable_direct_download`, then re-editing it in the fix commit - churn with no review benefit for a ~25-line release fix. Hoisting hardcoded lifetimes into a constant first is impossible without behavior change (base values differ: boto3/azure 1h, s3/cloud 24h). History left as-is: "Baseline tests" commit first, then fix, validation, test tweak, helper. Nothing rewritten or pushed.
