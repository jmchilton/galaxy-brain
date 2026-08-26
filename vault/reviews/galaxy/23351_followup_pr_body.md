Follow-up to #23351, which made `select multiple="true"` optional by default in the parameter
model. That fix was right — `galaxy.xsd` already documented the rule ("Defaults to `false`
except when the `type` attribute value is `select` and `multiple` is `true`") and
`SelectToolParameter` has read `parse_optional(self.multiple)` since 2013. But the model layer
derives `optional` in eleven independent places, and reviewing that PR turned up two more
sites that had drifted from runtime the same way.

## The divergences

**`genomebuild`** — `GenomeBuildParameter` subclasses `SelectToolParameter`, so at runtime it
inherits `parse_optional(self.multiple)`. The model called `parse_optional()` bare and read
`multiple` on the very next line. `genomebuild multiple="true"` therefore modelled as required
while the runtime treated it as optional. This is the same bug #23351 fixed, five lines away in
the same function.

**`drill_down`** — the branch never called `parse_optional` at all, and `_common_param_kwargs`
only carries `label`/`help`, so an explicit `optional="true"` was silently dropped and the model
fell back to the base default of `False`. `DrillDownParameterModel` also never consulted
`optional`, so this wires it into `py_type` and `request_requires_value`.

Note the asymmetry: for `drill_down`, `multiple` does **not** imply optional.
`DrillDownSelectToolParameter.__init__` calls `ToolParameter.__init__` rather than
`SelectToolParameter.__init__`, so it reads a bare `parse_optional()` with no multiple-derived
default. The fix matches that rather than copying the select rule.

No tool in the tree sets `drill_down optional="true"`, so that half cannot regress an existing
tool — `gx_drill_down_exact_optional.xml` is added to exercise it.

## Coverage gaps from #23351

Measuring what that one-line change actually altered — 9 state representations × 4 value shapes,
run with the commit applied and reverted — showed the affected states were narrower than the
title suggests. `request`, `request_internal`, `landing_request`, `job_internal`, `job_runtime`,
`workflow_step` and `workflow_step_linked` are byte-identical for a plain multiple select,
because those paths already read `self.optional or self.multiple` and `request_requires_value`
returns `False` unconditionally. What actually moved:

- `test_case_xml` / `test_case_json` `null`, for every multiple select — the widest-reaching
  change, and it had no spec cases. Added.
- `request::null` for the `no_options`-bearing tool, which is where the real bug was. It flips
  there but not for the single-select sibling, so that surface is worth asserting. Added.
- `gx_select_multiple_no_options_validation` had no execution coverage at all. It now rides the
  existing multi-select test, following how `gx_select_optional_no_options_validation` is stacked
  onto the single-select test 15 lines above.

Also restores a comment #23351 deleted rather than answered — the `workflow_step_valid` question
is about `py_type_workflow_step` being unconditionally optional, which is a separate issue from
optional-by-default.

## Drive-by

`gx_genomebuild_multiple`'s spec values read `["hg18", hg19"]` — a missing opening quote, three
times, which YAML parses as the string `hg19"`. Fixed.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

Both fixes are red-to-green against the new unit assertions in `test_input_models.py`.

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
