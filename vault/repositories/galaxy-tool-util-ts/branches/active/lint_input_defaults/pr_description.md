Lint multiple text and native parameter input defaults

Port of galaxyproject/gxformat2 `lint_input_defaults` (galaxyproject/gxformat2#275, fixes galaxyproject/gxformat2#272).

- List-typed defaults (`[string]`, `[int]`, `[float]`) must be a single value or a list whose entries match the element type. Native `parameter_input` defaults are now checked too. Both go through one helper, `lintInputDefault`, driven by a `DEFAULT_CHECKS` table like gxformat2's.
- The message names the input and expected type and matches gxformat2 exactly.
- Export `nativeInputToFormat2Type` from `toFormat2.ts` for reuse.
- `_parseToolState` returns `{}` for `tool_state` that isn't a JSON object (`"null"`, `"[]"`, a scalar). It used to return what `JSON.parse` gave, so `"null"` made `lintNative` throw on the new check. Unit test in `native-tool-state.test.ts`.
- Sync only this change's fixtures and expectations from gxformat2. Unrelated upstream drift is left for its own sync.

`make check` and `make test` pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
