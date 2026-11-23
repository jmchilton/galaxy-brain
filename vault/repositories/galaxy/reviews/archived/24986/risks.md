Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: be2b1655fc6b933f47ca7e41aa0ea308cccfd3b7

This PR is mostly a two-way door, but it adds a new `in.<name>.default` block to every step in the editor workflow JSON and a `default_location` field on run-form inputs, and it changes how existing workflows with data-input defaults validate at runtime. Clients and saved workflows may come to depend on those choices, which would make them hard to undo.

<details><summary>Risk Details</summary>

- `style="editor"` downloads now include `step["in"]` for any step with a set input default, tool steps as well as inputs. The editor (and anything else that round-trips editor JSON through the update API) now carries this shape, and the server reads it back on save.
- The `style="run"` model adds `default_location` to data inputs and forces `optional: true` and `value: null` when a File default with a `location` exists. Run-form clients may rely on this contract.
- In `InputDataModule.get_runtime_inputs`, any data input with a default now gets `optional=False` on its runtime `DataToolParameter`, even if the author marked it optional. This affects existing workflows that already declare defaults (e.g. via gxformat2), not only ones authored in the new editor field. The run model reports the opposite (`optional: true`), so the two layers now disagree on purpose.
- The editor writes `{class: File, location}` and keeps other keys from an earlier File default. Authors can now create URL/file-source defaults from the GUI. Those defaults get stored in workflows, exported, and shared, which is behavior other people's workflows will depend on.
- Only File defaults that have a `location` get the run-form treatment. Other default shapes (collections, `path`, inline contents) still use the old preselect behavior, so the UX is inconsistent.
- The UI changes ("Use default file" in place of "Nothing selected", a status box, and simple-form help that now joins the annotation and input help) are visible but self-explanatory, so they are two-way.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether the `in.<name>.default` editor JSON shape and the run-model `default_location` / forced-`optional` fields are the contract Galaxy wants to keep. That matters most next to gxformat2's existing `default` semantics and the workflow-state/schema work, because duplicating or diverging from those would be costly to reverse.

The `optional=False` override in `modules.py` needs a look at how it affects already-published workflows that combine `optional: true` with a default. Check whether an omitted input now always resolves to the default, and whether an explicit "nothing" can still be expressed.

</details>
