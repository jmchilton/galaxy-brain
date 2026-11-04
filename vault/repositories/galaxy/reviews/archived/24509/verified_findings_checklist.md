- [x] P2 1: Nothing pins the "ldda.update_time is not stamped" design choice
- [x] P2 2: No test that a dataset still used by a history survives the chain
- [x] P3 1: `--force-retry` leaves `library_dataset.purged IS NULL` rows unpurged
- [x] P3 2: Under `--force-retry`, the log reports library datasets the run didn't change
- [x] P3 3: Audit rows untested
- [x] P3 4: Duplicated "delete library dataset" test code instead of a populator helper
- [x] P3 5: The PR body's `--dry-run` "inspect first" recipe under-reports

Other Actions:
