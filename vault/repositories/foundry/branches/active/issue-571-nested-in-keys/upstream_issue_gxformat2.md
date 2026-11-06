# Draft issue for `galaxyproject/gxformat2`

Not filed. Reproduce once against a live Galaxy first; the conversion results below come from calling `python_to_workflow` directly.

---

**`validate_draft` and conversion resolve map-form step references differently when a step has a `label`**

For a map-form step whose `label` differs from its key, `gxformat2.draft.validate_draft` (and `gxwf draft-validate`) resolves a `source` or `outputSource` by the map key and rejects a reference by label as `references unknown step`. `python_to_workflow` does the reverse: a reference by label converts, and a reference by key raises `ValueError: invalid literal for int() with base 10: '<key>'`. Reproduced on 0.28.0 and 0.29.1. No reference to such a step passes both.

`gxwf draft-validate --concrete` 1.15.0 reports OK on the key form, and `gxwf convert` emits `id: null` for the connection instead of an error.

```yaml
class: GalaxyWorkflowDraft  # GalaxyWorkflow for conversion
inputs: {inp: {type: data}}
outputs: {o: {outputSource: the_key/out_file1}}
steps:
  the_key:
    label: the_label
    tool_id: cat1
    tool_version: 1.0.0
    in: {input1: {source: inp}}
    out: [out_file1]
```

Expected: validation and conversion accept the same references. Conversion should also report an unresolved reference by name rather than through `int()`.
