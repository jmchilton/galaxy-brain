# Brain research: issue_24600_pulsar_none_extra_files_25.1

```yaml
documents:
  - path: vault/research/Component - Pulsar Input Staging.md
    why: Explains `rewrite_parameters`, the `PulsarComputeEnvironment` path-rewrite hooks (including `input_extra_files_rewrite` and `path_rewrites_input_extra`), the `none`/`rewrite` file actions, and how extra-file rewrites become `INPUT_EXTRA_FILES_PATH` client inputs.
    load_when: Understanding why `none` yields a `None` rewrite and what the hooks feed into at submit time; reviewing the fix. Line numbers refer to dev and may differ on release_25.1.
  - path: vault/repositories/galaxy/issues/needs_decision/24600/proposal.md
    why: The issue write-up, reproduction tests, and the proposed approach (hooks return None, callers fall back to the local extra-files path) with the caller list.
  - path: vault/repositories/galaxy/issues/needs_decision/24600/debrief.md
    why: What was reproduced (composite output and Directory input fail; copy/remote_transfer and non-extra-files tools pass) and what was only inferred (Directory output, data-manager bundle path).
    load_when: Deciding which tests to add and which callers still need verification.
  - path: vault/research/Component - Galaxy Pulsar Runner Code Sharing.md
    why: How Galaxy's Pulsar runner shares code with Pulsar; background for what lives in `PulsarComputeEnvironment` versus Pulsar's `PathMapper`.
    load_when: Only if the change spills into Pulsar-side code.
  - path: vault/research/Component - Tool Testing Infrastructure.md
    why: Framework tool test cases and `integration_tool_runner` background for adding tests to `test_pulsar_embedded_none.py`.
    load_when: Writing the integration tests (note: the runner runs only each tool's first test case).
research_requests:
  - vault/agents/gx_research/todo/tool_evaluation_compute_environment.md
  - vault/agents/gx_research/todo/composite_datatypes_extra_files.md
```
