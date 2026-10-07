Fix 🎯 #23891 - resolve `format_source` and `metadata_source` against the tool's declared inputs, not the internal keys Galaxy adds while expanding them.

At job creation Galaxy records extra keys for expanded inputs: `input2` for the second dataset of a `multiple` input, `coll2` for a collection's second element, and conversion names. A collection given to a `multiple` data input is also recorded under the input's name, so a selector can reach into it. On `dev`, `format_source` looks references up in that dict directly, so it reaches these keys, and one of them silently shadows a declared input:

| Tool declares (output `format="txt"`) | `format_source` | `dev` | this branch |
|---|---|---|---|
| `multiple` data `input` given `[fasta, bed]` | `input2` | 😬 `bed` | ✅ `txt` |
| same `input` given a list (`forward`=bed, `reverse`=fasta) | `input['forward']` | 😬 `bed` | ✅ `txt` |
| `data_collection` `coll` given `list[fasta, bed]` | `coll2` | 😬 `bed` | ✅ `txt` |
| `fasta_input` with `<conversion name="fasta_input_table" type="tabular">` | `fasta_input_table` | 😬 `tabular` | ✅ `txt` |
| `multiple` `input` given `[fasta]`, plus `cond\|input1` given `bed` | `input1` | ❌ `fasta` | ✅ `bed` |

😬 resolves to a key no tool author declared · ❌ wrong input · ✅ `txt` = reference ignored, output keeps its declared `format`

The last row is a wrong answer, not a spelling issue. `input1` is the legacy alias for `cond|input1`, and the linter already suggests qualifying it, but at runtime the `input1` key that `multiple="true"` creates for `input` wins the lookup. The other rows make the layout of the job-creation dicts a tool-facing API that nobody documented or chose.

Tool loading now resolves each `format_source`/`metadata_source` against the declared inputs, using the resolver the linter already used (moved into `tool_util` and built from `ToolSource`, so YAML tools get it too):

- **Resolves:** the value is rewritten to the runtime key of the input it names. A legacy alias becomes its qualified key with the reference's own repeat index (`files_2|file` → `files_2|file_cond|file`), which fixes the collision row.
- **Doesn't resolve:** below profile 26.2, Galaxy logs a warning and ignores the reference, so the output falls back to its declared `format`. From profile 26.2, the tool fails to load. Both are documented in the XSD.

***None of the 555 `format_source`/`metadata_source` references swept in tools-iuc, bgruening/galaxytools, tools-devteam and Galaxy's test tools changes output format. None uses an internal key, the 94 legacy aliases that get rewritten resolve to the same input as before, and the 22 references that get dropped already resolved to nothing (admins will see a load warning for those).***

***Older tools still load. Only profile 26.2 and later tools fail on an unresolvable reference; older ones get a log warning.***

***Legacy aliases keep working at every profile, including 26.2; they're rewritten, not rejected. Requiring qualified names is #23902, and `structured_like` and `change_format` references are untouched here.***

***What jobs record doesn't change. `JobToInputDatasetAssociation` names and the `input1…N` keys stay as they are, so the job API and stored jobs are unaffected; only what a reference may name changes.***

<details><summary>What changed</summary>

