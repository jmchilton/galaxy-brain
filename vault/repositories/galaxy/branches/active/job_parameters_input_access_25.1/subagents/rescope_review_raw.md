# Re-scope review (raw)

Head `b99722771bf`, base `origin/release_25.1`. Focus: `43343df0905` (predicate on `GalaxyRBACAgent`), `b99722771bf` (tool-form option placeholder), `test_rerun_form_*`.

## Verdict

**Ship-able; no blocking bugs.** The re-scope does what scope B asked. The predicate lives in one place on the RBAC agent, `summarize_job_parameters` and both `to_dict` methods route through it, and the check runs only on leftover job values, not on the in-history match loop. Tests are exact and should go red without the fix. Below: one design divergence worth a line in the PR, then nits. A sensitive note was written separately.

Checks run: `test/unit/app/tools/test_parameter_parsing.py`, `test_data_parameters.py`, `test/unit/app/managers/test_markdown_export.py` (73 passed); `mypy` on `security.py`, `basic.py`, `jobs.py` is clean. API tests were not run (the coordinator runs them).

## Bugs

None found.

## Design notes / divergences (decide, don't necessarily change)

1. **Leaf DCE: the form rule is stricter than the execution rule.** `can_access_data_input` treats a leaf DCE as accessible only with its whole parent collection, which matches `dce_content`. Tool execution (`tools/actions/__init__.py` `process_dataset`, `data = getattr(data, "hda", data)` then `can_access_dataset(data.dataset)`) checks only the element's own HDA. In `test_rerun_form_inaccessible_leaf_dce_option` (public element, private sibling), the form shows "(not accessible)", but submitting that option runs successfully. That is consistent with the `parameters_display` choice and not harmful. Still, the coordinator's expectation that rerunning with the value fails at submission holds for HDAs and for collection inputs (whole-collection `dataset_action_tuples` check). It does **not** hold for leaf DCEs whose own dataset is public. Worth a sentence in the PR description.
2. **HDA placeholder submission** fails with `ItemAccessibilityException` (403) as expected. The client keeps the option selectable (`value` = `{id, src, ...}`), so the failure surfaces at submit, not at form load. Acceptable.
3. **LDDA (`append_ldda`) left unfiltered: agree.** `summarize_job_parameters` has no LDDA branch (it falls to the `raise Exception` else), so the two views were never symmetric for LDDA. Library items have their own rule (`can_access_library_item` / library access plus dataset access). Folding LDDA into `can_access_data_input` would silently pick one of the two rules. Leave it as a follow-up if anyone cares.
4. **Name/home.** `GalaxyRBACAgent.can_access_data_input(user_roles, item)` is fine. It sits next to `can_access_dataset` / `can_access_collection`, takes roles like its siblings, keeps the admin bypass at call sites (matching the `tools/actions` style), and the `Union[HDA, HDCA, DCE]` annotation is accurate. "data_input" is slightly tool-centric for a model-layer method. `can_access_history_item` would read more generally, but it would also suggest LDDA-like breadth, so the current name is defensible.

## Domain questions answered

