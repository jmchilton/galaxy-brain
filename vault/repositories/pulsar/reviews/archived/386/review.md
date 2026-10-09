# PR 386 — Drop stdout and stderr from message status

PR: https://github.com/galaxyproject/pulsar/pull/386

## Conclusion

The underlying problem has **not** been subsumed: current Pulsar `master` still embeds tool `stdout` and `stderr` in the completion status, and issue #384 remains open. The existing commit should **not** be rebased unchanged, however. It removes the fields and the manager interface wholesale, which is an avoidable API break and is not compatible with current Galaxy's completion path.

A focused replacement PR is worthwhile: preserve the manager API and status fields, but cap the two inline tool streams to 64 KiB each while building the status response. That implements the backward-compatible direction agreed in the original PR discussion and addresses the reported oversized binary `stdout` without requiring coordinated Galaxy deployment.

## Blocking concern in the original patch

Current Galaxy still initializes tool output from the status response:

```python
tool_stdout = unicodify(run_results.get("stdout", ""), strip_null=True)
tool_stderr = unicodify(run_results.get("stderr", ""), strip_null=True)
```

Galaxy has a file fallback, but it only assigns file contents when these values are `None`. Omitting the keys produces empty strings, so the fallback does not activate. For remote staging, output collection also happens later in `finish_job`, after the attempted file read. Consequently, PR 386 as written can silently lose the tool streams in Galaxy even though the files are eventually transferred.

The patch also removes `stdout_contents` and `stderr_contents` from `ManagerInterface`, `ManagerProxy`, and `DirectoryBaseManager`. That is broader than needed to constrain a transport message and unnecessarily breaks the public manager abstraction.

## Recommended rescue

- Retain `stdout` and `stderr` in the completed status schema.
- Retain `ManagerInterface.stdout_contents()`, `stderr_contents()`, and their implementations.
- Introduce a clearly named 64 KiB status-stream limit in `pulsar/manager_endpoint_util.py` and truncate the byte strings before `unicodify`. This bounds the serialized payload more accurately than truncating decoded characters and avoids changing configured file-reading behavior elsewhere.
- Add focused `full_status` tests proving:
  - short stdout/stderr are unchanged;
  - long stdout/stderr are capped at exactly 64 KiB;
  - the keys remain present;
  - return code and the other completion metadata remain unchanged.
- Preserve Marius van den Beek's authorship when carrying the intent into the replacement commit, while documenting that the implementation now uses the backward-compatible design agreed in the PR thread.

Pulsar's default `maximum_stream_size` is currently 1 MiB, but deployments can configure it higher (the incident used an 8 MiB setting). A hard response cap is therefore still useful even with the safer default.

## Scope caveat

This is a targeted fix, not a complete upper bound on completion-message size. `job_stdout`, `job_stderr`, and especially directory-content lists can also enlarge the payload; the June 2026 comment on issue #384 reports a potential millions-of-files case. That should remain follow-up work rather than expanding this small rescue PR.

