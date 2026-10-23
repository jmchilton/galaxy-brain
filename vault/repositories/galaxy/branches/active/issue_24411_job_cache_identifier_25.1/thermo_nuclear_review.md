# Thermo-nuclear review debrief: issue_24411_job_cache_identifier_25.1

The verdict is to approve with two small cleanups, and I made both in the fix commit. The `|__identifier__` key in `_build_stmt_for_hda` is now built once and shared by the identifier branch and the new NOT EXISTS guard. `element_identifier` also gets a one-line comment on why it sets `consumes_names`. I did not act on anything structural: the brief keeps JobSearch refactors off this 25.1 bug-fix branch, so they're listed below as follow-ups. New head: `9159432b81e` (baseline `070071429f7` unchanged). The 5 `test_cached_job_*` API tests pass, and black, ruff 0.13.3, isort and flake8+bugbear are clean on the changed files. Pushed to `jmchilton`.

Not acted on, with the reason:
- **Unify the "name or identifier the job saw" predicate.** Today the cached-job check is spread over `name_condition`, the identifier join and the new NOT EXISTS. That's a JobSearch restructure, so it's a follow-up.
- **The `"|__identifier__"` literal appears at about 6 sites in `managers/jobs.py`.** A module constant or `identifier_param_name(k)` helper would remove them, but this branch should stay small, so it's a follow-up.
- **`consumes_names` is now misnamed.** It really means "output depends on the name or the identifier". Renaming it on a stable branch is churn, so it's a follow-up.
- **The NOT EXISTS is repeated per value index, and multi-value `input11|__identifier__` keys are ignored.** Both are already logged in the normal review and the initial debrief.
- **File size.** `jobs.py` (1925 to 1929 lines) and `test_jobs.py` were already over 1k lines on the base, so the 1k rule doesn't apply.

<details><summary>Full review</summary>

**Verdict:** approve. No structural regression. There's no plausible code-judo move that fits a minimal 25.1 fix, and no file crosses 1k lines because of this branch.

**Bugs:** none.

**Change applied (fix commit, squashed via fixup):**

```diff
+        identifier_key = f"{k}|__identifier__"
         if identifier:
             stmt = stmt.join(d)
             data_conditions.append(
                 and_(
-                    d.name == f"{k}|__identifier__",
+                    d.name == identifier_key,
 ...
-            data_conditions.append(~exists().where(f.job_id == model.Job.id, f.name == f"{k}|__identifier__"))
+            data_conditions.append(~exists().where(f.job_id == model.Job.id, f.name == identifier_key))
```

```diff
         if self.tool_evaluator:
+            # Keeps the job out of the name-agnostic job cache search.
             self.tool_evaluator.consumes_names = True
```

**Structural assessment:**
- **`managers/jobs.py` guard.** It sits in the existing `elif require_name_match` branch next to the matching name conditions. That's the right layer and not a scattered special case. The two branches are now visibly symmetric: if the request has an identifier, the job must carry that same identifier; if it doesn't, the job must have none. The single-letter alias `f` follows the function's `a`..`e` convention.
- **Code-judo opportunity (follow-up).** The real invariant is "the label the cached job's tool saw for input `k` equals the label this request would show". That label is the identifier when one is recorded, and the dataset name otherwise. Today the predicate is assembled from three pieces: `name_condition`/`hda_history_join_conditions` (name), an inner join on `d` (identifier present) and the new NOT EXISTS (identifier absent). One `_label_match_conditions(k, identifier, require_name_match)` helper that returns the join and the WHERE clauses would turn this into a single concept. Recording `__identifier__` for every data input would be more ambitious: it would let name and identifier matching merge completely. Both are JobSearch restructures and out of scope here.
- **`"|__identifier__"` key spread.** The literal is built ad hoc at `managers/jobs.py` 561, 589, 595, 648, 754 and 763, and also in the actions and wrappers layers. A shared helper would make the coupling between the writer (`actions/__init__.py`) and the reader (JobSearch) explicit. Follow-up.
- **`tools/wrappers.py`.** Setting the flag on every `element_identifier` read is the minimal, correct place. The fallback path sets it a second time through `__getattr__("name")`, which is harmless. `consumes_names` now means "consumes the name or the identifier", so a rename such as `consumes_input_labels` is worth doing on dev. Model-level `DatasetCollectionElement.element_identifier` reads (wrappers.py 379, 587) don't go through the property, so name-agnostic tools aren't flagged by accident. The `cat1` baseline test confirms this end to end.
- **Tests.** The helpers sit between tests in the middle of the class, which matches how this file is already laid out. `_mapped_inputs` is a module-level function, the only one in the file. It's acceptable but could be a class helper. The last-word output parsing has a comment explaining it is there for forward compatibility. `_list_of_existing_dataset` is an awkward name, since it builds a one-element list whose identifier differs from the dataset name. Something like `_list_with_relabelled_dataset` would read better, but I left it because it's a nit.
- **File size.** Both touched source files were already over 1k lines on the base, so the 1k rule isn't triggered. `wrappers.py` is 862 lines.
- **Types and boundaries.** No new casts, optionals or ad-hoc shapes.

</details>
