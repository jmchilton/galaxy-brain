# Foundry #796 domain-review findings fix (`a5c6cd57`)

Run via Claude Opus 5.5 at high effort.

Mirrors gxformat2 `397819a` (see its [foundry_findings_fix.md](../../../../../gxformat2/branches/active/issue_295_workflow_diff/subagents/foundry_findings_fix.md) for the contract). One commit on `3fd23149`, pushed to `origin` (PR #233 head `a5c6cd57`); live PR body updated.

- Re-synced `diff.yml` and five new fixtures with `make sync-workflow-fixtures sync-workflow-expectations` from the gxformat2 worktree; reverted unrelated main drift again (`validate_format2.yml`, `synthetic-extra-field-output`).
- Red first: 4 synced cases failed before the port (same four as Python).
- `workflow-diff.ts`: `buildSide(raw, nf2, prefix)`, prefixed `sourceResolver`, `renamed`, `idRenames`/`uniqueIds`, `merge` (throws on collision, `defineProperty` keeps `__proto__` own), `diffLevel` recursion via `inlineRun` (excludes `@import` and user-tool runs), `StepSummary.id`, `stepHeading` path rule. `isDraft` moved to `diffWorkflows`.
- Unit tests: summary `id` is `null` (the declarative harness accepts `undefined` for `null`), nested text heading, collision throws.
- Docs: guide row, changeset, PR description (29 cases, 28 fixtures).
- Parity (scratch, not a test): text, ordered JSON and `--exit-code` status identical on all 29 `diff.yml` cases; JSON identical on 34 IWC workflows with inline subworkflows, each with one inner step deleted (every pair reports the nested removal).

Gate green: `make check`, `pnpm lint:unused:ci`, `pnpm build`, `pnpm test` (schema 5222 passed / 5 expected fail).
