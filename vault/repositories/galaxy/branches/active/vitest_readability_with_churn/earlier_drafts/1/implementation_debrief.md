# Churn stack rebase — 2026-10-16

READY as a local comparison stack; reference only, do not PR. `vitest_readability_with_churn` is now `488693a2611de20c50ec5f990311a6d676c0c989`, 76 commits above cleaned `vitest_readability` `e06bbc4c702`.

Used the pruning manifest to replay only the removed branch-local commits. Every original message/trailer is preserved. Shared dependencies already present below are reused; five reconciliations retain new dev coverage. The original churn head `7f2db5e5941` remains at `backup/vitest_readability_with_churn-before-stack-20261016`. Cleaned readability, its PR and downstream branches are unchanged. No remote publication.

Final checks: 612 client suites / 5,471 tests pass, one skipped; 27 Tool Shed suites / 182 tests pass; both frontend type checks and changed-file lint/format pass. Normal review and test challenge have no remaining findings. The authoritative client run uses isolated dependencies; an earlier shared-dependency run was discarded. Vault validation passes with 15 advisory warnings. [Mapping and details](index.md).
