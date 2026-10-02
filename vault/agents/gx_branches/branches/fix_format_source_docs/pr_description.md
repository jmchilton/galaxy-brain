Supersedes 🔀 #19330 - document qualified `format_source` references and lint them the way Galaxy resolves them.

A tool author who follows the XSD today gets it wrong, and the linter doesn't catch it. The `format_source` example writes `format_source="qfile"` for a parameter inside the `qual` conditional, and the text states the rule as "a conditional name is not included". That example happens to work, but the rule doesn't. Runtime keys input datasets by their full `|`-qualified path. An unqualified name only works through a legacy alias that drops the *innermost* conditional or section. So it breaks one level deeper, and for discovered collection elements the alias doesn't exist at all. There a bare name silently falls back to the default format.

The reference linters added in #22432 also disagree with runtime in both directions:

- **False errors on valid tools.** A collection element selector (`reads['forward']`) is reported as "does not match any input parameter". That hits IUC `flash`, `sickle` and `fastq_paired_end_interlacer` today.
- **Silent passes on broken tools.** Any value containing `|` is skipped, so `runinterface|input` for a parameter that actually lives in a repeat (`runinterface|seqfiles_0|input`) lints clean but never resolves (IUC `barcode_splitter`, fixed in galaxyproject/tools-iuc#8471). Bare names of parameters inside repeats also pass, and `<data>` outputs nested in a `<collection>` are never linted.

This PR fixes the docs, as #19330 set out to do, and makes `OutputsFormatSourceReference` and `OutputsStructuredLikeReference` follow runtime resolution.

<details><summary>What the linters now check</summary>

`format_source` (on `<data>`, `<collection>`, and `<data>` inside `<collection>`):

- Qualified paths through conditionals, sections and repeats (`cond|files_0|input1`). Any repeat index is accepted.
- The legacy alias (innermost conditional/section omitted, as `visit_input_values` records it) is a warning, with the qualified name suggested. On a `<collection>` with `<discover_datasets>` it is an error, because discovered elements can't resolve it.
- A single element selector (`input['forward']`, `input[0]`) is accepted on a collection input and is an error on a non-collection input.
- A reference that matches nothing is an error, with "Did you mean '…'?" when exactly one parameter has that name.

`structured_like` has to resolve on both runtime paths: unmapped jobs (`collection_prototype`, qualified names or the legacy alias) and mapped-over jobs (`execute.py` `sliced_input_collection_structure`, qualified names only, and a bare name at any depth before profile 26.0):

- Qualified names are fine.
- Before profile 26.0, a bare name that is also the legacy alias (one conditional/section deep) is a warning. Deeper bare names and other legacy aliases are errors, because one of the two paths can't resolve them. From profile 26.0 every unqualified name is an error.
- References into repeats are errors, since the mapped-over lookup never enters repeat lists.
- The target must be a data or collection parameter.

</details>

<details><summary>Example messages</summary>

```
Output 'output1' uses unqualified format_source='outer|input1'. Use the qualified name 'outer|cond|input1'.
Output 'discovered' uses unqualified format_source='input1', which discovered elements cannot resolve. Use the qualified name 'cond|input1'.
Output 'output1' references format_source='files_0|input1' which does not match any input parameter. Did you mean 'cond|files_0|input1'?
Output 'output1' selects an element with format_source='input1['forward']' but 'input1' is not a collection input.
Output 'list_output' references structured_like='queries_0|input1' inside a repeat, which cannot be resolved when mapping over collections.
Output 'list_output' references structured_like='input1' which is not a dataset or collection input.
```

</details>

### Impact on existing tools

Each new error is for a reference that fails on at least one runtime path. I scanned every tool in tools-iuc, bgruening/galaxytools and tools-devteam (3218 tool XMLs, 351 `format_source`/`structured_like` references):

- **New errors:** 5, all in IUC `barcode_splitter`, already fixed by galaxyproject/tools-iuc#8471.
- **Former false errors:** 6 selector references in 3 IUC tools now get the legacy-alias warning instead.
- **Newly linted:** 26 references on `<data>` nested in `<collection>` (18 in IUC, 8 in galaxytools `trim_galore`), all legacy-alias warnings.
- **Unchanged:** 8 galaxytools errors that were already errors (a typo and a stale name after a parameter rename). None of the legacy-alias references sit on a discovered collection, and the one `structured_like` (IUC `sickle`) stays a warning.

### Known limitations

- `metadata_source` is documented but not linted.
- `_InputReferences` is a small private walker over the raw XML, so it keeps working when typed parameter models can't be built. It should give way to the resolver proposed in #23444.

## Context

Supersedes 🔀 #19330, rebased onto `dev`. Its two commits keep their authorship, its debug-logging commits are dropped, and its XSD conflict with 🔀 #23763 is merged into that PR's discovered-collection text. Builds on 🔀 #22432, which added the reference linters, and 🔀 #23763. Pairs with galaxyproject/tools-iuc#8471.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Each message names the output and reference, and suggests the qualified name when there is one (see "Example messages").
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Every test lints tool XML and asserts the message a tool author sees.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
(Select all options that apply)
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
  - `test/unit/tool_util/test_tool_linters.py`: 14 new linter tests, covering conditionals, sections, repeats, selectors, nested outputs and the structured_like profile rule.
  - `test/functional/tools/format_source_in_conditional.xml` (from #19330): asserts which qualified and legacy references resolve one and two conditionals deep; passes in the tool framework tests.
  - `test/functional/tools/format_source_in_collection.xml`: element selectors on a paired collection inside a conditional (`cond|input_collection['forward']`, `['reverse']`, `[1]`, and no selector). The two elements have different formats, so each output shows which element it resolved.
- [ ] This is a refactoring of components with existing test coverage.
- [ ] Instructions for manual testing are as follows:
  1. [add testing steps and prerequisites here if you didn't write automated tests covering all your changes]

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
