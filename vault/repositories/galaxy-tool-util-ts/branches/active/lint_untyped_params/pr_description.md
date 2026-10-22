Match Galaxy's `${name}` semantics in untyped parameter lint

Port of gxformat2 `lint_untyped_params` (galaxyproject/gxformat2). The TS lint already searched the whole string, but it flagged every `${...}`, including IWC renames like `Chromosome File for ${Haplotype}`. Galaxy fills those from a declared parameter input labelled `Haplotype`.

- Don't warn for a rename (`RenameDatasetAction.newname` / format2 `rename`) that references a declared parameter input label.
- `${name}` in other PJA arguments (tags, etc.) still warns, because Galaxy never substitutes there. Tool-state refs still warn too, since only the expanded run form fills them.
- One warning per reference, naming `${name}`, the action, the output, and the fix. Messages match gxformat2 exactly.
- Extract `format2InputStepType()` from `_buildInputStep` for reuse.
- Sync the `synthetic-untyped-params` fixtures and expectations from gxformat2. Only those were synced; unrelated upstream fixture drift is left for its own sync.

IWC sweep of `lintBestPracticesNative`: 0 untyped warnings after the change.

Refs galaxyproject/foundry#677.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
