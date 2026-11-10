Lint verification workflows with `planemo workflow_lint`

The verification-workflows job linted with `planemo lint`, which checks tool XML. On `.gxwf.yml` files it exits 2 with no message. The step had `continue-on-error`, so that went unnoticed. `workflow_lint` turned up real problems, which this PR fixes:

- **Installable Tool Shed pins.** Four workflows used the changeset revisions that IWC pins. Those revisions have been superseded by later revisions of the same tool versions, and planemo 0.75.48 rejects them as not installable. The PR pins each tool version's installable revision instead (see #645):
  - `map_param_value` 0.2.0: `022a635f2283`
  - `query_tabular` 3.3.2: `a8e9456dbead`
  - `collection_column_join` 0.0.3: `4b00d89e8690`
  - `datamash_ops` 1.9+galaxy0: `aaafc0ac4dd2`
- **`label:` instead of `name:`.** gxformat2's strict schema rejects a top-level `name`. The PR uses `label`, as the Mold examples already do.
- **CI step.** The step now runs `planemo workflow_lint --skip best_practices`. The best-practice checks (annotation, creator, license) don't fit these narrow fixtures. The step reports every failing workflow and no longer has `continue-on-error`, so a lint failure fails the job.

All 31 verification workflows pass the new step locally.

Closes #775.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
