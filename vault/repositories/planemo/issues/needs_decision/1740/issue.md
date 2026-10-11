Found in [Marius’s review of #1724](https://github.com/galaxyproject/planemo/pull/1724#pullrequestreview-5478947695). This is an existing invocation-test-generation bug, independent of that PR’s filename sanitization/collision fixes.

### Problem and impact

[`_job_outputs_template_from_invocation`](https://github.com/galaxyproject/planemo/blob/48725d692ee3371ace6a042b70ec3dc84a3b0ba6/planemo/galaxy/workflows.py) calls `_elements_to_test_def(..., definition_style="outputs")`, but the helper only applies `elements[:1]` when `definition_style == "output"`. Every value other than `"input"` still builds an output dictionary, so the invalid spelling is accepted and the mismatch is easy to miss.

Consequently, `planemo workflow_test_init INVOCATION_ID --from_invocation --galaxy_url URL --galaxy_user_key KEY` downloads and adds expectations for **all output-collection leaves**, while the helper’s explicit output mode samples the first element at every collection level. Large invocation outputs can therefore produce unexpectedly many downloads, large test-data directories, and large generated test definitions. This is a download/template-size problem; the mismatch alone does not demonstrate wrong dataset contents.

The inconsistency was introduced in [6a9eebc59207fa0cb77a4b6f394db09dcc1df028](https://github.com/galaxyproject/planemo/commit/6a9eebc59207fa0cb77a4b6f394db09dcc1df028) in June 2022. The preceding implementation explicitly selected the first element for generated output checks. The same refactor added the helper’s singular `"output"` branch and its plural `"outputs"` caller.

### Reproduction evidence

Reproduced against current master `48725d692ee3371ace6a042b70ec3dc84a3b0ba6` and #1724 head `4ba96f396f0a1e870322b16213fe0022a16c89d3`, through the real `output_stubs_for_workflow(..., from_invocation=True)` entry point with controlled Galaxy API responses and a download recorder. No live Galaxy was started and no actual datasets were downloaded.

| Fixture | Actual invocation-output downloads | Explicit `definition_style="output"` downloads | Input downloads |
| --- | --- | --- | --- |
| Flat list with three datasets | 3 | 1 | 3 |
| `list:paired` with two pairs | 4 | 1 | 4 |

The generated YAML-equivalent output dictionaries include every leaf in the actual path. Input collection generation correctly retains all elements and must continue doing so.

Existing helper tests call the singular spelling directly and use one-element collections, so they cannot expose the production caller’s mismatch or verify sampling cardinality. The external-Galaxy command test is currently skipped.

### Follow-up

- Decide the output sampling policy explicitly: retain historical first-element sampling, generate all expectations intentionally, or expose an option. In particular, decide whether selecting a paired collection should preserve both mates: the current singular mode takes only the first mate too. Changing only `"outputs"` to `"output"` changes generated assertion coverage as well as download count, so that behavior should be intentional and documented.
- Use one validated definition mode (for example a `Literal`/enum plus a runtime check), keeping formatting mode separate from sampling policy if necessary. An invalid string should not silently mean output mode.
- Add a regression through invocation output generation with multiple members and nested/paired collections, checking both generated expectations and download calls. Include input collections and empty collections as controls. Avoid testing only the helper with a single element.

This issue tracks a separate fix and policy clarification; it is not a new regression caused by #1724.
