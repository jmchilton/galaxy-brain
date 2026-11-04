Run via claude-opus at medium effort.

## General

- [x] What does the user see when it fails? An HTTP 400 naming each missing tool. For exact-version requests it also lists the installed versions, e.g. `… not installed: compose_text_param (version 0.0.1, installed: 0.1.0)`.
  <details>

  - The invocation pre-flight still raises `MessageException` with the same "Workflow was not invoked; the following required tools are not installed: " prefix. `_describe_missing_tools` adds `, installed: …` only in exact mode, and only when at least one version the user can access (`allow_user_access`) is installed under that id or its lineage. Non-exact messages, and ids with nothing installed, read as before.
  - The incompatible-tools 400 is unchanged.
  - New edge case: if `has_tool` is true but `get_tool` returns None, the tool is now reported missing. Before, it was silently skipped. This can't happen on the eager toolbox.
  - Save: an unversioned guid or short id at an installed version no longer gets the "This workflow contains missing tools" error.
  - The error is asserted exactly by `_assert_missing_tools` and by `test_exact_workflow_invocation_reports_missing_tool_version`.
  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Both run on the real two-version shed toolbox fixture with no mocks, and they assert outcomes, not calls.
  <details>

  - `test_exact_lookup_matches_tool_id_not_version` pins the existing rule that `exact` means exact id, which the fix depends on.
  - `test_get_tool_at_version` covers the unversioned guid, a versioned guid asked for a sibling version, the short id, an uninstalled version (no fallback to the newest) and an unknown id.
  - The behavior is also pinned end-to-end by integration tests on both the eager and cached toolboxes. Without the fix, each of those fails at its own assertion (see `test_challenges_debrief.md`).
  </details>
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `99f05078e1b` comes first and passes on upstream `lib`, followed by the behavior-preserving refactor `215a1c4bb06`, the fix `e389973cc5e` and the message change `0e76ac8e20b`.
- [x] Are the comments free of excess archeology? Yes. Some docstrings run long.
  <details>

  None of the comments describe earlier code or bugs. A few go past the one-line style:
  - The `get_tool_at_version` docstring is four lines and contrasts it with `get_tool(exact=True)`.
  - The `_describe_missing_tools` docstring justifies the change ("so a version mismatch isn't mistaken…").
  - The `ToolModule.__init__` and `_find_workflow_tool` comments both restate "`exact` means exact tool id".

  These could be trimmed to one line each, but none is archeology. The "Availability comes from has_tool…" comment was moved unchanged from upstream.
  </details>
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## Workflow-related

- [x] Which existing workflows change behavior (if any)? Workflows whose step names a Tool Shed tool by an unversioned guid or short id, with an installed `tool_version`. With `require_exact_tool_versions` (the API default) they now invoke instead of failing with a 400, and saving them no longer flags the tool as missing.
  <details>

  - Invocation: `_find_workflow_tool` falls back to `get_tool_at_version` after an exact-id miss when a version is given and there's no uuid. The job runs the versioned guid (asserted: `…/compose_text_param/0.1.0`).
  - Save/update: `ToolModule.__init__` gets the same fallback, so `has_errors` / missing-tool is no longer set. `tool_id` is still stored as given, not rewritten.
  - On the eager toolbox, short ids at an installed version now pass exact checks. `CachedToolBox` already allowed this.
  - Exact-version requests for versions that really are missing still return 400, and a non-exact lookup that would fall back to another version doesn't apply here. The error text gains the `installed: …` suffix, so clients that match `err_msg` exactly will see different text. Three existing assertions were updated.
  - Run forms and the editor send `require_exact_tool_versions: false` or use `exact_tools=False`, so they're unaffected. The job handler and `tool_for_job` keep their `exact` semantics.
  </details>
- [x] Who hits this in practice and what is the evidence? API clients (planemo, BioBlend, deploy scripts) invoking stored workflows whose steps use unversioned shed ids. It was reported in galaxyproject/foundry#591 against a production server.
  <details>

  - A one-step `tp_cat` probe uploaded through `POST /api/workflows` returned 400 with an unversioned `tool_id` and invoked once the id was versioned.
  - A larger workflow failed the same way for `collapse_dataset`, `kmindex_query`, `lexicmap_search` and `collection_column_join`, even though `GET /api/tools/{versioned-id}` returned each one.
  - The toolbox-level red check is in #24722.
  - The UI hides the problem: run forms and the editor resolve these ids, and a `ga` download keeps the stored id, so round trips don't fix it.
  </details>
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes. Changing `get_tool(exact=True)` itself, normalizing ids on save and emitting versioned ids on export were all considered and rejected.
  <details>

  From `scope_evaluation.md`:
  - **Make `get_tool(exact=True)` match lineage at the requested version.** This is the root-cause fix and the simpler end state. It changes every exact caller (job handler, `tool_for_job`, tool tests), and upstream comments warn it breaks built-in tool tests. The eager and cached toolboxes would also need aligning. Deferred as a `dev` follow-up.
  - **Normalize `tool_id` to the versioned guid on save.** Doesn't fix stored workflows, changes persisted and exported data, and breaks intentional unversioned round trips.
  - **Emit versioned ids from `download?style=ga`.** Redundant once invocation accepts unversioned ids, and the export would no longer reproduce what was stored.
  - **Fix only, without the installed-versions message** (alt branch `…_alt_original_scope`). Kept as an alt. Without the message, a true version mismatch still reads as "not installed", which is the issue's complaint.
  - **Reuse:** `get_tool_at_version` is built on existing `get_tool` lineage resolution, so it adds no new lookup machinery. The `exact and version and not uuid` guard is duplicated at two call sites (accepted in the thermo-nuclear review).
  </details>
