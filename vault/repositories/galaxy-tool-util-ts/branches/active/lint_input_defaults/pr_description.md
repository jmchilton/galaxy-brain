Lint multiple text and native parameter input defaults

Port of gxformat2 `lint_input_defaults` (galaxyproject/gxformat2#272).

- `[string]` defaults must be a string or a list of strings. Native `parameter_input` defaults are now checked too. Both go through one helper, `lintInputDefault`.
- The message names the input and expected type and matches gxformat2 exactly.
- Export `nativeInputToFormat2Type` from `toFormat2.ts` for reuse.
- Sync only this change's fixtures and expectations from gxformat2. Unrelated upstream drift is left for its own sync.

`make check` and `make test` pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