- `lib/galaxy/tool_util/parser/output_references.py`: `InputReferences` (the linter's private `_InputReferences`, rebuilt over `parse_input_pages()`/`InputSource` instead of the XML tree), `resolve()`, and `output_reference_problem()`, which holds the rules: `format_source` names a `data`, `hidden_data` or `data_collection` input; `metadata_source` a `data` or `hidden_data` input; a selector only on a `data_collection`. `split_element_selector` replaces the selector regex that `output_format.py` and the linter each had.
- `Tool._resolve_output_references` runs in `Tool.parse` right after `parse_outputs`, so subclasses that override `parse_outputs` can't skip it. It covers `<data>`, `<collection>` and the `<data>` inside a collection, and updates the `ToolOutput` in place, so the remote-metadata `to_dict`, discovered collections and `known_outputs` all see the resolved value.
- A legacy reference is kept as written when its qualified form is itself another input's legacy alias (`format_source_in_conditional.xml` output3: `input1` → `cond|input1` would hit the nested `cond|inner_cond|input1`). The existing framework test covers it.
- `output_collect.py`: discovered-collection collectors always get the collection's default format. A collection that declared `format_source` parses its collectors without a default, so a dropped reference would otherwise give `data` instead of the declared format.
- The existing load-time `type_source` check (bare aliases already fail) now uses the same resolver, replacing `qualify_legacy_data_input_reference`, which duplicated its alias matching and repeat reindexing. An ambiguous alias now names every input it could mean instead of the first.
- Linter (`OutputsFormatSourceReference`): uses the shared resolver, errors on a reference to a non-dataset input (e.g. a select), and suggests the qualified name with the reference's own repeat index. The discovered-collection legacy error says "cannot resolve before Galaxy 26.2" when this Galaxy rewrites the alias, and keeps the old wording when it can't (ambiguous or shadowed).

</details>

<details><summary>Side effects worth knowing</summary>

- The tool API's output `to_dict` shows the resolved key (`cond|input1` instead of `input1`).
- A legacy alias on a discovered collection now resolves. Before, discovered elements looked it up among qualified names only and silently fell back to the declared format.
- In the workflow editor (`workflow/modules.py`), a dataset output whose reference was dropped advertises its declared `format` instead of `"input"`. That matches what the job produces.

</details>

<details><summary>Sweep</summary>

555 references across tools-iuc (2026-07-30), bgruening/galaxytools (2026-09-24), tools-devteam and `test/functional/tools`:

- 0 use an internal key.
- 94 are one-level legacy aliases that get rewritten and resolve to the same input.
- 22 get dropped, all already resolving to nothing: galaxytools `rpy_statistics_collection/*` and `Sambamba_merge`, IUC `barcode_splitter` (fixed upstream in tools-iuc#8471), `ncbi_fcs_gx` `mode.input`, `metadata_source` on a select or collection input, and this PR's new test tools.

</details>

## Risks

From profile 26.2, a `format_source` or `metadata_source` that doesn't name a declared `data`/`data_collection` input becomes a tool-load error, which sets a rule tool authors will build on.

<details><summary>Risk Details</summary>

- Profile 26.2+ tools with an unresolvable reference fail to load instead of silently falling back. "Resolvable" means naming a `data`, `hidden_data` or `data_collection` input (`metadata_source`: `data` or `hidden_data`).
- Undocumented forms that worked on `dev` (`input2`, `coll2`, conversion names, a selector on a `multiple` data input) stop resolving for every profile. None appears in the sweep.
- `metadata_source` isn't linted, so a profile 26.2 tool can fail to load on a bad `metadata_source` with no earlier lint warning.
- The tool API reports resolved keys for `format_source`/`metadata_source`.
- Servers with older tools that reference nothing (e.g. galaxytools `rpy_statistics_collection`) log a warning per output at every tool load.

</details>

<details><summary>Risk Review Advice</summary>

Check the rules in `output_reference_problem()`: which input types each attribute may name, and selectors only on collections. They now gate tool loading from 26.2, so anything they reject that should work becomes a load error. The legacy-alias rewrite in `InputReferences.resolve()` is the other place to look; `test/unit/tool_util/test_output_references.py` lists the repeat and shadowing cases it handles.

</details>

## Context

Builds on 🔀 #23919, which documented qualified references and made the linter resolve them like runtime; this PR moves that linter's resolver into `tool_util` and has tool loading use it. A concrete instance of 🎯 #23444 (centralize output-reference parsing and resolution). 🌿 [issue_23902_qualified_output_references](https://github.com/jmchilton/galaxy/tree/issue_23902_qualified_output_references) builds on it to require qualified references from 26.2 (🎯 #23902).

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A tool author sees `Tool [id] output 'out' format_source='input2' does not match any declared input.` as a load error (26.2+) or a log warning ending `Ignoring it; tools with profile 26.2 or newer fail to load.`; linting reports the same problem with a suggested qualified name.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The framework and API tests check the output datasets' formats, and the unit tests check what a loaded tool's outputs reference.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None in practice. Only a step whose tool references an internal key or nothing at all changes; the editor then shows the output's declared format.
- [x] Who hits this in practice and what is the evidence? Nobody yet, per the sweep above. The fix closes the internal keys before a tool comes to depend on them, and repairs the collision row's wrong format.
- [x] Were simpler or existing approaches considered? Yes. Documenting the keys locks in expansion order, renaming them (draft #11803) changes recorded job inputs, and relying on the linter leaves runtime wrong. #23891 covers each.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

The framework tools, the API test and every test in `test/unit/app/tools/test_output_references.py` except the declared-reference control fail with the load-time resolution disabled; the linter's non-dataset-input test fails on `dev`. The `tool_util` unit tests exercise the moved resolver directly.

- Framework tools `format_source_internal_keys` (`input2`, a conversion name, `coll2`, and a discovered collection with `format_source="input2"`, which also covers the `output_collect.py` change) and `format_source_legacy_alias_collision`.
- API `test_format_source_internal_keys_collection_for_multiple_input`: a collection given to a `multiple` data input, covering `input['forward']` and `input2`. The tool test framework can't give a collection to a `multiple` data input.
- Unit: `test/unit/app/tools/test_output_references.py` (rewrite, drop, collection and nested outputs, a YAML tool, the 26.2 load error) and `test/unit/tool_util/test_output_references.py` (repeat reindexing, the shadowed-alias exception, a parameter named like a repeat instance, `hidden_data`, mismatched repeat indices), plus 2 linter tests. `type_source` tests in `test_tool_deserialization.py` gain a repeat-reindexing case and an ambiguous-alias case.
- The existing `format_source`, `output_format`, conversion and collection framework tests stay green.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
