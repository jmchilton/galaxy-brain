# galaxy-tool-util-ts#216 — `draft-validate --concrete --json` reports errors while every `*_errors` array is empty

Issue: https://github.com/jmchilton/galaxy-tool-util-ts/issues/216
Downstream: galaxyproject/foundry#668 (part 1).

## Triage (2026-11-06)

- Claimed by workflow_libs workhorse. No open PR or branch addressed it.
- Root cause confirmed: `isConcreteOk` counts failures that nothing rolls up to the top level. Branch: [`issue_216_concrete_errors`](../../../branches/active/issue_216_concrete_errors/index.md).
