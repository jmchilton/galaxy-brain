# Filtered findings

- **gx_test_challenger P3 1: drop the mock-store test as redundant.** Filtered. The PR description lists this test explicitly. It is also the only test that forces `indexes_written == 0`. The real-store test passes through either branch and never asserts that its populate wrote nothing, so a change to populator dedupe would quietly stop it covering the new lag check.
