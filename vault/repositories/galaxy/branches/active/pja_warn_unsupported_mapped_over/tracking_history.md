# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- [#23334](https://github.com/galaxyproject/galaxy/pull/23334) — branch `pja_warn_unsupported_mapped_over` — Description: Hides job-only actions on pick-value steps and warns about saved configurations; blockers: needs review; rebased onto dev 2026-10-08 at mvdbeek's strict-mypy request (full `make mypy` clean, no code change needed), but that base had dev's broken dompurify lockfile (client/build/OpenAPI reds), so rebased again 2026-10-08 evening at `64df4a045a7`, no conflicts; PR CI on `64df4a045a7`.
