# Initial review — #24032

PR: [Fixes chat messages and standard request options in the plugin chat proxy](https://github.com/galaxyproject/galaxy/pull/24032)

Reviewed HEAD: `7740fac3111b82cd6293079f788e8d7f5ac26eca`. Diff base: `20f365a2654751ba0f390733f261199ceb3f272d` (`origin/dev` merge base). Reviewed 2026-10-10. Live HEAD rechecked after testing and unchanged. PR open, out of draft; no comments or submitted reviews at either check. All 58 checks completed: 56 success, 2 skipped.

Recommendation: **approve**. No actionable findings. Review is **unposted**.

## Review evidence

- [Message normalization](https://github.com/galaxyproject/galaxy/blob/7740fac3111b82cd6293079f788e8d7f5ac26eca/lib/galaxy/webapps/galaxy/api/plugins.py#L224) now serializes validated message models rather than reconstructing a smaller subset. `tool_call_id`, `name`, `reasoning_content`, and provider extensions survive. Client system messages are still removed; messages without supported content/tool calls retain the old filtering behavior. Both user and tool messages accept structured text consistently.
- [Request fields](https://github.com/galaxyproject/galaxy/blob/7740fac3111b82cd6293079f788e8d7f5ac26eca/lib/galaxy/webapps/galaxy/api/plugins.py#L109) reuse the installed OpenAI SDK's option types. [Forwarding](https://github.com/galaxyproject/galaxy/blob/7740fac3111b82cd6293079f788e8d7f5ac26eca/lib/galaxy/webapps/galaxy/api/plugins.py#L278) correctly distinguishes explicit `parallel_tool_calls=False` from an absent value and uses SDK `omit` for empty tools and missing options. Stream options are forwarded only for streaming requests.
- The proxy still owns model, prompts, temperature, top-p, token cap, client timeout, and rate limit. Arbitrary top-level extensions remain accepted but are not sent upstream. Existing message/tool count and tool-byte checks remain in place.
- Generated client schema covers the new content and option types. Python imports are module-level, and the change reuses model serialization and SDK typing rather than adding a separate request conversion abstraction. The independent Galaxy chat manager handles persistent agent exchanges through a different abstraction; this change is appropriately confined to the visualization proxy.
- [New tests](https://github.com/galaxyproject/galaxy/blob/7740fac3111b82cd6293079f788e8d7f5ac26eca/test/integration/test_plugins.py#L137) already exercise a running Galaxy HTTP API and request validation. The [tool conversation test](https://github.com/galaxyproject/galaxy/blob/7740fac3111b82cd6293079f788e8d7f5ac26eca/test/integration/test_plugins.py#L245) verifies the whole forwarded conversation. The policy, malformed-content, omission, and option cases cover useful observable contracts; existing assertions were preserved.

## Validation

- Entire `test/integration/test_plugins.py`: **22 passed in 45.63s**, Python 3.13.12, OpenAI SDK 3.24.0, Pydantic 2.13.5. Used the Galaxy backend test skill's configuration overrides and existing shared virtualenv. The first sandboxed attempt failed at server setup because it could not bind a localhost port; the approved rerun completed successfully.
- [Independent real-SDK transport probe](wire_probe.py): **4 scenarios passed**. Called the actual adapter with the actual OpenAI SDK and `httpx.MockTransport`, then inspected serialized upstream HTTP bodies and streamed output. Confirmed structured user/tool text, `tool_call_id`, `reasoning_content`, nested message extensions, empty/absent/null tools, false-valued options, omission of missing options, stream-only stream options, streamed usage, server settings, and request-session release. All requests stayed in memory; no live AI provider was called.
- `git diff --check origin/dev...HEAD`: clean. Review worktree remains clean; no source changes.

Reproduce the integration tests from the PR worktree:

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=lib \
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
GALAXY_TEST_TOOL_CONF='lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml' \
/Users/jxc755/projects/repositories/galaxy/.venv/bin/python -m pytest \
  test/integration/test_plugins.py -v --tb=short --no-showlocals -p no:cacheprovider
```

The integration suite mocks the provider client. The additional probe checks SDK serialization and response parsing, but it is not a live-provider compatibility test. No browser testing or external model inference was performed. Provider-specific supported options and model restrictions remain outside this review's experimental evidence. The official [Chat Completions reference](https://developers.openai.com/api/reference/python/resources/chat/subresources/completions/methods/create) and local pinned SDK definitions support the ordinary fields checked here; `reasoning_content` is intentionally handled as a provider extension.

## Risks

Risk is low: the implementation is easy to roll back, although plugin authors may come to rely on the newly supported request fields.

<details><summary>Risk Details</summary>

- The API gains structured text and explicit request options, creating expectations for plugin clients; rolling these back after adoption would affect those clients.
- More message metadata now reaches the configured provider. Provider-specific validation or option support can still reject otherwise valid Galaxy requests.
- No database migration, stored-data conversion, tool/workflow format change, or substantial UI behavior is introduced.

</details>

<details><summary>Risk Review Advice</summary>

Check that the supported option set matches the inference behavior Galaxy intends to offer to plugins, and that configured providers accept the preserved message fields. The running-server tests cover the main contracts cleanly; a live model is not needed as a merge gate for this fix.

</details>
