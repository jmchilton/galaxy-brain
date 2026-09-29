# galaxy#23141 — Return a clear error for malformed tool ids in guid_to_repository

- PR: https://github.com/galaxyproject/galaxy/pull/23141 (SAY-5, +53/-1, 2 files, fixes #23139)
- Worktree: `~/projects/worktrees/galaxy/pr/23141` @ `6cb065e3564` (base dev)
- Prior review: mvdbeek commented ("fix looks great, test adds little — remove or add positive cases"); author added positive-case test.

## Verdict

Approve. Small, correct fix. No blocking bugs. One optional hardening suggestion below.

## What it does

`guid_to_repository` (`lib/tool_shed/managers/repositories.py`) replaced `shed, _, owner, name, rest = tool_id.split("/", 5)` with a length check (raises `RequestParameterInvalidException` -> 400) plus index-based `owner, name = parts[2:4]`.

Side benefit, confirmed by red run on base: the old unpack also blew up on *well-formed* 6-part guids (`host/repos/owner/name/tool_id/version`, "too many values to unpack"). The PR fixes that too.

## Checks

- **Callers**: only live caller is `trs_tool_id_to_repository_metadata` (`lib/tool_shed/managers/trs.py:111`), a TRS API path, so a request exception is the right type. `trs_tool_id_to_repository` has no callers; `index_tool_ids` caller in `api2/repositories.py:163` is commented out. No breakage.
- **Imports**: `RequestParameterInvalidException` already imported at top of file (line 31). Test imports at top too.
- **Guid shapes**: TRS guids are built by `decode_identifier` as `f"{repositories_hostname}/repos/{owner}/{name}/{tool_id}"`, then `remove_protocol_and_user_from_clone_url`. Correct for `host[:port]/repos/...`, with or without trailing version.
- **Existing helper?** No dedicated guid parser to reuse. The existing convention elsewhere (`tool_shed_client/trs_util.encode_identifier`, `galaxy/tool_shed/util/repository_util.py:222,529,544`, `tool_panel_manager.py:299`) splits on `"/repos/"`, not on fixed slash indexes.

## Finding (optional, not a regression)

**Path-prefixed tool sheds parse wrong.** `repositories_hostname` comes from `config.tool_shed_url` or `request.base` (`lib/tool_shed/context.py:149`), and either can carry a path prefix (e.g. `https://example.org/toolshed`). Then the guid is `example.org/toolshed/repos/owner/name/tool`, and index parsing gives `owner="repos", name="owner"`. The lookup returns `None`, and the caller hits an AttributeError, so the result is still a 500. Base failed here too (unpack error), so this isn't a regression. It is cheap to fix by splitting on `/repos/` like the rest of the codebase:

```diff
-    parts = tool_id.split("/", 5)
-    if len(parts) < 5:
-        raise RequestParameterInvalidException(f"Malformed tool id '{tool_id}'")
-    _shed, _, owner, name = parts[:4]
+    _shed, sep, rest = tool_id.partition("/repos/")
+    parts = rest.split("/")
+    if not sep or len(parts) < 3:
+        raise RequestParameterInvalidException(f"Malformed tool id '{tool_id}'")
+    owner, name = parts[:2]
```

Same accept/reject behavior for the existing tests. It also handles prefixed hosts.

(Out of scope, noting only: a well-formed id for a nonexistent repo still returns `None` despite the `-> Repository` annotation, so it 500s downstream in `get_repository_metadata_by_tool_version`. That would be a separate follow-up.)

## Tests

`PYTHONPATH=lib ~/projects/repositories/galaxy/.venv/bin/python -m pytest -q test/unit/tool_shed/test_repositories_manager.py`

- PR head: 2 passed.
- Base `repositories.py` (test file kept): 2 failed. The malformed test fails with `ValueError: not enough values to unpack (expected 5, got 3)`, which is the exact Sentry error. The positive test fails with `too many values to unpack (expected 5)`.
- Red->green confirmed. Worktree restored clean at PR head.

## Draft GitHub comment

> _Posted by Claude (AI assistant) on behalf of jmchilton._
>
> Looks good, thanks. Confirmed the new tests are red on dev and green here. The positive case also catches that the old unpack failed on well-formed 6-segment guids (`host/repos/owner/name/tool_id/version`).
>
> Optional, non-blocking: if the tool shed is served under a path prefix (`tool_shed_url = https://example.org/toolshed`), the guid becomes `example.org/toolshed/repos/owner/name/tool`, and fixed-index parsing picks `owner="repos"`. Splitting on `/repos/` (as `encode_identifier` and `repository_util` already do) would cover that:
>
> ```python
> _shed, sep, rest = tool_id.partition("/repos/")
> parts = rest.split("/")
> if not sep or len(parts) < 3:
>     raise RequestParameterInvalidException(f"Malformed tool id '{tool_id}'")
> owner, name = parts[:2]
> ```
