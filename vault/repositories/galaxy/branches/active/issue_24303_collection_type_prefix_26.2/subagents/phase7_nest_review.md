# Nest review (`fde5d678e6a`, `572d2d1fc8c`, `170f34c4137`)

Acting on: sample sheets — Nest 1.1.0's `list`/`list:paired` inputs accept `sample_sheet*`, and the prefix rejected `list:sample_sheet`; John chose to normalize `sample_sheet*` → `list*` in the generic prefix helper (server + editor), reversing the earlier "error" default. API test that 1.1.0 doesn't accept a bare `paired` + help line; correct the 1.0.0 help (it claims `list:paired` → `list:list:paired`); comment on NestTool's inner-type branch; drop `test_nest_list_1_1_0` / `test_nest_empty_list_of_pairs` (duplicate 1.1.0 XML `<tests>`); version suffixes on Nest test names.

Not acted on:
- 1.0.0 XML tests may not run in CI (only latest version per tool via `toolbox.tools()` fallback) — 1.0.0 behavior covered by API tests.
- `create_collection` resolving type_source on a DCE slice via its parent — fragile but correct; part of the queued resolution-order issue.
- `NEST_LIST_PAIRED` workflow test `count` assertion — minor.

<details><summary>Full review</summary>

Fine: 1.0.0 XML byte-identical to base; registration in tool_conf.xml.sample / sample_tool_conf.xml / MANIFEST.in; `get_collection()` fixes mapped-slice parent bug (covered both versions); empty inputs fine; test_matching changes good.

1. 1.1.0 (default) accepts sample sheets via `list` → runtime 400 (1.0.0 gave list:list).
2. Unpinned requests now 1.1.0; bare paired rejected — needs test, help line, PR note; `harmonize_optional_collection.gxwf.yml` now runs 1.1.0 (same result on list).
3. 1.0.0 help wrong about list:paired.
4. NestTool inner-type keyed implicitly on declared `type` vs `type_source` — comment.
5. Overlapping tests vs XML `<tests>`.
6. Inconsistent test name versioning.
7. CI coverage of 1.0.0 XML tests depends on toolbox index path.
No security issues.

</details>
