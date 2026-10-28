# galaxy#24311 — New upload panel no longer converts line endings by default (26.2 regression)

[Issue](https://github.com/galaxyproject/galaxy/issues/24311) · [proposal](proposal.md) · [debrief](debrief.md) · [source draft](raw.md)

Closed on GitHub as completed 2026-10-23 (sync 2026-10-26).

Filed 2026-10-20, unassigned (John asked not to be assigned). Found by the 26.2 Playwright FAQ loop (`analysis_jobs_keep_running`) on `galaxy_ui_driver`.

#22787 made the new upload panel the default in 26.2. Its `toPosixLines` default is `false` (`uploadOptionModel.ts`), and the toggle only appears in advanced mode. The old dialog used `true`. As a result, pasted content gets no trailing newline and CRLF files stay CRLF. Cut1's `chop` then eats the last field.

Open: the 26.1 behaviour comes from reading the code, not from a run. eaaf8604fad also flipped the `client/src/utils/upload.ts` `uploadItemDefaults.to_posix_lines` fallback to `false`. `cutWrapper.pl` `chop`→`chomp` is fixed only on `galaxy_ui_driver`.

Next: branch off release_26.2 that restores `defaultValue: true`, plus a client or E2E test that pastes `a` and expects `a\n`.
