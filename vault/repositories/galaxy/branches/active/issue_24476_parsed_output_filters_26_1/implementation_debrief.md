# READY — Preserve parsed tool output filters

Implemented [#24476](https://github.com/galaxyproject/galaxy/issues/24476), targeting `release_26.1`. Branch [`issue_24476_parsed_output_filters_26_1`](https://github.com/jmchilton/galaxy/tree/issue_24476_parsed_output_filters_26_1) is pushed at `90601b3bc4e`. No PR opened. Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_24476_parsed_output_filters_26_1`.

## Final behavior and choices

Parsed data, collection and scalar outputs now expose ordered `filters` expression strings, with surrounding whitespace stripped. Multiple filters are preserved; all must evaluate to true for the output to exist. The metadata conversion does not evaluate them. Unconditional outputs use an empty list, and the model default keeps older serialized output objects loadable.

The field belongs to a parsed-only base used by all six concrete output variants. Incoming tool definitions, including user-defined authoring models, retain their existing contracts. XML scalar outputs had the same omission and are included for consistency. Existing Tool Shed schema hashing invalidates old parsed-tool cache entries automatically. Regenerated Tool Shed types add only the six corresponding `filters?: string[]` fields; Galaxy's generated client has no parsed-output types to update.

No runtime filtering or UI behavior changed. No screenshot/E2E step applies to this metadata-only change. Downstream `galaxy-tool-util-ts` schema resynchronization follows Galaxy release and Tool Shed deployment.

## Validation

- 147 focused parser, output serialization and user-tool boundary tests passed.
- 49 existing model and Tool Shed cache tests passed: 196 tests total.
- Separate first commit `eb8e990c972` contains passing baseline tests. Independent test challenge verified all three new baseline cases pass on original source, while all eight regressions fail at the expected missing-field assertions.
- `make format`, pinned ruff and commit hooks passed. Targeted mypy reports 14 errors in three imported parser modules; the base branch's shadow-file run produces byte-identical output, with no errors in changed files.
- OpenAPI generation succeeded; generated changes are confined to six parsed output variants. `git diff --check` passed.
- Vault validation passed: 126 files, zero errors, 15 existing advisory warnings.
- Fork CI was queued at handoff; no CI result is claimed.

## Reviews and scope

Normal review, test challenge and strict code-quality review recommended no changes. Baseline-refactor review found no independently useful refactor to separate. Scope evaluation recommends retaining the implemented scope, including scalar outputs; no expansion or contraction is pending. Review details are in the sibling debriefs and `subagents/normal_review.md`.

Queued under `branches_implemented_needs_ci` for human review and branch management.

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/issue_24476_parsed_output_filters_26_1/differential-review/snapshots/20261026T160623Z-hardening-90601b3bc4ef.json
  hardening @ 90601b3bc4ef vs origin/release_26.1 (merge-base 4d652be1cd8b)
  since 20261026T160016Z-implementation-90601b3bc4ef:
    commits: 2 same, 0 rebased, 0 changed, 0 new, 0 dropped
    hunks:   16 carried, 0 changed, 0 new, 0 dropped
```
