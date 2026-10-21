# Debrief: upload_posix_lines_default_off

## Research

- Premise checked first: the new panel's `toPosixLines: false` default exists in 26.0 and 26.1 too (beta activity, #21338). But in 26.0/26.1 the Upload button still opens the old `UploadModal` (`components/Upload/model.ts`, `true`). The regression starts with #22787 (ef021848266), which made the panel the default in 26.2. The draft's "26.2 regression vs 26.1" holds.
- POSIX toggle shown only in advanced mode (`uploadOptionVisibility.ts`, `posix: advancedMode`), so default users can't opt back in.
- Server never converts on its own: `data_fetch.py` and `schema/fetch_data.py` default `False`; `handle_uploaded_dataset_file_internal` converts only on request. `convert_newlines` adds the trailing `\n`.
- `cutWrapper.pl` still calls `chop` upstream (the `chomp` fix exists only on `galaxy_ui_driver`).
- No duplicate. Closest: #18619 (document the POSIX option). #24125 only swaps the checkbox component.

## Rewrite

- Show-first table (26.1 vs 26.2) with the paste example, the two effects (CRLF kept, no trailing newline), the Cut1 example, and why tool tests miss it.
- Origin details in a details block. The reviewer corrected the default's history: at #21338 it lived in `uploadDefaults.ts` and moved to `uploadOptionModel.ts` in eaaf8604fad. The reviewer also added that `zipExplorer.ts` still sends `true`.
- Proposed approach: restore `defaultValue: true`, plus a paste test. Alternatives: fix tools, or change the server default.

## Review (one round)

All six checks passed. Edits were wording and accuracy, listed above.

## Left over

- The 26.1 behaviour in the table comes from reading the code; it wasn't run on 26.1.
- eaaf8604fad also flipped the `uploadItemDefaults.to_posix_lines` fallback in `client/src/utils/upload.ts` to `false`. It is restored by the same flip but not mentioned in the issue.
