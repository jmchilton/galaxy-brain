# faqs/galaxy/analysis_add_custom_build.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `e64d932e12e` (`faq_server.sh main`, stock config).
Embedded in `ecology/ref-based-rad-seq` (name `Stickleback`, dbkey `stickleback`).

## GTN

- **"User -> Preferences -> Manage Custom Builds"**: the masthead item is the username; its menu
  has **Preferences** (same as `account_multiple`).
- **"Create a unique Database (dbkey)"**: the field is labelled **Key** ("Specify a build key, e.g.
  hamster_v1"). Suggest "**Key** (the dbkey)".
- **Definition** already defaults to "FASTA-file from history", and the first fasta in the
  *current* history is preselected. The page reads the history once when it opens, so the fasta
  must be uploaded (and green) before opening it. Worth saying.
- **Missing last step.** After **Save** the build is not listed until Galaxy has counted its
  chromosomes (two hidden jobs) and the page is reloaded; the "Successfully added" alert fades
  and the table still says "No data available". Add "wait a minute and reload the page; the
  build appears with its number of chromosomes". Queued as a Galaxy issue (below).
- Typo: "Standarize".

## Galaxy

- `test_custom_builds.py` only covered the copy/paste len path; no E2E or API test made a build
  from a history fasta. Added `test_build_add_from_fasta` and `custom_builds` components, plus the
  `len`/`linecount` datatypes and converters the framework test datatypes lacked (`2782db29ee2`).
  Green under Playwright.
- Queued `gx_issues/to_file/custom_build_fasta_not_listed_until_reload.md` (the list hides a FASTA
  build until its linecount job is ok; the page never re-polls) and
  `custom_build_conversion_error_swallowed.md` (`users.py` turns `NoConverterException` into a bare
  500 "Failed to convert dataset.").
- gxui: first real use of `gxui preferences` + `preferences.card(id=...)` — opened the page in 2
  commands, no snapshot needed. Waiting on the hidden converter jobs first took
  `gxui call wait_for_history`; `gxui history-wait` with no HID does it now (gxui tip).
