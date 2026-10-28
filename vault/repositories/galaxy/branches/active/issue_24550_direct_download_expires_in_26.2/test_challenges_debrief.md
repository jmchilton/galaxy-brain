Run via Claude Opus 5.5 at high effort.

# Test challenges (re-harden, post re-scope)

Top-line: no test changes. All 11 branch tests kept; fresh run 207 passed / 16 skipped in `test/unit/objectstore/`.

Red check (base `lib/galaxy/objectstore` from `edcff857f56` swapped into worktree, then restored): 8 non-baseline tests fail at assertions (lifetimes 86400 vs 3600, missing `to_dict` key, no ValueError, 600 not honored). Baseline tests (boto3/azure default 3600) pass on base; s3 + cloud baseline values moved 86400 -> 3600 in the impl commit, as intended behavior change.

Challenges:
- Implementation-only? No: each goes through `get_direct_download_url` and asserts the lifetime handed to the provider SDK, or through config parse + `to_dict`.
- Mocks: `MagicMock`/`patch` only at SDK boundary (boto3 client, boto `Key`, azure `generate_blob_sas`, cloudbridge bucket), matching existing direct-download tests in the file. No reusable fake exists for these SDKs; a fake would be bigger than the tests. Kept.
- Restructure to drop mocks? Lifetime is a plain attribute; asserting it alone would be implementation-testing. SDK-call capture is the real behavior. No refactor.
- `_default` parse test overlaps with boto3 default lifetime test but adds XML path; kept.
- Parametrize default/configured pairs: considered, declined (would merge across baseline/impl commits for cosmetic gain).
- API/E2E: not applicable; presigned URLs need real cloud creds, config-only feature.
- writing_tests.md: unit layer appropriate.

Not acted on: SDK-boundary mocks (no better seam), parametrization (cosmetic).
