Fix 🎯 #19325 - document `value_json="null"` and `value_json="[]"` for unset and empty selects in tool tests, instead of `value=""`.

The tool XSD tells authors to write `value=""` in a test when no option should be selected. Test-case validation rejects that. In #19325 it rejected augustus's `outputs` (a multiple select) with `Input should be 'protein'`, and the issue settled on `value_json="null"` instead. The docs still teach the form that fails:

| Test `param` | Docs before | Docs after | What Galaxy does |
| --- | --- | --- | --- |
| `value=""` on an optional single select | ✅ recommended | 🚫 explained | Lint warning before 24.2; fails validation from 24.2 (`Input should be '…'`) |
| `value=""` on a multiple select (#19325) | ✅ recommended | 🚫 explained | Runs as an empty list before 26.1; lint warning before 24.2, lint error from 24.2; rejected at runtime from 26.1 |
| `value_json="null"` | — | ✅ unset optional select (single or multiple) | Sends `null` |
| `value_json="[]"` | — | ✅ empty multiple select | Sends `[]` |
| param omitted | — | ✅ use the input's default | Sends nothing; `selected="true"` options apply |

✅ documented as the way to do it · 🚫 explained = documented as don't-use, with the reason · — not mentioned

```xml
<!-- unset optional select -->
<param name="outputs" value_json="null" />
<!-- empty multiple select -->
<param name="outputs" value_json="[]" />
```

***This is the tool-author reference (the tool XML docs are generated from the XSD). Galaxy reviewers only need to check it matches current behavior.***

***Validation, linting and profile behavior don't change; the docs now describe what Galaxy already does, and new framework tool tests run each documented form.***

***Existing tools aren't broken by this. `value=""` on a multiple select still runs before profile 26.1, as before; its lint error from 24.2 already exists and is unchanged.***

<details><summary>Where the text lives</summary>

- The `<param>` element docs under tool tests in `lib/galaxy/tool_util/xsd/galaxy.xsd`, which also generate the published tool XML reference.
- One example sentence added to the `value_json` attribute docs.
- Framework tool tests in `test/functional/tools/parameters/`: `value_json="null"` on `gx_select_optional` and `gx_select_multiple_optional`, `value_json="[]"` on `gx_select_multiple_optional` and `gx_select_multiple`. Each renders as `None` in the command, like an omitted optional select.
- `test_select_multiple_empty_list` in `test_tool_execute.py`: `[]` runs and renders `None` through the legacy, 21.01 and request input formats.
- `parameter_specification.yml`: `[]` is valid for multiple selects in every state representation and invalid for single selects.
- Unit tests pin the profile cutoffs this table documents: `value=""` on a single select fails test loading from 24.2 and on a multiple select from 26.1, `TestsMultipleSelectEmptyValue` warns before 26.1 and errors from it, and the `value_json` forms load at every profile.

Every row of the table was checked by parsing a test tool at profiles 21.05, 24.2 and 26.1 and running the `TestsCaseValidation` and `TestsMultipleSelectEmptyValue` linters. The reference renders through `doc/parse_gx_xsd.py`, with the same fenced `xml` blocks as the rest of the XSD.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Builds on 🔀 #22894, which made `value=""` on multiple selects a legacy pre-26.1 convention. Documents the resolution agreed in #19325. The issue's other follow-up, a clearer validation error for single selects (naming the parameter and suggesting `value_json="null"`, as the multiple-select linter already suggests `value_json="[]"`), isn't part of this.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? N/A. Docs only; the multiple-select lint message already points at `value_json="[]"`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Framework tool tests run each documented form through a real job and check the command line.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? The "before 26.1" sentence tells authors of older tools why `value=""` on a multiple select still runs.

## How to test the changes?
- [x] Instructions for manual testing are as follows:

<details><summary>Manual check</summary>

With Galaxy's venv active (the script needs lxml and PyYAML):

```sh
cd doc && python parse_gx_xsd.py schema_template.md ../lib/galaxy/tool_util/xsd/galaxy.xsd > /tmp/schema.md
```

Read the tool test `param` section in `/tmp/schema.md`. To see the behavior it documents, give a profile 24.2 tool an optional select and a test with `<param name="..." value="" />`, then run `planemo lint`: `TestsCaseValidation` errors. Switch it to `value_json="null"` and the lint is clean.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
