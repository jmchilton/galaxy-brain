- [x] P2 1: No test that an open copy leaves ordinary source updates unblocked
- [x] P2 2: `Job.copy_from_job` and its id-ordered locks are never exercised
- [x] P3 1: Repeat copies of one source re-issue the lock on a row the transaction already holds
- [x] P3 2: `_lock_and_load_copies` restates the relationship's join
- [x] P3 3: Tests leave `deleted` retention and copies of copies unguarded
- [x] P3 4: Tests run with `autoflush=True`, production with `autoflush=False`
- [x] P3 5: `engine` fixture repeats shared fixtures and leaks a global object store
- [x] P3 6: Existing API regression test asserts little
- [x] P3 7: `visible` save/restore around `copy_from` now lives in three call sites

Other Actions:
