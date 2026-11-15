---
upstream_base_branch: release_26.0
child_branches: wes_run_state_executor_error_26_0
related_records: galaxy/branches/wes_run_state_executor_error_26_0
---
# WES API bug fixes (26.0)

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.0...jmchilton:galaxy:wes_api_fixes_26_0?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/wes_api_fixes_26_0)

## Status

Hardened and re-scoped READY at `67305c6d0a1` on `release_26.0` (`9ae7ab9c1df`), from stage 3 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md). See the [debrief](implementation_debrief.md). Worktree: `~/projects/worktrees/galaxy/branch/wes_api_fixes_26_0`.

No PR.

Fork CI for `67305c6d0a1` was queued at hand-off. CI was green on the pre-hardening head, `85f9b2b42be`.

## Scope

Ten commits: test helpers, two behavior-preserving refactors, and seven fixes, each with an API test:
- `use_cached_job` accepts a JSON boolean (it was a 500).
- Anonymous run-scoped requests get 403 instead of 500, and error messages show encoded ids.
- Cancelling a terminal run leaves it alone.
- A rejected submission leaves no imported workflow or history.
- An omitted optional parameter output is `null` in `WorkflowInvocation.to_dict`, so in both the native invocation API and WES.
- The last page of a list has `next_page_token: ""`.
- A real `auth_instructions_url`.

The demo's probes found these bugs (`~/projects/repositories/galaxy-wes-tes/docs/troubleshooting.md`, "Galaxy WES bugs"). The PR should flag the native `output_values` change.

The second [scope evaluation](scope_evaluation.md) recommends keeping the scope as it is.

## Branches

- `wes_api_fixes_26_0_alt_original_scope` (`0bbc3e55ae8`) is the branch before the re-scope. See [alts/original_scope.md](alts/original_scope.md).
- The child [`wes_run_state_executor_error_26_0`](../wes_run_state_executor_error_26_0/index.md) still sits on `85f9b2b42be` and needs rebasing onto `67305c6d0a1`.
- `wes_api_fixes_v26.1.2` (`2aad3a3e80c`, pushed to jmchilton) is the original five commits cherry-picked onto tag `v26.1.2` for the demo's Galaxy. It is demo only, not for a PR, and doesn't include the hardening or re-scope changes.