- **Only the leftover items are checked.** The new check is in the `for hda in hda_list` loop (items not matched into the current history), in `append_dce`, and in `DataCollectionToolParameter`'s single-DCE append. The `history.active_visible_datasets_and_roles` match loop and the HDCA match loop are untouched.
- **Perf.** The cost is one `can_access_dataset` per leftover HDA (permissions backref query) and one `dataset_action_tuples` per DCE collection. That property is memoized on the `DatasetCollection` instance (`_dataset_action_tuples`), so repeated DCEs from the same collection cost one query. `WorkRequestContext.get_current_user_roles` caches roles. Leftover lists are tiny (job inputs only). No concern.
- **`trans` capability.** `to_dict` gets the `proxy_work_context_for_history` `WorkRequestContext` (a `ProvidesHistoryContext`), which has `user_is_admin` and a cached `get_current_user_roles`. For an anonymous user, roles are `[]`, so only public items pass, which is correct. In workflow editor mode (`workflow_building_modes.ENABLED`), `to_dict` returns before options are built, so the check is never reached. `USE_HISTORY` (workflow run form) and `POST /api/tools/{id}/build` with posted state also hit the leftover loop and now get the same contract, which is a bonus.
- **Other fields of the tool model.** `tool_dict["value"]` is `{id, src}` only (`history_item_to_json`). `text_value` goes through `DataToolParameter.to_text` on a dict, which raises inside the try and yields "No dataset.". So the placeholder isn't undone elsewhere in the same response.
- **Client.** `FormData.vue:233` labels options as `${hid}: ${name}`, giving "-1: (not accessible)". That matches the existing `DataCollectionToolParameter` DCE options, which already use `hid: -1`, so it's not a regression, just not pretty. `-1` is truthy, so the `"Selected"` fallback at :437 doesn't apply. `keep: True` keeps it in the keep-option cache. Its value stays a valid `{id, src}` selection.
- **Tests: sound.** With an API key there's no current history, and `Tool.to_json` falls back to `get_owned(job.history)`, which would reject a third party. Using `_browser_session` plus `history/current_history_json` gives the viewer an empty current history, so every job input becomes a leftover. That's deterministic, and reusing the same viewer email across tests is harmless because that user's history never receives content. Assertions are full-dict equality, and without the fix they would see `"(unavailable) <name>"` / the element identifier, so they go red. I didn't execute the red run; the debrief/coordinator should confirm.
- **Merge-forward.** `origin/dev` (fetched now) has no `accessible_dataset_ids` in `lib/`. The compare_runs work must still be on an unmerged branch. Expect at most an adjacent-hunk conflict in `security.py` imports and the method block once it lands. Trivial.

## Nits

1. **Duplicated placeholder string.** `markdown_util._data_input_text` returns the literal `"(not accessible)"` while `basic.py` defines `INACCESSIBLE_DATA_INPUT_NAME`. One constant would keep the two views in lockstep. `markdown_util` doesn't import `galaxy.tools` today, so a neutral home is better than `basic.py`. `galaxy.model.security`, next to the RBAC method, is one option.
2. **Inline HDA placeholder dict duplicates `append`.** Calling `append(d["options"]["hda"], hda, INACCESSIBLE_DATA_INPUT_NAME, "hda", True)` would almost work, except `hid` and `tags` would come from the HDA. A small `inaccessible` flag on `append` (hid -1, empty tags), or a helper shared with `append_dce`, would remove the 10-line literal.
3. **Untyped module helpers.** `can_access_data_input(trans, item)` and `data_input_option_name(trans, item, name)` could take `trans: ProvidesUserContext` and the same `Union` as the agent method. That's cheap, and mypy is clean either way.
4. **Two predicates named `can_access_data_input`** (the module function in `basic.py` with an admin bypass, and the agent method without one) read the same at call sites. Consider renaming the `basic.py` one (e.g. `_user_can_access_data_input`) or giving the agent method an `is_admin` flag, mirroring `DatasetManager.is_accessible`, so `jobs.py` and `basic.py` share the bypass too.
5. **`is_dataset` is still emitted for inaccessible DCEs.** It reveals only leaf vs nested, which is structural. Fine to keep for client typing.
6. **`_browser_session` docstring** still says "For legacy controller routes outside /api". It is now also used for session-scoped `/api` calls. Consider a one-word tweak.
7. **Test gap (optional).** No third-party test where the input *is* accessible (e.g. public HDA, viewer via session) shows the real name. The owner baselines exercise the same code path, so this is low value. It would pin that the session path doesn't over-filter.

## Reuse / abstraction

Good outcome: the closure became a reusable agent method with two consumers, and the "DCE → `child_collection or collection`" rule now lives in one place. `DatasetCollectionsService.dce_content` still inlines the same rule. Switching it to `can_access_data_input` is a natural follow-up (dev, or here if it's a one-liner; it wasn't touched in this branch).
