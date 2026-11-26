# Alt: report only

`tool_patches_static_findings_alt_report_only` at `9fc1faf4440`: the hardened offline integration before the second re-scope. `review_patches()`, `PatchReview` and the CLI's `--tool-patch-path` and `--fail-on mismatch|uncleared` report findings before and after tool patches. Nothing refuses jobs.

The parent branch keeps all of it and adds refusal at job preparation: with `tool_security_refuse_static_findings` on, Galaxy refuses jobs of tools whose patched source still has findings at or above a severity.
