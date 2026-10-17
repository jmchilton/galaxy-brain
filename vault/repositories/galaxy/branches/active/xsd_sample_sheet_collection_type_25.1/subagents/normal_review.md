**Acted on:** finding 1. Added a `sample_sheet` sentence to the Param `collection_type` docs (`0b14b1e8c4b`).
**Not acted on:** finding 2 (info: widening outputs/defaults matches runtime parity). Finding 3 (nit: the `<type class=` grep could skip a tool whose help mentions it; that is unlikely, and an internal tool written differently would fail loudly). The `convert_sample_sheet.xml` question is out of scope and goes to John.

# Normal review: xsd_sample_sheet_collection_type_25.1 (6aac3555b70)

Top line: ready as is. Patterns match runtime `COLLECTION_TYPE_REGEX` exactly (0 mismatches in an exhaustive probe, lxml and xmllint). The libxml2 alternation-order bug is real and reproduced. The CI script change keeps the old file list and adds exactly the two core tools that can pass. No blocking findings, only optional low-severity notes. No security concerns.

## Findings

1. **Low (optional docs).** The `Param` `collection_type` docs (galaxy.xsd ~L4462) say the allowed types are `list`/`paired` plus nesting. This is the only attribute whose real consumers use `sample_sheet`. Fix: add one sentence, e.g. "``sample_sheet`` (optionally ``sample_sheet:paired``, ``sample_sheet:paired_or_unpaired``, ``sample_sheet:record``) may be used as the outermost type only." Skip the output/default/test docs.
2. **Info (no action).** `CollectionType` is widened for output collections, defaults and test `<collection>`/`<output_collection>` too. That's acceptable: runtime uses the same single regex, and discovered outputs can carry `row` data (`model/store/discover.py`), so sample_sheet outputs aren't clearly never-working. Test-input `<collection type="sample_sheet">` probably can't build rows in the test framework. That's a niche edge and not worth splitting the type.
3. **Info (nit, no action).** The `grep -q '<type class='` filter would also skip a normal tool that mentions that string in help or a comment, and would keep an internal tool written as `<type module=… class=…>`. The second case fails loudly, so it's safe. The first is unlikely. All 29 current skips fail XSD only on `tool_type`/`<type>`, so the rule matches the real reason.

<details>
<summary>Full review</summary>

### XSD patterns vs runtime
- Runtime (`type_description.py:15`) and client (`collectionTypeDescription.ts:210`) use the same regex. The XSD now encodes the same language.
- Probe (scratch script, lxml 2.14.6 plus system xmllint 2.9.13). Candidates were every 1–3 token colon join of {list, paired, paired_or_unpaired, record, sample_sheet, foo, ""}. The list probe added ~3600 comma pairs plus `list,`, `,list` and `list,,list`. Expected results were computed from the runtime regex, with each comma piece checked separately for the List type. Result: **0 mismatches** for `CollectionType` and `CollectionTypeList` in both validators.
- **libxml2 claim confirmed.** Swapping the alternation (open-ended branch first) produced 17 false accepts (`sample_sheet:list`, `sample_sheet:paired:list`, `sample_sheet:paired:paired`, …) in both libxml2 2.9.13 and 2.14.6. The XML comment beside each pattern is justified, since it's non-obvious and guards against a "tidy-up" reorder.
- Restructuring `CollectionTypeList` from `[:,]` tokens to `TYPE(,TYPE)*` accepts the same set for non-sample_sheet values. Any token sequence with `:`/`,` separators is a comma list of colon types. The duplicated sub-pattern can't be avoided in XSD 1.0, since there's no pattern reuse.

### Uses of the types
`CollectionType`: test param collection (L1871), test output_collection (L2389), param default (L5045, L5067), output collection (L6505), output `collection_type` (L6544). `CollectionTypeList`: Param `collection_type` (L4462). Widening is required for L4462, which is the real consumer (`sample_sheet_to_tabular.xml`, `convert_sample_sheet.xml`). For the rest it matches runtime parity (see finding 2).

### .ci/validate_test_tools.sh
- POSIX sh is fine. `set --` accumulation, `case` globs and `cd … || exit` are all correct. tox runs it with `bash`, which is also fine.
- The test tools list is unchanged: `*_conf.xml` and `*/upload.xml` are excluded. The old `grep -v upload.xml` matched by substring, and only `upload_tool_conf.xml` and `upload.xml` contain it. Both stay excluded.
- Core tools: I ran the `load_tool | xmllint` pipeline from `scripts/validate_tools.sh` over all 30 non-macro `lib/galaxy/tools/*.xml`. Kept: `data_fetch.xml` and `sample_sheet_to_tabular.xml`, both OK with the new XSD. All 28 skipped tools fail only on the `tool_type` enum and/or "Element 'type' not expected". So the filter tracks the real reason.
- `scripts/validate_tools.sh` takes the paths as `"$@"`, so the new argument list works unchanged.
- The pre-existing wrong XSD lint path (`lib/galaxy/tools/xsd/`) doesn't exist on 25.1 and is left alone. That's correct to avoid a 23978 conflict, and the script has no `set -e`, so it's harmless.

### Other
- The trailing-space hunk in the XSD comes from pre-commit. It's harmless.
- `convert_sample_sheet.xml:16` lists `sample_sheet` twice and has no `sample_sheet:record`. It's out of scope, but there's a real question: `_list_to_sample_sheet_collection_type`/the conversion docs also skip record, so it may be deliberate or a gap. It belongs in a separate follow-up.
- No tool_util linters or pydantic models duplicate the collection-type pattern. No other spot needs a sync.
- Testing: lint coverage via `validate_test_tools` is proportionate, as requested. The red→green on `sample_sheet_to_tabular.xml` is real.
</details>
