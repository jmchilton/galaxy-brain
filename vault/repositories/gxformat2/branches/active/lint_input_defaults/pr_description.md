Lint multiple text and native parameter input defaults

Closes #272.

galaxyproject/galaxy#24140 (open, `release_26.2`) makes Galaxy reject non-string entries in multiple text defaults. The lint didn't catch these:

- `[string]`/`[text]` inputs skipped default validation entirely.
- Native `.ga` `parameter_input` defaults were never checked.

Scalar `default: 1` on a `string` input was already a lint error.

Changes:

- One helper checks input defaults for both format2 inputs and native `parameter_input` steps. Native types come from `native_input_to_format2_type`.
- A `[string]` default may be a string (Galaxy wraps it) or a list of strings. Any non-string entry is an error. Other list types are still not checked.
- Booleans are no longer accepted as `int`/`float` defaults. That matches the TS port.
- The message names the input and the expected type, after the old prefix: `Input default is of invalid type. Input mixed_list is [string]; its default must be a string or a list of strings.`
- New declarative fixtures: `synthetic-lint-bad-text-list-default.gxwf.yml` and `synthetic-lint-bad-parameter-defaults.ga`.

I lint rather than type `default` in the schema. List inputs fall back to the catch-all `WorkflowInputParameter`, whose `default` has to stay `Any`, so a schema type would only cover scalar text, which the lint already catches.

IWC sweep of `lint_ga` (132 workflows): 0 new errors.

TS port: jmchilton/galaxy-tool-util-ts branch `lint_input_defaults`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
