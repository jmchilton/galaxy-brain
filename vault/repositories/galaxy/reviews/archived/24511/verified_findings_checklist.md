- [x] P2 1: Collection operation outputs copied from another user's datasets aren't charged, but are refunded on purge
- [x] P2 2: A late-cached map-over charges every element of the implicit collection for each job, overcharging another user's outputs
- [x] P3 1: History purge reload binds one parameter per HDA
- [x] P3 2: `hda.purged or` clause in `HDAManager.copy` has no effect
- [x] P3 3: Test login flow duplicated instead of reusing `_browser_session`'s
- [x] P3 4: No populator helper for copying an HDA into a history
- [x] P3 5: Recalculate-usage call inlined in two new test classes
- [x] P3 6: `test_copy_to_another_user_charges_them` repeats the integration test
- [x] P3 7: Two charging rules coexist, and charging is opt-in per call site

Other Actions:
