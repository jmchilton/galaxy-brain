# Draft issue for `jmchilton/galaxy-tool-util-ts`

Not posted. From [skunkworks_plan.md](skunkworks_plan.md). Owner: the `workflow_libs` agent. File it after the gxformat2 issue: [upstream_gxformat2_validate_draft_warnings.md](upstream_gxformat2_validate_draft_warnings.md).

**Title:** Port `validate_draft`'s dead-structure warnings to `draft-checks.ts`

Port gxformat2's `validate_draft` dead-structure warnings to `draft-checks.ts` after syncing expectations. Add a changeset.

After release, a Foundry pin bump updates `content/cli/gxwf/draft-validate.md`, and `repair-galaxy-draft-topology`'s `eval.md` removal property can become `deterministic`.
