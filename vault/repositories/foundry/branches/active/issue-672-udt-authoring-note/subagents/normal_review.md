Acted on every real error and most nits in `16be0d31`: `color` added to the §4 `value` bullet, legacy `to_cwl` shape stated fully (bare array for `list`, bare keyed object otherwise, no collection fields), `sample_sheet:*` named list-like, mapped-pair `name` bullet added, semicolons removed, source-reading sentence cut.

Not acted on:
- MultiQC "can collapse the rows" hedge — kept; it is the issue reporter's observed run outcome, and "can" already hedges.

<details><summary>Full review</summary>

Verdict: merge after small fixes. No errors in collection shapes or type list.

Real errors:
1. §4 `value` bullet omitted `color` (`YamlColorParameter.value`, yaml_parameters.py ~L332-360).
2. §3 understated legacy `to_cwl`: bare array only for `collection_type == "list"`; every other type (incl. `list:paired`, `sample_sheet`) a bare identifier-keyed dict; no `class`/`name`/`collection_type`/`tags`; leaves lack `element_identifier`/`size`. Path attribution correct (`/api/tools` → `MappingParameters(..., None, None)`, tools/__init__.py:2395; workflow capture returns None on any failure).

Verified: list-like vs record-like (runtime.py:95-102, 311-322); `has_single_item` (339-340); `unpaired` singleton (paired_or_unpaired.py:17); nested inner `name` (353-355), leaf `element_identifier` (366); DataInternalJson fields; §4 list matches `YamlGalaxyParameterT` (639-651); `collection_paired_test_y.yml` uses `elements.forward`; galaxy#24434/#24422 open.

Nits: name `sample_sheet:*`; semicolons in new prose (7 sites); cut source-reading sentence; hedge MultiQC claim; gap — `paired` mapped over `list:paired` gets `name` = outer identifier (`_adapt_from_dce`, L244-257).

</details>
