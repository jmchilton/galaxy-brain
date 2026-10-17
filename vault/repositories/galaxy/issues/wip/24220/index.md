# galaxy#24220 — Tool form drag and drop matches collections to inputs by plain string suffix

[Issue](https://github.com/galaxyproject/galaxy/issues/24220)

Filed 2026-10-17 from [proposal](proposal.md) ([source draft](issue_draft.md), [debrief](debrief.md)). Assigned to jmchilton.

`FormData.vue` drop guard + map-over picker use bare `endsWith`; 7 drop cases wrong vs server. Fixed on [`issue_20657_input_processing_mode`](https://github.com/jmchilton/galaxy/tree/issue_20657_input_processing_mode) (`9ff2eb69afd`, `68b8d3969e5`, `057ac69f904`; `68b8d3969e5` overlaps marker/dedupe work, needs hand-splitting). Depends on #24218. Backport target release_26.0. Missing red tests: direct-accept rows, `list` accepting `sample_sheet`.

Branch: [`issue_24220_drop_collection_matching_26.0`](../../../branches/active/issue_24220_drop_collection_matching_26.0/index.md) (stacked on 24218's, hardened, READY).
