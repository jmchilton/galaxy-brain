# Custom build from a FASTA dataset isn't listed until its jobs finish and the page reloads

Found by the 26.2 FAQ loop (`vault/projects/playwright/HARDEN_AGAINST_FAQ.md`), FAQ
`faqs/galaxy/analysis_add_custom_build.md`. Galaxy `release_26.2` (`galaxy_ui_driver` `df4f3b65424`).

## Repro

1. Upload a fasta to the current history.
2. Username menu → Preferences → Manage Custom Builds.
3. Name + Key; Definition defaults to "FASTA-file from history", the fasta is preselected. Save.
4. Green "Successfully added a new custom build." alert fades after a few seconds. The table above
   still says "No data available". Two hidden datasets (len, linecount) appear in the history.
5. Reload the page after those jobs finish: the build is listed with its chrom count.

## Why

- `PUT /api/users/{id}/custom_builds/{key}` with `len|type=fasta` starts two converter jobs
  (`dataset.get_converted_dataset(trans, "len")`, then `"linecount"`) and stores the build with a
  `linecount` HDA id but no `count` (`lib/galaxy/webapps/galaxy/api/users.py` ~575-583).
- `GET .../custom_builds` drops any build without `count` whose linecount HDA isn't `ok` yet
  (`users.py` ~601-614), so right after Save the list omits the new build.
- `CustomBuilds.vue` `save()` calls `loadCustomBuilds()` once on success; nothing polls.

## Options

- API: return pending builds too (e.g. `count: null` / a `state`), and have the client show them
  as "counting chromosomes..." and poll until `count` appears. Probably the right fix.
- Client only: after a fasta save, poll `loadCustomBuilds()` until the key appears (or a timeout),
  and change the alert text to say the build appears once Galaxy has counted its chromosomes.

## Context

- GTN FAQ `analysis_add_custom_build` is snippeted by `ecology/ref-based-rad-seq`; learners following
  it will think Save failed.
- E2E coverage for the FASTA path added in `galaxy_ui_driver` (`bf041856612`,
  `test/integration_selenium/test_custom_builds_fasta.py`); it reloads after `wait_for_history()`,
  which a fix could drop.
