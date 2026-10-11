# Coordinated draft fixes — 2026-10-11

The original Python findings and nine TypeScript parity failures are resolved in the published branches. Independent follow-up reviews found no outstanding blocker in this fix scope. GitHub CI was queued at the final state check; neither PR was merged.

- Python: [gxformat2 #219](https://github.com/galaxyproject/gxformat2/pull/219), updated by [025bc24](https://github.com/galaxyproject/gxformat2/commit/025bc24b71693574fe35b66dc899a531401b5556).
- TypeScript: [galaxy-tool-util-ts #190](https://github.com/jmchilton/galaxy-tool-util-ts/pull/190), [0dc940df](https://github.com/jmchilton/galaxy-tool-util-ts/commit/0dc940dff1a07964c7990c925b73a3d6317fe0ac), branch `fix/draft-parity-219`.

## Resulting behavior

Extraction materializes stable IDs on anonymous list steps when removing earlier entries would renumber them. Surviving connections and workflow outputs retain their targets, including inside nested draft workflows; repeated extraction is idempotent and the source document is unchanged.

Draft validation reuses shared input/step semantic rules and collects diagnostics through both concrete and draft inline workflows. It rejects TODO input types in shorthand declarations and reports malformed nested input shapes instead of raising unexpected type exceptions. Shared validators also validate collection/column shapes before inspecting their values.

TypeScript now matches Python on list step identities and overlays, list-form input TODO work and validation, inferred subworkflows, longest-match slash label resolution, Unicode codepoint ordering, and record-field input type restrictions.

Seven new Python-owned shared fixtures and eight declarative cases cover the fixes; the complete PR-head fixture and expectation set is synchronized into TS. Both languages add validity, purity, and idempotence tests for top-level and nested list extraction. Existing tests and assertions were retained. TypeScript includes a schema patch changeset; changeset status passes after commit.

The source schema and public report shapes did not change. CLI commands consume the same draft operations and report buckets, so API-schema regeneration was not needed. No API or extension edit was required.

## Verification

- Python: full suite with `GXFORMAT2_TEST_IWC_DIRECTORY=/Users/jxc755/projects/repositories/iwc`: **1,857 passed**. [Output](python-tests-final.log).
- Original and follow-up review reproductions: **7 passed**. [Independent Python review](fix-review.md).
- Python flake8, changed-code Ruff/Black, and mypy (`gxformat2 tests`, 97 source files) pass.
- TS `pnpm build` and `make check` pass. Final schema lint/format/build rerun after the last semantic-rule change also passes.
- Full TS monorepo `pnpm test`: **6,293 passed**; schema suite **5,100 passed**, with 5 existing expected failures and 79 existing skips. [Output](typescript-tests-final.log).
- Workflow fixtures, expectations, Cytoscape template, schema-rule catalog, lint profiles, and draft sentinel sync checks pass against the coordinated Python checkout. Local-only TS extras are preserved.
- Independent [TypeScript follow-up review](../../../../galaxy-tool-util-ts/reviews/active/190/review.md): no outstanding findings.

The initial full TS test attempt hit sandbox `EPERM` on localhost listeners. It was rerun with the required access and passed; that attempt is not a code regression. A final optional-field fixture clarification was verified in both languages with its focused shared case.

## Delivery and continuation

User authorized fixes and new TypeScript PRs. Python changes were fast-forward pushed to #219's existing fork branch without changing the older local worktree or its untracked work. TypeScript fixes were pushed and PR #190 opened. Neither PR has a public review submission from this session.

Canonical TS worktree: `/Users/jxc755/projects/worktrees/galaxy-tool-util-ts/pr/190`. Python implementation/test checkout: `/private/tmp/gxformat2-pr219-review`, branch `fix/draft-parity-review`, clean at `025bc24`. The canonical Python PR worktree remains unavailable because the PR branch is already checked out in the existing `branch/abstraction_applications` worktree.

Next: await both PRs' GitHub CI before deciding merge readiness. Current tests and reviews resolve the earlier local hold findings.
