Fix coexecution apps crashing at startup on a read-only root filesystem because they create `dependencies/` under `/`.

> **Stacked on 🔀 #579** (on #578 and #577). This PR's own commits are the last three: `f472a87`, `4fd4b12` and `e770845`. Review `f472a87` and `e770845` first (`pulsar/scripts/submit_util.py` and its test). `4fd4b12` only removes the image-side workaround that #577 added.

Funnel's default executor template runs containers with `docker run --read-only`. Inside it, `pulsar-submit` builds a Pulsar app with no `tool_dependency_dir`, so the app defaults to `dependencies` relative to the working directory, `/`. galaxy-tool-util 26.x's Conda resolver creates that directory at startup:

```
OSError: [Errno 30] Read-only file system: '/dependencies'
```

`pulsar-submit` exits 1 before staging anything or publishing a status, and the TES task ends `EXECUTOR_ERROR` without running the tool. Galaxy doesn't poll TES, so the job stays `queued`.

| `pulsar-submit` under `--read-only`, with `PULSAR_CONFIG_TOOL_DEPENDENCY_DIR` unset | Result |
| --- | --- |
| Staging image built without this fix | exit 1, `OSError` above, nothing published |
| Staging image built from an earlier revision of this branch | exit 0, publishes `running` |

<details><summary>The fix</summary>

`pulsar-submit` and `pulsar-finish` now build their config with a small `CoexecutionConfigBuilder`. It defaults `tool_dependency_dir` to `none`, which means no dependency resolution, unless the app config sets `dependency_resolution`. That is the same condition `Client.get_pulsar_app_config` uses to decide whether to add its own resolvers for containerless jobs, so those jobs still resolve Conda dependencies as before. A `tool_dependency_dir` from app config or `PULSAR_CONFIG_TOOL_DEPENDENCY_DIR` still wins.

The default lives in the coexecution scripts rather than in `pulsar/core.py`, the shared config builders, or the client:

- `pulsar serve` shares `core.py` and the builders, and changing the default there would move every server's dependency directory.
- The client ships in Galaxy's pulsar-galaxy-lib, so older Galaxy releases talking to a new staging image would never send a client-side setting.
- `manager_from_args` already applies a coexecution-only app setting in `submit_util.py`.

With the default in Pulsar, the staging image no longer needs the `PULSAR_CONFIG_TOOL_DEPENDENCY_DIR` line #577 added, so `4fd4b12` removes it.

</details>

<details><summary>Tests</summary>

- `test_sequential_coexecution_writes_nothing_to_working_directory` runs submit, tool and finish with the working directory in an empty temp dir. Without the fix the directory ends up containing `dependencies`.
- `test_coexecution_tool_dependency_dir_default` covers the precedence through the real argument parser and builder: the default, app config, env, app config over env, and a `dependency_resolution` with only resolvers (the shape `app.yml.sample` documents), which keeps its resolution.
- An earlier revision, without the `dependency_resolution` condition, was checked with Docker: an image built from it ran submit, tool and finish under `--read-only` with no env override.

</details>

## Risks

Low and two-way: a default in two scripts.

<details><summary>Risk Details</summary>

- A coexecution app config with no `dependency_resolution` and no `tool_dependency_dir` now gets no dependency resolution. That covers the Galaxy-style flat keys (`dependency_resolvers`, `conda_prefix`) and a resolvers XML file. Galaxy's client always sends `dependency_resolution` for containerless jobs, and containerized jobs bring their own tools.
- A config that sets `dependency_resolution` without `default_base_path` keeps the old base path under the working directory, so it still fails on a read-only root, as on `master`.
- Containerless Conda jobs on a read-only root still need a writable `/pulsar_dependencies`; Conda `auto_install` writes there. Not tested.

</details>

<details><summary>Risk Review Advice</summary>

The question for review is whether "no `dependency_resolution` → no resolution" is the right default for coexecution apps, and whether it belongs in `submit_util.py`.

</details>

## Context

Part of a set of fixes found while running Galaxy jobs on GA4GH TES servers (Funnel, TESK) through Pulsar coexecution. It replaces the image-side workaround from 🔀 #577 with a fix in Pulsar.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Kept the default in the coexecution scripts, and stopped it from disabling resolution that a config asks for.</summary>

- The review weighed `core.py`, the shared builders and the client as homes for the default, and found the coexecution scripts the right layer (reasons above).
- Fixed: a `dependency_resolution` without `default_base_path`, which is the shape `app.yml.sample` documents, silently got a null dependency manager. The default now applies only when there's no `dependency_resolution`, mirroring the client's rule. The new test case fails without the fix.
- Not done: moving the other coexecution-only app setting (`message_queue_consume=False`) into the builder, since that's older code.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/coexecution_dependency_dir_default/thermo_nuclear_review/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings from Codex. The coordinating agent flagged the <code>dependency_resolution</code> case fixed above.</summary>

Codex got the diff, the full post-change files, `core.py`, the config builders, the client's app config code and galaxy-tool-util's dependency manager construction. It reported nothing. While triaging, the coordinating agent reproduced the `dependency_resolution` case with `build_dependency_manager` directly.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/coexecution_dependency_dir_default/codex_review/). Run via gpt-6.1-sol at high effort.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01S9mD3nK1ghSGVVYtkV411H
