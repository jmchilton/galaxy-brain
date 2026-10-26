# New upload panel converts no line endings by default (26.2 regression vs 26.1)

Found by the playwright FAQ loop (`analysis_jobs_keep_running`, 2026-10-20), on `galaxy_ui_driver`
(release_26.2 based).

## What changed

- 26.0 and 26.1 upload dialog: `client/src/components/Upload/model.ts:65` has `toPosixLines: true`.
  Every pasted, local or URL upload was converted to POSIX line endings by default.
- 26.2 upload panel (`client/src/components/Panels/Upload/`): the default comes from
  `client/src/composables/upload/uploadOptionModel.ts`, where `toPosixLines` has
  `defaultValue: false`. It has been false since the panel's first refactor
  (`28de4d09a99`, 2025-12-17, "Refactors upload methods to centralize item defaults and
  mapping"), and `eaaf8604fad` kept it. `origin/dev` is the same.
- The fetch API defaults to false too (`lib/galaxy/tools/data_fetch.py:783`,
  `request.get("to_posix_lines", False)`), so only the client ever turned it on.

## Effect

POSIX conversion (`lib/galaxy/datatypes/sniff.py` `convert_newlines`) does two things that tools
quietly relied on:
- CRLF and CR to LF. Windows files now stay CRLF.
- A trailing newline on the last line. Pasted content usually has none.

Seen: pasting `1<TAB>2<TAB>3` with no final newline and running Cut1 (`c1,c3`) gave `1<TAB>.`.
`tools/filters/cutWrapper.pl` used `chop`, which ate the `3`. That's fixed separately on
`galaxy_ui_driver` (`chomp`), but other line-oriented tool scripts may make the same
assumption. Stock tool tests can't catch it: tool-test uploads always set `to_posix_lines`
(`lib/galaxy/tool_util/client/staging.py:82`).

## Repro (26.2)

1. Upload > Paste File Content. Type `1<TAB>2<TAB>3` with no final newline, type `tabular`.
   Leave the row options at their defaults (POSIX unchecked).
2. Dataset size is 5 bytes; no newline was added. With POSIX on (26.1's default), `convert_newlines`
   adds one (from reading the code; 26.1 not run).
3. Run Cut1 with `c1,c3`: the output is `1<TAB>.`, not `1<TAB>3` (before the cutWrapper fix).

## Question for the issue

Was `defaultValue: false` intended? If not: default it to true again, matching 26.1, with an E2E
that pastes `a` and asserts the dataset is `a\n`. Nothing in the refactor commits says the
change was deliberate. No existing issue found (searched "posix upload", "line endings").
