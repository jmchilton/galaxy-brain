# A custom build made from a history FASTA isn't listed until its jobs finish and the page is reloaded

After you save a custom build from a FASTA dataset, Manage Custom Builds still shows "No data available". Nothing on the page says the build exists or is still being processed.

| Step (User → Preferences → Manage Custom Builds) | What the user sees |
| --- | --- |
| Name + Key, Definition "FASTA-file from history" (the default), Save | Green "Successfully added a new custom build." The alert fades after 5 s |
| Look at the table | "No data available". Two hidden datasets (`len`, `linecount`) are now in the history |
| Think Save failed and click Save again | "There is already a custom build with that key. Delete it first if you want to replace it." There is still no row to delete |
| Open a tool's or dataset's Database/Build picker | The build is already listed as `Name (key) [Custom]` |
| Wait for the hidden jobs to finish and reload the page | The build is listed with its chromosome count |

The first, second and last rows come from a real run on `release_26.2`. The double-Save and picker rows follow from the code below (`users.py` 527-530 and `managers/dbkeys.py` 102-105).

If either conversion fails (a failed `len` job leaves `linecount` paused), the build is never listed. Its key stays taken and the page offers no way to delete it, because Delete exists only on table rows.

<details><summary>Why (dev 2cca8565861)</summary>

- `PUT /api/users/{id}/custom_builds/{key}` with `len|type=fasta` starts two converter jobs (`len`, then `linecount`). It stores the build with the `linecount` HDA id and no `count` (`lib/galaxy/webapps/galaxy/api/users.py` 573-586).
- `GET /api/users/{id}/custom_builds` leaves out any build that has no `count` and whose `linecount` HDA is not `ok` (`users.py` 599-614). Right after Save, the response doesn't include the new build:

  ```python
  for key, dbkey in dbkeys.items():
      if "count" not in dbkey and "linecount" in dbkey:
          chrom_count_dataset = trans.sa_session.get(HistoryDatasetAssociation, dbkey["linecount"])
          if chrom_count_dataset and not chrom_count_dataset.deleted and chrom_count_dataset.state == OK:
              dbkey["count"] = ...
              valid_dbkeys[key] = dbkey
              update = True
          # pending or failed: silently dropped
      else:
          valid_dbkeys[key] = dbkey
  ```

- `client/src/components/User/CustomBuilds.vue` `save()` (281-306) calls `loadCustomBuilds()` (247-256) once on success. Nothing polls, and the success alert dismisses itself after `dismissSecs: 5` (200).
- Everywhere else the build already exists. `managers/dbkeys.py` 102-105 lists every key in `user.preferences["dbkeys"]` as `[Custom]`, and the PUT duplicate-key check (`users.py` 527-530) rejects the key.

Before 6f7e8881f54 ("Don't propagate missing dbkeys", 2020), pending builds were listed without a count. That commit drops every build whose `linecount` dataset isn't `ok`, which stops listing builds whose dataset was deleted but hides pending and failed ones too.

</details>

## Context

Found while checking the GTN FAQ [`faqs/galaxy/analysis_add_custom_build`](https://training.galaxyproject.org/training-material/faqs/galaxy/analysis_add_custom_build.html) against `release_26.2`. The FAQ is embedded in the `ecology/ref-based-rad-seq` tutorial. Its last step is "Click the **Save** button", so learners land on an empty table and will reasonably decide Save failed. E2E coverage of the FASTA path (`test_build_add_from_fasta` in `lib/galaxy_test/selenium/test_custom_builds.py`) is on 🌿 [`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver). Today it waits for the history and reloads the page. With a fix, it could instead wait for the row to appear. Related, but not a duplicate: 🎯 #1034 (Custom Builds form enhancements).

## Proposed Approach

Make the GET return pending and failed FASTA builds too, with a `state` derived from the `linecount` HDA (`pending` / `ok` / `error`). `count` is already optional in `CreatedCustomBuild`. The page would show those rows as "Counting chromosomes…" or "Failed" with a working Delete. While any row is pending, it would poll `loadCustomBuilds()` until no row is pending (or a timeout passes). This fixes the empty table, the double-Save confusion and the undeletable failed build together. It also keeps the Manage page consistent with the dbkey pickers, which already list the build.

<details><summary>Approach details</summary>

- API (`users.py` `get_custom_builds`): stop dropping builds with no `count`. Keep filling in `count` when `linecount` is `ok`. Add `state: Literal["pending", "ok", "error"] | None` to `CustomBuildModel` in `lib/galaxy/schema/schema.py`, set it only for FASTA builds, and regenerate the client API types. Map HDA states: `new`/`queued`/`running`/`setting_metadata` → `pending`; `error`/`paused`/`failed_metadata`/`discarded`, deleted or missing → `error`. `paused` matters because a failed `len` job pauses `linecount` rather than erroring it.
- Keep pending builds in the write-back. Today, when another build resolves in the same request, `user.preferences["dbkeys"]` is rebuilt from `valid_dbkeys` alone (`users.py` 615-616). If that write were ever committed, it would erase pending builds. The handler itself never commits, so whether it persists is unclear, but the rebuilt dict should include every build either way.
- Deleted `linecount` HDAs (the case 6f7e8881f54 targeted) can map to `error`, so the user can delete the build instead of having it vanish.
- Client (`CustomBuilds.vue`): add a status column or badge. While any row is `pending`, poll on a modest interval (e.g. 3 s) and stop on unmount. Reword the FASTA success alert to "Build added. It will be listed with its chromosome count once Galaxy has processed the FASTA."
- Tests, red first: an API test that PUTs a FASTA build, GETs at once and expects the key to be present with a non-`ok` state (fails on dev, where the key is absent). The framework test datatypes on dev lack the `fasta`→`len`→`linecount` converters; `galaxy_ui_driver` adds them to `test/functional/tools/sample_datatypes_conf.xml`, which API tests also load. The E2E above can then drop its reload and wait for the row.

</details>

## Alternative Approaches

A client-only fix (poll after a FASTA save until the key appears, and reword the alert) is smaller. But it can't tell pending from failed, so a failed build still never shows up and still blocks its key. Counting chromosomes synchronously in the PUT would remove the pending state entirely, but it puts a scan of a possibly large FASTA inside a web request. We prefer the API change because Galaxy already treats the build as existing everywhere except this page.

<details><summary>Alternatives In Detail</summary>

### Alternative: Client-only polling

<details><summary>Description</summary>

#### Details

After a successful FASTA save, poll `loadCustomBuilds()` until the new key appears or a timeout passes. Change the alert to say the build will appear once processed. No API change.

#### Why the proposed approach is preferred

The GET returns the same thing for pending and failed builds: nothing. Polling can only time out, and the failed build stays invisible and undeletable. It also fixes nothing on a fresh visit to the page while jobs are still running.

</details>

### Alternative: Count chromosomes in the PUT

<details><summary>Description</summary>

#### Details

Read the FASTA in the request, count the `>` headers, write `count` immediately, and still start the `len` conversion for the length file.

#### Why the proposed approach is preferred

Reference FASTAs can be gigabytes, and the dataset may live in a remote object store, so the request would block on I/O. The `len` file still comes from a job, so the build would look complete before its length data exists.

</details>

</details>
