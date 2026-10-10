# Play log

Append-only, one row per [TO_PLAY_ITERATION.md](TO_PLAY_ITERATION.md) iteration.

| Test | Cases moved | Cases kept | Reasons | Wall time (play vs unit) |
| --- | --- | --- | --- | --- |
| 123 non-component tests (bulk) | – | – | Never storified; see STORY_LOG bulk row | – |
| `History/Export/HistoryExportWizard.test.ts` (`293300b3d8f`) | 12 of 14, into 4 new stories: start on format step, format count, download/remote/Zenodo/user-Zenodo destinations, remote directory + validation, file-name placeholder, Zenodo setup, `onExport` (`ExportsDirectDownload`, `SuggestsRemoteFileName`, `SetsUpZenodoDraftRecord`, `PrefersUserZenodo`) | 2: format id→label (`should display format options`), sanitizeHtml `links` profile | Kept: format id is only a `data-export-format` attribute, no user-visible equivalent; sanitizeHtml spies a unit-only mock. Moved "Zenodo setup" OR-assertion is vacuous (step labels always render "Select draft record"); ported as is, stronger check needs John. Format count is page-wide `getAllByRole("heading")`. Remote directory typed via focus + keyboard: a click opens FilesDialog | Unit file 14→2 cases, tests 250→55ms (file wall ~4.6–5.7s→4.5–5.2s, mostly setup). Stories file 5→8 tests, tests 0.52→1.1s, wall 5.3–5.8s→5.9–6.4s |
