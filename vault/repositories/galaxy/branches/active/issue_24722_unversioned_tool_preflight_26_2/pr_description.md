Fix 🎯 #24722 - exact-version API invocation rejects installed Tool Shed tools whose step `tool_id` is unversioned.

| Step reference (`tp_cat`, `tool_version: 9.11+galaxy0` installed) | Before | After |
| --- | --- | --- |
| `…/devteam/text_processing/tp_cat` → `POST /api/workflows/{id}/invocations` | ❌ 400 "required tools are not installed" | ✅ invokes |
| same → `PUT /api/workflows/{id}` (update) | ❌ 400 "This workflow contains missing tools" | ✅ saves, id stored as given |
| `…/tp_cat/9.11+galaxy0` (versioned guid) | ✅ | ✅ unchanged |
| any id pinned to a version that isn't installed (e.g. `0.0.1`, `0.1.0` installed) | ❌ 400 "… (version 0.0.1)" | ❌ 400 "… (version 0.0.1, installed: 0.1.0)" |

Galaxy accepts and stores unversioned ids, and the editor, UI run form and `ga` download all resolve them, so the workflow looks fine until an API client (planemo, BioBlend, deploy scripts) runs it with the default `require_exact_tool_versions=True`. Then the error sends people to check an installation that is fine. This was hit on a production server (galaxyproject/foundry#591).

***`exact` still means exact version: the step must name a version, that version must be installed, and the lookup never falls back to another version.*** ***Stored `tool_id`s, exports and job-side `exact=True` lookups are unchanged.*** ***The only message change is the `installed: …` note (the alt branch below drops it), and short ids now pass the same exact-version check `CachedToolBox` already applied.***

<details><summary>How it works</summary>

`ToolBox.get_tool(exact=True)` means exact *tool id*, so an unversioned shed guid or a short id misses before the version is ever compared. The new `AbstractToolBox.get_tool_at_version(tool_id, tool_version)` tries the exact id, then a lineage lookup, and accepts the result only at the requested version. Two callers fall back to it after an exact miss when the step gives a `tool_version` and no uuid:

- the invocation pre-flight (`_check_workflow_tools`, through a new `_find_workflow_tool` helper), and
- `ToolModule.__init__`, which every `exact_tools=True` path (create, update, embedded subworkflows) goes through.

When a version really is missing in exact mode, the 400 now lists the versions installed under that id that the user may access. Non-exact messages, and ids with nothing installed, are unchanged.

Short ids at an installed version now pass exact-version checks on the eager toolbox too; `CachedToolBox` already allowed this.

</details>

## Risks

This changes which workflows the API will invoke with exact versions, a behavior workflow authors may come to rely on, but it only accepts references whose named version is installed, so it's close to a two-way door.

<details><summary>Risk Details</summary>

- Workflows that failed exact-version invocation with an unversioned or short id now run, at exactly the named version. Nothing that ran before stops running.
- An eager-toolbox short id shared by two repositories pools their versions and resolves to the first one registered (exact id is tried first to limit this).
- The exact-mode "not installed" 400 text gains an `installed: …` suffix. Three test assertions were updated; clients parsing that text could notice.
- In the pre-flight, `has_tool` true but `get_tool` returning `None` is now reported missing instead of skipped. Impossible on the eager toolbox; on `CachedToolBox` it means an indexed tool that fails to load.
- Under `CachedToolBox`, a self-contradictory reference (an installed `…/0.1` guid with `tool_version: 0.3`) lists only that guid's versions in the `installed:` note. The note is incomplete there, never wrong.

</details>

<details><summary>Risk Review Advice</summary>

Check `get_tool_at_version` in `tool_util/toolbox/base.py`: the `tool.version == str(tool_version)` guard is what keeps exact mode exact. Then check that the two fallbacks only fire for `exact and tool_version and not tool_uuid`.

The root-cause fix, making `get_tool(exact=True)` match by version through lineage, would remove `get_tool_at_version` and both fallbacks, but it changes every exact caller (job handler, `tool_for_job`, tool tests) and both toolboxes, so it's left as a `dev` follow-up.

</details>

## Context

Base is `release_26.2`: the bug goes back to 25.1, but #24209 restructured `_check_workflow_tools` on 26.2. Alternative kept on 🌿[`issue_24722_unversioned_tool_preflight_26_2_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24722_unversioned_tool_preflight_26_2_alt_original_scope) - the fix without the `installed: …` note, so a real version mismatch keeps the original 400 text. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep: the branch covers every entry point the issue names, after one recommended expansion.</summary>

Every `exact_tools=True` workflow path goes through `ToolModule.__init__`, so no sibling site is left unfixed. The first evaluation recommended naming installed versions in the 400, which was taken; the original scope is kept as an alt. Rejected or deferred: `get_tool(exact=True)` matching by version (`dev`), normalizing ids on save, versioned ids in `ga` export, missing tools in the save response (separate API change), complete cached-toolbox lineage listing (edge case). Can be split into baseline+refactor and fix PRs if preferred.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24722_unversioned_tool_preflight_26_2/scope_evaluation/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>One behavior-preserving commit extracts <code>_find_workflow_tool</code> from the pre-flight.</summary>

`215a1c4bb06` sits between the baseline tests and the fix, so the fix's `services/workflows.py` diff is a four-line fallback. Final tree byte-identical to the pre-refactor head.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24722_unversioned_tool_preflight_26_2/baseline_refactor/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>All tests kept; repeated invoke/400 assertions folded into one helper in the baseline commit.</summary>

Unit tests use the real two-version shed fixture with no mocks. Integration tests fail on the base at their own assertions. `_assert_missing_tools` now holds the invoke/400/`err_msg` check, so the message change only edits expected strings. Nothing dropped.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24722_unversioned_tool_preflight_26_2/test_challenges_debrief/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>One P2 confirmed and recorded as a known limitation.</summary>

Under `CachedToolBox`, a self-contradictory reference (installed `…/0.1` guid with `tool_version` 0.3) lists only that guid's versions in the `installed:` note. Incomplete, never wrong; fixing it means parsing guids on an error path.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24722_unversioned_tool_preflight_26_2/codex_review/). Run via gpt-6.1-sol.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Acted on both structural findings in <code>services/workflows.py</code>.</summary>

The pre-flight's three-way lookup moved into `_find_workflow_tool`, and the installed-versions logic became a dedicated `_describe_missing_tools` instead of an optional parameter on the shared helper. Not acted on: `get_tool(exact=True)` matching by version (`dev` follow-up), the duplicated `exact and version and not uuid` guard (two short call sites with different surroundings).

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24722_unversioned_tool_preflight_26_2/thermo_nuclear_review/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All 9 general and workflow items pass.</summary>

- [x] What does the user see when it fails? An HTTP 400 naming each missing tool; exact-version requests also list installed versions, e.g. `compose_text_param (version 0.0.1, installed: 0.1.0)`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Real two-version shed toolbox fixture, no mocks, outcome assertions.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `99f05078e1b` comes first and passes on the base.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? Steps naming a shed tool by unversioned guid or short id at an installed `tool_version` now invoke under exact versions and save without a missing-tool flag.
- [x] Who hits this in practice and what is the evidence? API clients invoking stored workflows; reported against a production server in galaxyproject/foundry#591.
- [x] Were simpler or existing approaches considered? Yes. Changing `get_tool(exact=True)`, normalizing ids on save and versioned `ga` export were considered and rejected or deferred.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24722_unversioned_tool_preflight_26_2/pr_checklist/). Run via claude-opus at medium effort.

</details>

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- Integration (`test/integration/test_workflow_invocation.py`, eager and cached toolboxes): `test_run_workflow_with_unversioned_shed_tool_id`, `…_exact_version` and `…_wrong_version` cover invocation; `test_update_workflow_with_unversioned_shed_tool_id` covers update (`PUT`, through `ToolModule.__init__`). The baseline tests come first and pass on the base branch; the exact-version ones fail there at their own assertions.
- Unit (`test/unit/app/tools/test_toolbox.py`): `test_exact_lookup_matches_tool_id_not_version` pins the existing `exact` semantics; `test_get_tool_at_version` covers sibling versions, short ids, an uninstalled version (no fallback) and an unknown id.
- `test_run_workflow_with_missing_tool`, `…_wrong_version` and `test_tool_source_storage.py::test_exact_workflow_invocation_reports_missing_tool_version` expect the new `installed:` suffix.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
