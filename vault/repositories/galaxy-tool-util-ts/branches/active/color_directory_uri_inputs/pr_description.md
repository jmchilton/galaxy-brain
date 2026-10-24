TS port of galaxyproject/gxformat2#281 (#202): first-class `color` and `directory_uri` workflow parameter inputs.

Stacked on #<gxformat2_sync_265_278 PR>; review only the last two commits.

Syncing fixtures from gxformat2#281 (`6b375cf`) turned 12 declarative tests red. This branch makes them pass:

- **Models.** The regenerated Effect schemas add `WorkflowColorParameter` and `WorkflowDirectoryUriParameter`.
- **New `input-parameter.ts`.** It mirrors gxformat2's `_input_parameter.py`: a Format2 type → Effect schema map plus `inputTypesDeclaring(field)`. Several tables are now derived from it instead of hand-kept:
  - which input types may carry `restrictions`, `suggestions`, `restrictOnConnections` and `validators`;
  - the native step-type table;
  - the regex validator conversion types.
- **Conversion.** Both types become native `parameter_input` steps and convert back. `directory_uri` keeps its regex validators in both directions.
- **Rejections**, matching Galaxy's editor: validators on `color`, restrictions or suggestions on either type, and `multiple` on either type.
- **Lint and Mermaid.** Lint flags non-string defaults on both types (Format2 and native). Mermaid draws `directory_uri` as a parameter node.

After this branch, `check-sync` against the gxformat2#281 branch is clean and the full suite passes.

## Risks

- This tracks an unmerged gxformat2 PR. Merge it after gxformat2#281, and re-sync if #281 changes.
- Raw schemas were regenerated with `PYTHONHASHSEED=0`, the same as the base branch.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
