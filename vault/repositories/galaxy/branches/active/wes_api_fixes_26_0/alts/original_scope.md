# wes_api_fixes_26_0_alt_original_scope

[View on GitHub](https://github.com/jmchilton/galaxy/tree/wes_api_fixes_26_0_alt_original_scope) · tip `0bbc3e55ae8`

This is the branch as it stood on 2026-11-15, after the test-challenge, Codex, performance, thermo-nuclear and baseline-refactor steps and before the first scope evaluation. It is six commits on `release_26.0` (`9ae7ab9c1df`): the `_cancel_wes_run` test helper, then five WES-only fixes, one per commit:
- `use_cached_job` accepts a JSON boolean.
- Anonymous run-scoped requests get 403.
- Cancelling a terminal run is a no-op.
- A rejected submission leaves nothing behind.
- An omitted optional parameter shows as `null` in the WES run log.

It differs from the parent in four ways:
- Only the WES run log maps the `NoReplacement` marker to `null`. The parent does this in `WorkflowInvocation.to_dict`, so the native invocation API changes too.
- WES lists end with `next_page_token: null`, and service-info keeps `auth_instructions_url: "TODO"`.
- `submit_run`, `list_runs` and `_get_invocation` each keep their own anonymous check.
- `_get_invocation` error messages show the decoded database id.
