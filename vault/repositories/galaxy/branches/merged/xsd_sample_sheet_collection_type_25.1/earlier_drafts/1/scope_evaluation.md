**Recommendation: expand (modestly).** The XSD fix and core-tool lint coverage are right as implemented. Add two small fixes in the same sample-sheet/CI area. (1) `lib/galaxy/tools/convert_sample_sheet.xml:16` lists `sample_sheet` twice and leaves out `sample_sheet:record`. Its backend (`_sample_sheet_to_list_collection_type`, `sample_sheet_workbook.py:621`) already converts `sample_sheet:record` → `list:record`, and the sibling `sample_sheet_to_tabular.xml` lists `:record`. So the duplicate is almost certainly a typo for `sample_sheet:record`. This is a one-token fix in the other core tool that declares the types this branch legalizes. (2) Point `.ci/validate_test_tools.sh` at the real XSD path (`lib/galaxy/tool_util/xsd/galaxy.xsd`, with `|| exit 1`). Copy the two lines verbatim from `issue_23978_parameter_tools_xsd` so that merge-forward region resolves identically. The branch edits this file and the XSD, so a self-lint that points at a missing file belongs in the same PR. The broader options don't fit this PR: XSD-modeling internal `<type class>` tools, and contracting by dropping the CI change. Each costs more than it gains (see below).

Size: +25/-7 across 2 files (3 commits). Well under 100 lines, so no decomposition section.

## 1. As implemented

`CollectionType`/`CollectionTypeList` accept `sample_sheet(:(paired|paired_or_unpaired|record))?` as the outermost type only, mirroring runtime `COLLECTION_TYPE_REGEX`. `.ci/validate_test_tools.sh` also XSD-validates core `lib/galaxy/tools/*.xml` that aren't `<type class=…>` tools (today `data_fetch.xml` and `sample_sheet_to_tabular.xml`). There's a shellcheck-clean refactor commit first.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the reported bug exactly, with runtime parity</li><li>Testing is what John asked for: the core tool is now linted, red→green shown</li><li>Rule-based core-tool selection picks up future plain core tools automatically</li></ul> | <ul><li>Leaves the `convert_sample_sheet.xml` typo, so `sample_sheet:record` inputs can't be selected for conversion even though the backend supports it</li><li>Leaves the 25.1 XSD self-lint pointed at a nonexistent path in the file it rewrites</li></ul> |

## 2. Expand: fix the `convert_sample_sheet.xml` `:record` typo (recommended)

Replace the duplicate `sample_sheet` with `sample_sheet:record` in the converter's `collection_type`.

| Pros | Cons |
|---|---|
| <ul><li>A real user-facing gap: record sample sheets can't feed the converter</li><li>Backend and sibling tool already support it, so it's a one-token data fix</li><li>Same theme (which sample_sheet types core tools declare) and the same release target (25.1 introduced both)</li></ul> | <ul><li>Internal `<type class>` tool, so this branch's XSD lint doesn't cover it. The only coverage would be an API test (`test_tools.py` has `test_convert_sample_sheet_*` for plain/paired). Per the "tiny fix, no dedicated test" precedent, a fix-only change is defensible. Adding a `sample_sheet:record` case next to the existing two is optional</li><li>Needs John to confirm it's a typo rather than deliberate (the evidence above says typo)</li></ul> |

## 3. Expand: fix the 25.1 XSD self-lint path (recommended)

Change `xsd_path` to `lib/galaxy/tool_util/xsd/galaxy.xsd` and fail fast, matching 23978's dev version line for line.

| Pros | Cons |
|---|---|
| <ul><li>Real bug in the touched file: today it prints an xmllint error and continues</li><li>Identical text on both sides keeps that hunk out of the merge-forward conflict</li><li>Two lines</li></ul> | <ul><li>Low practical impact, because `scripts/validate_tools.sh` compiles the correct XSD via `--schema` anyway, so a malformed schema already fails CI</li><li>Debrief deliberately left it alone to avoid a 23978 conflict. That conflict already exists in this file, though, and copying 23978's text verbatim makes it smaller rather than larger</li></ul> |

## 4. Expand further: XSD-validate internal `<type class>` core tools

Teach the XSD `tool_type` values and the `<type>` element so the 28 skipped core tools (including `convert_sample_sheet.xml`) are linted too.

| Pros | Cons |
|---|---|
| <ul><li>Fuller core-tool coverage</li></ul> | <ul><li>Documents internal-only constructs in the public tool-author schema, which is a design call for XSD owners</li><li>Much larger and unrelated to the reported bug</li><li>Still wouldn't catch the item 2 typo, since the duplicate value is XSD-valid</li></ul> |

Not recommended. It was already listed as a separate follow-up in 23978's scope evaluation.

## 5. Contract: XSD change only, drop the CI script change

| Pros | Cons |
|---|---|
| <ul><li>Smallest diff, and no merge-forward conflict with 23978</li></ul> | <ul><li>Drops the only test John asked for, so the bug could silently regress</li><li>The refactor commit exists only because pre-commit shellchecks the touched file. It would go away too, but that saves nothing meaningful</li></ul> |

Not recommended.

<details>
<summary>Other things checked</summary>

- No other collection-type validator to sync. `tool_util` linters don't check `collection_type`. `tool_util_models/parameters.py` `Literal`s describe runtime values, not declarations. The runtime regex and the client regex are already identical (normal review).
- The widened `CollectionType` for outputs, defaults and test collections matches the runtime's single regex. Normal review judged it acceptable, so it isn't a scope question.
- dev has the same XSD gap and converter typo. Merge-forward carries both fixes, so no separate dev branch is needed.
- `FilterDatasetsTool` (`tools/__init__.py:4127`) asserts `sample_sheet`/`sample_sheet:paired` only. That's mapped-over-higher-order logic in an unrelated tool, so it isn't included.
</details>
