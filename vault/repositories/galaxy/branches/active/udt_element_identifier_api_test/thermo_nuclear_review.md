# Thermo-nuclear code quality review debrief (pass 2)

Verdict: approve, no changes made. The new commit `eb7d514521e` is a 3-line carry-over of the identifier across implicit conversion, and it's in the right spot. Earlier pass-1 trims are still in place. No production or test edits, so the SHAs are unchanged: `22568e89198` (baseline), `7fdb7232eba` (fix), `eb7d514521e` (converted input).

Not acted on:
- **Transient-attribute data flow** (`hda.element_identifier`, set in `meta.py:508/544`, persisted at `actions/__init__.py:561`). `eb7d514521e` adds one more hop to this implicit, monkey-patched ORM attribute. The structural fix would carry identifiers per input name through batch expansion, not on the HDA. Not done because:
  - the pattern is pre-existing;
  - the rescope review already deferred it;
  - it would restructure the expansion path, far past a ~35-line fix.
- **Collapse the `process_dataset` if/else into `converted = converted_dataset or data.get_converted_dataset(...)`, then copy the identifier and reassign.** This removes the temp var that spans the reassignment, but the gain is cosmetic. It also rewrites 4 pre-existing lines and would force an API rerun. Not the dramatic simplification the bar asks for.
- **Route the `/api/tools` UDT path through runtimeify and delete the `to_cwl` threading** (carried over from pass 1). This is still the real code-judo move, but it changes behavior for every legacy-path UDT, so it's out of scope.
- **Context object for `to_cwl`'s pass-through kwargs, required `element_identifiers`, per-input keying, dropping kwargs from the DCE recursions:** declined in pass 1. Nothing in the new commit changes that reasoning.
- **`_run_mapped_over_list` lands in `7fdb7232eba` with `tool`/`ext` params that only the third commit uses.** Moving them would take paired fixups to two commits for no behavior change. The history stays coherent.
- **The "Known gap" line in `7fdb7232eba`'s message is closed by the next commit.** That's accurate history, so it's left as is.
- **Shared setup between `test_tool_request_mapped_over_writes_element_identifier` and `_run_mapped_over_list`:** the submit path and the way each finds its implicit collection differ. A helper would save about 6 lines at the cost of indirection.
- **Cheetah converted-input identifier, job-cache P1, plain-dataset null, `{"src":"dce"}` job state:** these follow the scope decisions and are not touched.

<details><summary>Full review</summary>

Scope: `git diff 51e0a80a0db..HEAD`. That's 5 production files (+31/-1) plus tests and populators.

1. **`eb7d514521e` placement: OK.** `process_dataset` is the one place that knows both the original HDA (which holds the transient identifier) and its conversion. The persistence loop at `actions/__init__.py:561` only sees the converted HDA in `inp_data`. Doing it here avoids a parent lookup later. `get_converted_dataset` always returns or raises (`model/__init__.py:5889`), so the setattr can't hit `None`. `is not None` matches the check at :561.
2. **Converted-input coverage on both consumers: verified.**
   - The legacy (`/api/tools`) path: `param_values[input.name]` is replaced with the converted HDA (`actions/__init__.py:~309`). So `to_cwl` sees the converted id, and so does the mapper (keyed from `job.io_dicts()`). This is what the API test exercises.
   - The runtimeify (`/api/jobs`) path: `find_input` resolves the requested original to its conversion. `adapt_dataset` then looks up `hda_entry.id`, which is the converted id. No API test covers the converted case on this path, but the lookup uses the same key.
3. **Transient attribute (structural, not acted on).** See the top. It's the main design debt the commit leans on, and it isn't introduced here.
4. **Pass-1 items** (layering in `UserToolEvaluator.build_param_dict`, `ElementIdentifierMapper.identifiers_by_dataset_id`, normalizing `element_identifiers or {}` once in `setup_for_runtimeify`, keyword args in `tool_request_raw`): all still hold. Nothing regressed.
5. **File size.** `actions/__init__.py` was 1367 lines at base and grows by 3. `evaluation.py` and `modules.py` were already over 1k. `wrappers.py` is at 903. The 1k rule isn't triggered.
6. **Imports and comments:** module-top imports, one-line comments. `black --check` and `uvx ruff check` are clean on all 8 files.
7. **Tests:** the converted test builds a tabular-only variant of `TOOL_WITH_ELEMENT_IDENTIFIER` and uses a csv list. csv isn't a tabular subclass, so this exercises a real `csv_to_tabular` conversion. The assertions are exact dict equality and were not weakened.

</details>

Verification: the unit command (`test_runtime.py`, `test_evaluation.py`, `test_modules.py`, `test_actions.py`) gives 183 passed. black and ruff are clean. With no production change, the API run was skipped.
