# Fresh-dev readability rebase — 2026-10-16

READY for human review; draft PR #24038 awaits new-head CI. Published cleaned head `e06bbc4c70271aacfe27a88e315c882b5270ecaa` on dev `5ff1e46b8c38c704be8da75b4db05b3d56f93f3d`.

Kept the score-2 pruning, upstream duplicate-suite deletion, all 416 retained messages/trailers, and the original with-churn reference. Reconciled upstream regression tests and schema additions; folded repairs into their retained test commits. Two additional per-test commits feed controlled checkbox values back through props. No production behavior changed and no downstream branches rebased.

Final gates: client 612 suites / 5,345 tests pass with one skip; Tool Shed 27 suites / 182 tests pass; both frontend type checks, adapted-file lint/format, whitespace and vault validation pass. Independent normal review and test challenge have no remaining findings. CI has not settled. Details, exact base/head/backup refs and history mapping are in [the branch index](index.md).
