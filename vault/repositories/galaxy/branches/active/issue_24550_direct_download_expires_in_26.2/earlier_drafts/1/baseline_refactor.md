Run via Claude Opus 5.5 at high effort.

No refactoring of the base branch was performed.

Diff (7 files, ~30 lib lines) is all feature: new `direct_download_expires_in` option, its XML parse helper, `to_dict` entry, sample docs, and swapping per-store hardcoded lifetimes for the attribute. Only candidate was hoisting the hardcoded lifetimes into a shared constant first, but base values differ (azure/boto3 1h, s3/cloud 24h), so a single constant can't preserve base behavior; per-store constants would be churn later replaced by the attribute. Branch history (Baseline tests commit first) left unchanged; nothing pushed.
