- [x] P2 1: The existing `*_purged` tests never purge; fold the new current-version checks into them
- [x] P2 2: Current-version `deleted` is visible through the API, so those checks don't need the ORM
- [x] P2 3: No test reaches the `full_delete()` branch the PR rewrote
- [x] P2 4: Tests address the library dataset by the LDDA id
- [x] P3 1: The version test belongs in an integration test, not in per-file ORM helpers in an API module
- [x] P3 2: Comment says a purged entry "can never be undeleted", but nothing enforces that yet
- [x] P3 3: Add a `LibraryPopulator.delete_library_item` helper

Other Actions:
