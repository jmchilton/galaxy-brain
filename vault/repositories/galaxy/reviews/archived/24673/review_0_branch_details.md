# Review branch `pr_24673_review_0`

Branch `pr_24673_review_0` sits on top of the reviewed commit `7db61c5f53a`. Six of its eight commits only touch tests. They run the HDA copy module with production's `autoflush=False`, build its engine from the shared fixtures, and pin claims the PR makes but no test held: a copy doesn't block ordinary updates of its source, `copy_from_job` locks outputs in id order, copies keep `deleted`, and the swap reaches copies of copies. The API regression test also asserts the element's state and visibility. The two model changes are small: `_lock_and_load_copies` loads copies through the relationship after the lock instead of restating its join, and `copy()` takes the source lock once per transaction. Nothing on the branch changes the lock protocol.

- `54a8eef5e85` Run HDA copy tests with autoflush off, as production sessions do. Switches the module to a `_session` helper using `autoflush=False`.
- `c7204844402` Build the HDA copy test engine from the shared model test fixtures. Reuses `url` and `disposing_engine`, drops the redundant registry load, and restores the global object store on teardown.
- `8f60d93267a` Test that an open HDA copy does not block updates of its source. Adds `test_open_copy_does_not_block_updates_of_source`, which goes red with `FOR SHARE`.
- `f76a5cc10fa` Test that a late cache hit locks job outputs in id order. Adds `test_copy_from_job_locks_outputs_in_id_order`, which deadlocks without the ordered lock.
- `73568f20f96` Test deleted copies and copies of copies under a late cache hit. Strengthens `test_copy_from_keeps_visibility_of_copies` and adds `test_copy_from_reaches_copies_of_copies`, both red without their restores.
- `e5e3ba8704a` Load HDA copies through the relationship after taking the swap lock. Replaces the restated query and merge with an expire and reload, and the concurrent test now loads the collection before the lock so it goes red without the expire.
- `5d9d6dd37d8` Lock the source of an HDA copy once per transaction. Remembers the locking transaction on the HDA and adds `test_repeat_copies_lock_source_once_per_transaction`, taking a 100 x 100 cross-product loop from 20,000 lock statements to 200.
- `84df9eb8a7a` Assert the state and visibility of the cached build list element. Strengthens `test_run_cat1_use_cached_job_build_list`.
