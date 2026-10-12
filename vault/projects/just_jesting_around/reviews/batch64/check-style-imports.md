# check-style-imports — batch 64

All 20 original forbidden/allowed import examples and assertions remain unchanged. Added one aggregate case containing two forbidden imports separated by an allowed import, checking every result and its actual source line number. Final21cases/21checks. Existing test structure is already readable; no cosmetic restructuring or helper expansion needed.

Bounded mutation: returning only the first violation passes all20original cases but fails only the new complete-report case. Source/test restored in finally; the restored final21cases pass. No production mutation committed. Logs: /private/tmp/readability64-style-mutant-{original,final}.log and restored.log.

Before/after shuffled640101 passes20/21cases. Actual script is byte-identical. V8 reports23covered locations at each ref; five synthetic statements incorrectly map to source line2, which is a comment, with varying generated column spans. Excluding only these proven non-source transform artifacts retains all18actual covered statement/function/branch-arm locations exactly. Main CLI scanning is not claimed as exercised by this pure-function suite. Raw reports and source-only comparison JSON are under /private/tmp/readability64-style-* for independent review. No real source location loss.

Repository hooks including lint and formatting pass. No production, dependency, shared or supporting edits; no useful new README guidance identified.
