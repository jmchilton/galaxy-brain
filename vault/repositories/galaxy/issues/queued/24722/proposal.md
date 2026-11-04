# Invoking via the API reports installed Tool Shed tools as "not installed" when a step's `tool_id` is unversioned

If a workflow step names a Tool Shed tool by its unversioned id and gives the version in `tool_version`, invoking it through the API returns HTTP 400 "the following required tools are not installed", even though that tool and version are installed.

| Step reference | `POST /api/workflows` (save) | Editor / UI run form / `ga` download | `POST /api/workflows/{id}/invocations` (default) |
| --- | --- | --- | --- |
| `tool_id: …/repos/devteam/text_processing/tp_cat`, `tool_version: 9.11+galaxy0` | ⚠️ saved; step silently recorded as tool missing | ✅ resolves tool and version | ❌ 400 "required tools are not installed: …/tp_cat (version 9.11+galaxy0)" |
| `tool_id: …/repos/devteam/text_processing/tp_cat/9.11+galaxy0`, same `tool_version` | ✅ | ✅ | ✅ invokes |

⚠️ = request succeeds, but the same lookup misses and the response doesn't say so.

The error sends people to check tool installation. The tool is installed; the difference is how the id is written. Galaxy accepts and stores unversioned ids, and the editor and UI run form resolve them, so a workflow looks valid until an API client (planemo, BioBlend, deploy scripts) tries to run it. Downloading the workflow (`style=ga`) does not help: it returns the stored id unchanged, so a download → edit → upload round trip keeps the problem.

<details><summary>Why: <code>exact</code> means "exact id", but the pre-flight passes "exact version"</summary>

