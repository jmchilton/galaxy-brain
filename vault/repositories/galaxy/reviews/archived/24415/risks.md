Risks are minimal - this change only changes which message reaches the user when a tool's JavaScript expression fails during job preparation, and doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- `global_tool_logs` wraps every templating action (command line, config files, environment variables), so every `WorkflowException` raised there now becomes an `ExpressionTemplateError`, which the job runner reports verbatim to the user instead of the generic wrapped message.
- The surfaced text is the JavaScript engine's error line; it can quote parts of the expression or input values, now visible in `misc_info`.
- `ExpressionTemplateError` is re-raised unwrapped instead of being converted to `ToolTemplatingException`; any caller that caught only the latter would no longer see it.
- `expression_error_message` parses free-form engine output by line heuristics; a different engine/node version format could yield a less useful line (falls back to the first line).

</details>

<details><summary>Risk Review Advice</summary>

Confirm nothing catches `ToolTemplatingException` specifically around command-line/config-file building in a way that now misses the re-raised `ExpressionTemplateError`, and that exposing the JS error text to the job owner is acceptable (it is their own tool and inputs). Otherwise this is a release-branch message improvement that is trivially revertible.

</details>
