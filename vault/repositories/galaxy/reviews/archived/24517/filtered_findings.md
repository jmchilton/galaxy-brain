# Filtered findings — galaxy#24517 (reviewed `ad4429e1`)

- **Streaming stores ignore a valid non-empty cached copy** (default P3 4). This re-litigates a decision the PR description states explicitly: caching stores read from their backend instead of their cache because a copy written from another host can be stale.
- **Disk raises `FileNotFoundError` for a missing object** (part of gx_test_challenger P2 2). Disproved: `DiskObjectStore._get_filename` raises `ObjectNotFound`. The parametrized disk case in `pr_24517_review_0` confirms it. The boto3 part of that finding is kept as P2 1.
- **Drop or slim the MagicMock boto3 unit tests** (part of gx_test_challenger P2 1). Not acted on. The mocked tests still pin the request shape (`Range`, `body.close`), which the integration test does not check. The finding asks only for the integration test.
