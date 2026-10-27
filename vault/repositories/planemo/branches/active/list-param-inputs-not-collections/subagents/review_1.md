# Review 1 — list-param-inputs-not-collections @ 1e9956a5

Acted on open questions 1, 2 (parameter lists only) and 5: three commits `8ac18ae0`, `a134cdb6`, `129b9a55`, pushed to `jmchilton/list-param-inputs-not-collections` (now `129b9a55`). Didn't act on `[File]`/`[collection]` templates, `directory_uri` templates, the import-time test probe or the set-vs-list helper return.

## Not acted on

- **P3: `[File]` / `[collection]` inputs still template as `{"TODO"}`** (dumped as `!!set`). The right job shape for a multiple-value data input isn't obvious (single File? list of Files that staging turns into an hdca?). Follow-up.
- **P3: `directory_uri` isn't in `SCALAR_PARAMETER_TYPES`.** It's unreachable on gxformat2 0.28.0, but once #202 ships it'll get `{"TODO"}` instead of `todo_param_value`. Add it when the gxformat2 pin is raised.
- **Nit: the module-level `_gxformat2_normalizes_color_and_directory_uri_inputs` probe in `tests/test_galaxy_activity.py`** runs at import time and only catches `ValidationError`. If a future gxformat2 raises something else there, collection fails for the whole module. That's acceptable since it fails loudly.
- **Nit: `_workflow_parameter_input_labels` returns a list.** Adopting galaxy-tool-util's `parameter_input_keys` later only needs `set(labels)` and dropping the pop/`update` in `stage_in` (about 4 lines). The shape is fine as is, so no commit.
- The open questions on dropping `_has_parameter_list`, raising the gxformat2 pin, and push-into-#1744 vs a new PR are John's decisions.
- Fork CI on `129b9a55`: Python CI run 40434086940, queued at handback.

## Verified

- `stage(job=..., job_dir=...)` exists in galaxy-tool-util since 2022 (`b7e1f587cb9`), well under planemo's `>=25.1` floor. The old `job_path` branch did the same `yaml.safe_load` plus `dirname(abspath)`, so behavior is identical.
- Gate: `make lint` green, `tox -e mypy` green (276 files), and `test_galaxy_workflow_utils`, `test_galaxy_activity`, `test_cmd_workflow_job_init` and `test_cmd_workflow_test_init` all pass (33 passed, 1 xfailed). No Galaxy-backed tests were run.

<details><summary>Full review</summary>

**Verdict:** the design is sound and the branch is mergeable after the three fixes below. The PR holds parameter-input values back from staging and splices them into the result. It does that through one helper that reads labels and one shared `input_kind` classifier. The `_has_parameter_list` gate keeps gxformat2 normalization (and #202) off the common path. It maps directly onto the upstream `parameter_input_keys` API when the pin allows.

### Bugs (fixed)

**P2 1: `job_template` / `job_template_with_metadata` raise `KeyError: 'type'` on untyped gxformat2 inputs (implementation verified).** Pre-existing on master; the branch touched these lines. gxformat2 omits `type` for untyped (data) inputs. For example, `wf1.gxwf.yml`'s `input1` made `workflow_test_init` / `workflow_job_init` crash. Both builders now use `.get("type")`, and `input_kind(None)` returns data. The red test `test_job_template_untyped_input_is_data` failed with `KeyError` before the fix. Commit `8ac18ae0`.

**P3 1: multiple-value parameter inputs template as a Python set `{"TODO"}` (implementation verified).** PyYAML dumps it as `!!set {TODO: null}`. These inputs now get a one-element list of the scalar placeholder (`["todo_param_value"]`, or `[False]` for `[boolean]` (probed), or the default when one is set). `test_job_template_input_kinds` was changed from expecting the set to expecting the list. That made it stricter, and it was red first. Commit `a134cdb6`. `_template_input_kind` was restructured in the same commit so it types cleanly with `Optional` input.

### Nits (fixed)

**Typing:** `input_kind` returns `InputKind = Literal["data", "collection", "parameter"]`, and the constants are `Final`. The loop returns the constants explicitly, so mypy narrows, and the "first data or collection wins" semantics are kept. Commit `129b9a55`.

### Nits / follow-ups (not fixed)

These are the items listed under "Not acted on" above.

### Reuse / abstractions

- `input_kind` is now the single data-vs-parameter classifier used by staging and both template builders. Good consolidation.
- `SCALAR_PARAMETER_TYPES` replaces two duplicated literals.
- The remote-workflow path reuses `get_dict_from_workflow` and `workflow_id_for_runnable`, with no new Galaxy client code.

</details>
