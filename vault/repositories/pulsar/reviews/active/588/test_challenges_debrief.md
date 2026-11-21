# Test challenges debrief — pulsar#588

- Profile: generic_test_challenger
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `44de4be5a65c7bcbe9bf10c03fc83a44ac4855ba`

## Verification run

- At head: `test_copy_sets_executable_bits_only_for_tool_files` (2 cases) and `test_staged_tool_files_keep_executable_bit` (4 cases) all pass (~6s for the four integration cases).
- Red check: with `pulsar/` reset to `origin/master` and the PR's tests kept, `[tool-0o750]` and all four integration cases fail (`[input-0o640]` passes, as it should since it's the negative case). This backs up the PR's claim that each case fails without its fix.

## Per-test challenge

### `test/client_staging_test.py::test_staged_tool_files_keep_executable_bit`

- Implementation-mirroring? No. It runs `submit_job` against a real Pulsar app (embedded `LocalPulsarInterface` and a real HTTP server), waits for the job to finish, and checks outcomes: the staged helper is executable, a non-executable tool file stays non-executable, and the job really ran the helper through its shebang (`helper_ran` exists). This is the test style we want.
- Silly? No. One case per staging route (`copy`, `transfer` embedded, `transfer` HTTP, which exercises `asbool` on the string argument, and `remote_copy`, which exercises `preprocess`). `remote_transfer`/TUS/rsync/scp/object store share the `preprocess` path, so one representative is enough.
- Mocks? None. The tool is a `SimpleNamespace(id, version, tool_dir)`. `pulsar.client.test.check.MockTool` already has this exact shape, so using it would make one less ad-hoc stand-in (cosmetic; see P3 1 in the review).
- `_pulsar_client` helper: I found no existing embedded-vs-HTTP client fixture in `test/` (`test_utils` has `test_pulsar_app` / `server_for_test_app` but nothing that pairs them with `build_client_manager`), so a new local helper is fine. If a second caller shows up, move it to `test_utils.py`.
- `client.clean()` isn't in a `finally`, but `test_pulsar_app` removes the staging directory anyway, so nothing leaks.

### `test/transfer_action_test.py::test_copy_sets_executable_bits_only_for_tool_files`

- Implementation-mirroring? Mostly not. It checks the observable mode after `put_file`. It also covers two things the integration test doesn't: the umask non-widening rule (`0640` destination becomes `0750`, not `0751`), and the `input` type getting no execute bits.
- Mock: `mock.patch.object(client, "_raw_execute", ...)` stubs the server's `path` reply. This matches the existing `test_hardlink_staging_in_and_out` in the same file, and it's the smallest seam that still runs the TOOL gating in `put_file`. Calling `pulsar.client.util.copy(..., preserve_executable=True)` directly would drop the mock but lose the gating check, so keep it.
- Using a pre-created `0640` destination to stand in for umask 027 (copyfile keeps an existing destination's mode) is a neat, deterministic trick, and the comment explains it.

## Coverage gaps considered (not recommended)

- **Non-widening on server paths** (`routes.upload_file`, `preprocess`): they share `add_executable_bits` with the copy path, which the unit test covers. Asserting exact modes in the integration test wouldn't tell widening from correct behaviour under the usual umask 022, so it's not worth adding.
- **`InputCachingJobClient`** (`cache=True`): `executable` rides along in `args` with `cache_token`, and the route applies it after `_handle_upload`. It works by inspection. The caching client is beta, and an extra parametrized case would cost more setup than it's worth.
- **Extending `pulsar/client/test/check.py`** (the shared harness behind `test/integration_test.py`, which already stages a tool dir across copy/remote_copy/scp/rsync/MQ/cached/as_user): adding an executability assertion there would cover more actions. But `pulsar-check` also runs against deployed servers, so an older server would start failing the check. Leave it as is.
- No unit test of `add_executable_bits` / `is_executable` on their own. That's right: the behaviour is covered through callers, and per REVIEW_FOCUS we don't add tests just for coverage.

## Test plan

No drops, rewrites or restructures recommended. Optional only: replace the `SimpleNamespace` tool with `MockTool` (P3 1).
