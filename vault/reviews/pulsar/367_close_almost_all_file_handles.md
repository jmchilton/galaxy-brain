# PR 367 — Close (almost) all file handles

PR: https://github.com/galaxyproject/pulsar/pull/367  
Author: Marius van den Beek  
Opened: 2024-06-18  
Reviewed against: `origin/master` at `135072f9d7bdc59d736026a2dcbd9ed1fd668b4d` (2026-09-10)

## Recommendation

Rescue the intent in a new PR, but do **not** rebase or replay the commit unchanged.
The problem has not been subsumed: current `master` still contains most of the
unowned `open(...)` calls fixed by PR 367, and it has acquired another one in the
current `requests_toolbelt` upload path. Explicit lifetime management is worthwhile
for long-running Pulsar processes, especially in transfer and manager code where a
callback or multipart encoder can retain the file object.

The original branch is 321 commits behind `master`, conflicts with later typing and
transport changes, contains no tests or CI results, and mixes actual leaks with
style-only rewrites of code that already closes handles safely. A curated replacement
will be smaller and easier to verify.

## What remains relevant

The following production paths on current `master` still need explicit ownership:

- `RemoteCopyAction`, `RemoteObjectStoreCopyAction`, and `MessageAction` in
  `pulsar/client/action_mapper.py`;
- the small-file reader in `pulsar/client/staging/up.py`;
- the pycurl upload file callback in `PycurlTransport.execute()`;
- the current `requests_toolbelt.MultipartEncoder` upload file;
- `MessageQueueUUIDStore` reads and writes;
- tool/config authorization reads in the base manager, authorization module, and
  toolbox;
- the Condor log-file touch, external-DRMAA command read, and stateful output touch;
- generated config and CLI JSON/YAML reads and writes;
- the cached-file source in `_handle_upload()`.

Most are short-lived under CPython because reference counting happens to finalize the
temporary object quickly. That is not a resource-management contract, does not cover
all exception paths or Python implementations, and is particularly fragile when a
library object retains the stream.

## Changes from the original patch

### Omit already-safe churn

Do not carry these parts forward merely to replace `try/finally` with `with`:

- both `copy_to_path()` implementations and their `_copy_and_close()` helpers;
- `pulsar.util.copy_to_temp()`;
- `JobDirectory.read_file()` and `JobDirectory.write_file()`;
- `ActiveJobs.activate_job()`, which immediately calls `.close()` already.

Those implementations already guarantee closure. Removing them keeps the replacement
focused on observable resource lifetime rather than broad stylistic modernization.
The `manager_factory` read has independently been converted to a context manager, and
the old `poster` transport and vendored PasteScript module no longer exist.

### Preserve stream lifetime through blocking transfers

For pycurl and requests multipart uploads, opening and closing must surround the
blocking `perform()` or `requests.post()` call. Do not create a stream in a short
inner context and pass its callback/encoder outside that context. The code that opens
the stream should close it on both success and exception; `copy_to_path()` should not
start closing caller-owned input streams because it also receives request bodies and
other externally owned file-like objects.

The replacement should also explicitly close all three pycurl `Curl` objects in
`execute()`, `post_file()`, and `get_file()`. PR 367 closed the upload file but missed
the Curl handles themselves.

The current requests transport has a related, more significant omission introduced
after PR 367: `get_file()` calls `requests.get(..., stream=True)` without closing the
`Response`, including when `raise_for_status()` fails. Context-manage that response
around status checking and iteration. Context-managing the `post_file()` and
`get_size()` responses at the same time gives the module a consistent ownership rule.

### Preserve current semantics and typing

- Keep the base manager's current binary reads; the old branch predates that change
  and its text-mode hunk must not win a conflict resolution.
- Retain current annotations, formatting, HTTP status handling, retry behavior, and
  the requests fallback added on `master`.
- Use module-level imports if a helper such as `contextlib.closing` or `ExitStack` is
  introduced.

## Tests for the replacement

Add focused lifetime tests rather than relying only on functional transfer tests:

- a fake Curl object records that `close()` is called after success and after
  `perform()` raises, and a tracked upload stream records the same;
- requests multipart upload keeps the stream open during `requests.post()` and closes
  it afterward, including an exception path;
- the streaming requests response is closed on successful download and HTTP error;
- a representative action/manager or cached-upload test asserts that a source opened
  by Pulsar is closed after copying.

Then run the targeted action, routes, manager, scripts/config, and transport test
modules plus the normal unit, lint, formatting/diff, and type checks.

## Suggested commit structure

1. Adapt Marius's mechanical production-handle fixes onto current `master`, preserving
   his authorship while dropping deleted, independently fixed, and already-safe hunks.
2. Add the current transport resource fixes and regression tests as a clearly
   described follow-up commit if that work is materially beyond his original patch.

One PR is still a coherent unit: it establishes explicit ownership of resources opened
by Pulsar without changing public APIs or transfer behavior.
