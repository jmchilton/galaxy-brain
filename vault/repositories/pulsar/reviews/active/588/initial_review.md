# galaxyproject/pulsar#588 — initial review (default profile)

- Profile: `default` (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `44de4be5a65c7bcbe9bf10c03fc83a44ac4855ba`

## Verdict

Request changes, small. The fix targets a real bug, and the new end-to-end test is good: it runs a real Pulsar app and covers copy, transfer (embedded and HTTP) and remote_copy. The PR's 6 new tests pass locally. One real bug, though. `remote_hardlink` also gets the `executable` flag, so the server chmods the hardlinked inode. That inode is Galaxy's original tool file, and when the Pulsar user doesn't own that file the job fails. The flag also gets decided in two places, which is why the hardlink exclusion was missed (see "Abstraction level").

## Bugs

### P1 1 — `remote_hardlink` chmods Galaxy's original tool file, and fails the job when Pulsar doesn't own it

`TransferTracker.handle_transfer_source` (`pulsar/client/staging/up.py`, the `executable = type == path_type.TOOL and is_executable(path)` line) sets `executable` for every remote action, `remote_hardlink` included. `preprocess` (`pulsar/managers/staging/pre.py`) then calls `add_executable_bits(path)` after `RemoteHardlinkAction.write_to_path` has done `hardlink(self.path, path)`. So `path` is the source inode, and the PR description's claim that "the `hardlink` actions are unchanged" holds only for the client-side `hardlink`.

It triggers whenever the source is executable for some class but has a read bit without the matching execute bit, e.g. `0744` or `0754`:

- Same owner: the original tool file in Galaxy's tool directory is widened, e.g. `0744` → `0755`. Reproduced with a direct `preprocess` call on a `remote_hardlink` setup entry carrying `"executable": True`. The source went from `0o744` to `0o755`.
- Different owner (Pulsar runs as another user than the one owning the tool directory, a common setup): `os.chmod` raises `PermissionError`. The call sits outside `action_executor.execute`, so it isn't retried. The exception propagates to `_handling_of_preprocessing_state` (`pulsar/managers/stateful.py`), which stores `JOB_FILE_PREPROCESSING_FAILED` and marks the job FAILED. Before this PR the job ran.

Fix: never request execute bits for actions that share the source inode. Do this on the client, and guard in `preprocess` too, since older clients won't send the flag anyway but a future client might. The second option under "Abstraction level" does both. Red-to-green: add `("remote_hardlink", "embedded")` to `test_staged_tool_files_keep_executable_bit`, using a `0744` helper and asserting the source mode is unchanged after staging.

## Abstraction level

**Short answer:** Applying the bits once per transport is the right level. Pulsar really does have three different writers: a client-side copy into the job directory, the `upload_file` HTTP and local route, and the server-side `preprocess`. Server-side remote staging is already funneled through `preprocess`, and the AMQP, relay, coexecution and HTTP `setup` paths all reach it through `remote_staging["setup"]`. So a single setup-entry key covers every remote transport, and that part is placed well. The weakness is where the *decision* is made. The client computes `executable` in two places, `JobClient.put_file` and `TransferTracker.handle_transfer_source`. Each call site re-derives "tool file and executable", and neither asks the action whether it writes a new inode. That gap is P1 1. The copy path also computes something different from the other two, and that gap is P3 1.

**Coverage check (no missed routes for the reported symptom):**
- `copy`: `put_file` copy branch. Covered.
- `transfer` over HTTP or `LocalPulsarInterface`: `upload_file`. Covered. With `InputCachingJobClient`, `args["executable"]` is set before `_upload_file`, so the `cache_token` path keeps it. `_handle_upload` writes the file, then the bits are added. Covered.
- Remote actions (`remote_copy`, `remote_transfer`, TUS, rsync, scp, object store): `preprocess`. Covered. Message-queue (`MessageJobClient` publishing `setup`), relay and coexecution `submit` all reach `StatefulManagerProxy._launch_prepreprocessing_thread` → `preprocess`. Covered.
- Whole-directory remote transfer (`__add_remote_staging_input(action, None, type)` in `handle_transfer_directory`) sends no flag. No action sets `whole_directory_transfer_supported = True` today, the branch asserts `not self.rewrite_paths`, and tool directories are always walked per file (`__upload_tool_files` passes `directory=`). Out of scope.
- `hardlink` and `remote_hardlink` share the source inode and should be excluded. Only the client-side `hardlink` is (P1 1).

**Is there an existing abstraction to carry the flag?**
- `BaseAction.to_dict()` and the action's `source` dict: every `from_dict` passes `action_dict["source"]` through, so a `source["executable"]` entry would survive deserialization for free in all remote actions. But `upload_file` and the client-side `copy` never see a serialized action. `put_file` only gets `(path, input_type, name, contents, action_type)`. Moving the flag there helps only the transport that already has a single entry point, and it doesn't remove the HTTP argument. It's not worth the churn over the current setup-entry key, which sits beside `name` and `type`, the other per-file staging metadata.
- Pushing the chmod into each action's `write_to_path` would scatter it across about eight classes. Worse.

### P2 1 — Decide execute bits once, in `TransferTracker`, and let the action say whether it writes a new inode

Recommendation: keep the three apply points, but move the decision to the single client choke point that already knows the action, the type and the source path:

```python
# action_mapper.py
class BaseAction:
    shares_source_inode = False      # True on HardlinkAction, RemoteHardlinkAction

# staging/up.py — TransferTracker.handle_transfer_source
action = self.__action_for_transfer(source, type, contents)
executable_bits = 0
if type == path_type.TOOL and not action.shares_source_inode and not contents:
    executable_bits = stat.S_IMODE(os.stat(source["path"]).st_mode) & 0o111
...
response = self.client.put_file(path, type, name=name, contents=contents,
                                action_type=action.action_type,
                                executable_bits=executable_bits)
...
self.__add_remote_staging_input(action, name, type, executable_bits=executable_bits)

# client.py — put_file applies what it is given, with no path_type knowledge
#   transfer: if executable_bits: args["executable"] = executable_bits  (route: add_executable_bits(path, int(executable)))
#   copy:     copy(path, pulsar_path); add_executable_bits(pulsar_path, executable_bits)
# pre.py: if setup_action.get("executable") and not action.shares_source_inode:
#             add_executable_bits(path, <mask or 0o111 for a bare True>)
```

This removes the duplicated `is_executable` checks in `client.py` and `up.py`, along with `copy(..., preserve_executable=)` and `copy_executable_bits`. It fixes P1 1 structurally rather than with a special case, and gives all three routes the same semantics (P3 1). The wire format stays compatible in both directions. If a mask feels like too much, keep the bool and only add `shares_source_inode` plus the single decision point. That alone fixes P1 1.

## Nits

### P3 1 — Execute bits differ by transport

`copy` mirrors the source's own execute bits (`copy_executable_bits` passes the source's `st_mode`). `transfer` and the remote actions send a bool, and the server adds `0o111` wherever there's a read bit. A `0744` source under umask 022 stages as `0744` via `copy` but `0755` via `transfer` or `remote_copy`. That's harmless in practice and never widens the umask, but it's an avoidable inconsistency. Sending the mask, as in P2 1, makes them match.

### P3 2 — `preprocess` type hint is now wrong

`setup_actions: List[Dict[str, str]]` now holds a bool under `"executable"` (and already held a dict under `"action"`). Use `List[Dict[str, Any]]`.

### P3 3 — `is_executable` and the `type == TOOL` check are duplicated

The client checks the same condition in `client.py` (`put_file`) and `up.py`. P2 1 subsumes this. If P2 1 is declined, at least share a helper.

## Tests

- `test_staged_tool_files_keep_executable_bit` is a good integration-level test: a real app, real `submit_job`, and the job actually runs the helper. It also negatively checks a data file.
- Missing: a `remote_hardlink` case (see P1 1).
- `test_copy_sets_executable_bits_only_for_tool_files` is a unit test of the copy branch that the integration test's `copy` case already covers. It's still useful as the only check of the umask-masking semantics (`0640` → `0750`), so keep it.
- Ran locally at the reviewed commit (scratch venv, Python 3.11): `pytest test/client_staging_test.py test/transfer_action_test.py -k executable` gave 6 passed.
