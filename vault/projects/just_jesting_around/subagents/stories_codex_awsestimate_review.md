# AwsEstimate stories review — 094203299d3

Reviewed 2026-10-14. Independent read-only review approved against repaired stories tip 34faab01b327 without blocking or recommended changes.

## Assertion mapping

All four cases, seven original sites and 12 executed assertions survive unchanged. Negative resources retain plain mount and absent aws-name assertion. Small job uses ShortSingleCoreJob with exact t2.small, 0.00 USD, memory, vCPU count and CPU models. Large job uses LongMulticoreJob with exact m5d.12xlarge, 16.32 USD and the same exact detail checks. Resources exceeding the catalog use composed mount overrides and exact empty-object assertion.

Original numeric strings, Number conversions, selector contracts and existing ec2Instances lookup remain. Removed random jobId was undeclared and unused. Stories describe meaningful resource scenarios against the unchanged bundled reference snapshot; they make no claim to current market prices. Composed mounts use fresh testing Pinia/owned cleanup and the remaining plain mount retains automatic cleanup. Anonymous collapse state starts open and stays in memory.

## Validation and resumed work

Targeted unit 4/4, Chromium probes 2/2 (including collapse/reopen) and type-check passed. Draft was backed up/restored exactly around the independently approved ToolForm repair. Normal hooks passed on the restored commit. Reviewer read logs/source without rerunning gates or mutating files.

Complete gates passed unit 722 tests in all 92 selected files and Chromium 346 tests in 91 files. Formatting, lint and normal hooks passed; fast-forward push completed on repaired history.
