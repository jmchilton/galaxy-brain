# Alt: original_scope

Branch: [`issue_24481_sample_sheet_mapped_output_type_26_0_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24481_sample_sheet_mapped_output_type_26_0_alt_original_scope) at `381ea4573e1`, after the first review, Codex review and test challenge.

This alt only demotes a *leading* `sample_sheet` when the composed type is invalid: `sample_sheet` × `list` → `list:list`, and `sample_sheet:paired` × `list` → `list:paired:list`. It drops the outer columns in that case.

It differs from the parent branch on unlinked cross products where the sample sheet is not the leading level. The alt leaves them unfixed: `list` × `sample_sheet` stays `list:sample_sheet`, `sample_sheet` × `sample_sheet` becomes `list:sample_sheet`, and the inner sample sheet trees keep their columns. The parent demotes every `sample_sheet` rank and retypes the nested structures, both on the server (`demote_sample_sheet_ranks`, `_demote_sample_sheets`) and in the client (`demoteSampleSheetRanks`).