`ToolBox.get_tool` says [`exact` only refers to the `tool_id`, not the `tool_version`](https://github.com/galaxyproject/galaxy/blob/7e16f446410c5626dc40a034fa537ad72a035db2/lib/galaxy/tool_util/toolbox/base.py#L904). Tool Shed tools are indexed by full guid, so an unversioned guid misses `_tools_by_id`. With `exact=True`, that miss [hits `continue`](https://github.com/galaxyproject/galaxy/blob/7e16f446410c5626dc40a034fa537ad72a035db2/lib/galaxy/tool_util/toolbox/base.py#L948-L952), so lineage resolution is skipped and the requested version is never compared.

The invocation pre-flight [`_check_workflow_tools`](https://github.com/galaxyproject/galaxy/blob/7e16f446410c5626dc40a034fa537ad72a035db2/lib/galaxy/webapps/galaxy/services/workflows.py#L634-L671) passes `require_exact_tool_versions` as that `exact` argument, to both `has_tool` and the follow-up `get_tool`. The flag defaults to `True` on the API; the run forms send `False` (#13335).

Save misses the same way. `exact_tools` [defaults to `True`](https://github.com/galaxyproject/galaxy/blob/7e16f446410c5626dc40a034fa537ad72a035db2/lib/galaxy/managers/workflows.py#L825) and `ToolModule.__init__` [passes it as `exact`](https://github.com/galaxyproject/galaxy/blob/7e16f446410c5626dc40a034fa537ad72a035db2/lib/galaxy/workflow/modules.py#L2711-L2713), so the step is [counted as a missing tool and the workflow gets `has_errors`](https://github.com/galaxyproject/galaxy/blob/7e16f446410c5626dc40a034fa537ad72a035db2/lib/galaxy/managers/workflows.py#L1148-L1153); a `{"workflow": …}` body gets a plain success response. The editor, run form and export rebuild modules through `from_workflow_step`, which [forces `exact_tools=False`](https://github.com/galaxyproject/galaxy/blob/7e16f446410c5626dc40a034fa537ad72a035db2/lib/galaxy/workflow/modules.py#L2812), so they find the tool. `GET /api/workflows/{id}` builds no modules and has no `errors` field, so it can't flag this. (Save behavior is read from code, not reproduced.)

`ToolModule.save_to_step` stores the id as given ([`step.tool_id = self.tool_id`](https://github.com/galaxyproject/galaxy/blob/7e16f446410c5626dc40a034fa537ad72a035db2/lib/galaxy/workflow/modules.py#L2854)), and the `ga` export writes `step.effective_tool_id` back out ([L1913](https://github.com/galaxyproject/galaxy/blob/7e16f446410c5626dc40a034fa537ad72a035db2/lib/galaxy/managers/workflows.py#L1913)).

</details>

<details><summary>Reproduction</summary>

Reported in galaxyproject/foundry#591 against a production server, with a one-step `tp_cat` probe workflow uploaded through plain `POST /api/workflows`. With an unversioned `tool_id`, invocation returned 400. Changing only `tool_id` to the versioned guid let the invocation run and its jobs reach `ok`. A larger workflow failed the same way, naming `collapse_dataset`, `kmindex_query`, `lexicmap_search` and `collection_column_join`, even though `GET /api/tools/{versioned-id}` returned each one.

Toolbox-level red check on `dev` (`7e16f446410`), using the two-version shed fixture from `test/unit/app/tools/test_toolbox.py`:

```python
self._init_tool()
self._setup_two_versions_in_config(section=False)
self._setup_two_versions()
unversioned = "github.com/galaxyproject/example/test_tool"
self.toolbox.get_tool(unversioned, tool_version="0.1", exact=False).guid
# 'github.com/galaxyproject/example/test_tool/0.1'
self.toolbox.has_tool(unversioned, tool_version="0.1", exact=True)          # False
self.toolbox.has_tool(unversioned + "/0.1", tool_version="0.1", exact=True)  # True
```

This was checked on the default eager `ToolBox`. The opt-in `CachedToolBox` overrides `has_tool` and was not checked.

</details>

## Context

Reported downstream in galaxyproject/foundry#591 by scottcain. Related to 🔀 #24209, which recently restructured this pre-flight and kept the `exact=require_exact_tool_versions` lookup; the bug predates it. 🔀 #13335 introduced `require_exact_tool_versions` and made the run forms opt out.

## Proposed Approach

Make the pre-flight's exact mode mean "exact version", which is what the flag is called. When `require_exact_tool_versions` is set and the step has a `tool_version`, resolve the tool once without `exact`, accept it only if `tool.version` matches, and reuse it for the compatibility check. A version mismatch keeps today's missing-tool error, so `test_run_workflow_with_missing_tool` (shed `compose_text_param` 0.1.0 installed, step pins 0.0.1) still fails as intended. On save, `ToolModule.__init__` should retry without `exact` on an exact miss and let its existing version check decide, so save stops recording installed tools as missing. The toolbox's `exact` semantics stay unchanged for other callers.

## Alternative Approaches

Normalizing ids on save, or emitting versioned ids on download, would only fix workflows saved or downloaded after the change, and they would change stored or exported data. Rewording the error only makes the failure clearer; the workflow still fails. Fixing the pre-flight covers existing workflows and every client.

<details><summary>Alternatives In Detail</summary>

### Alternative: Normalize `tool_id` to the versioned guid on save

<details><summary>Description</summary>

#### Details

When a module resolves a shed tool from an unversioned id, store `tool.id` instead of the id as given.

#### Why the proposed approach is preferred

Existing stored workflows keep failing. This also changes what gets persisted and later exported, which breaks round-trip expectations for gxformat2/`ga` sources that use unversioned ids on purpose.

</details>

### Alternative: Emit the versioned id from `download?style=ga`

<details><summary>Description</summary>

#### Details

Write `module.get_content_id()` (the resolved `tool.id`) instead of `step.effective_tool_id`.

#### Why the proposed approach is preferred

Only round trips are fixed. A workflow uploaded with unversioned ids still saves fine and fails at invocation, and export stops reproducing what was stored.

</details>

### Alternative: Message-only fix

<details><summary>Description</summary>

#### Details

When an exact lookup misses but a non-exact one finds the same version, say that the `tool_id` is unversioned instead of "not installed".

#### Why the proposed approach is preferred

The diagnostic is better, but a workflow that names the installed tool and version still won't run. Worth doing only if the stricter "exact id" behavior turns out to be intended.

</details>

</details>
