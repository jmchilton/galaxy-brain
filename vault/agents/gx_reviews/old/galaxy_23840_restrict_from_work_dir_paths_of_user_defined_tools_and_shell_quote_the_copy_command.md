# galaxy #23840 - [26.1] Restrict from_work_dir paths of user-defined tools and shell-quote the copy command

- PR: https://github.com/galaxyproject/galaxy/pull/23840 (mvdbeek), base `release_26.1`
- Head: `435a2958909`
- Reviewed: 2026-10-01
- Worktree: `~/projects/worktrees/galaxy/pr/23840`

## Summary

Two commits:
1. `IncomingUserToolOutputDataset.from_work_dir` gets a `field_validator` that rejects absolute, empty, `.`/`..`, and NUL paths. The lexical check from the configfile `filename` validator (#23826) moves into a shared `is_relative_subpath()` in `tool_util_models/tool_source.py`.
2. `__copy_if_exists_command` (`lib/galaxy/jobs/command_factory.py:304-322`) now `shlex.quote`s source and destination for every tool. `*`/`?` stay unquoted so glob outputs keep expanding. Before this, the copy line used double quotes and ran on the host after the container exited, so `$()`, backticks and `$VAR` in the path were expanded on the host.

**Verdict: approve the quoting fix. It is correct, small, and fixes a real host-side injection.** One significant gap remains in the "restrict to working directory" half (finding 1). It could be fixed here or tracked as a coordinated follow-up. Because this PR is public, finding 1 is probably better raised privately.

Verified:
- New and existing tests pass locally: `test_user_tool_output_paths.py`, `test_command_factory_work_dir_outputs.py`, `test_command_factory.py` (54 passed).
- CI: the only reds are `test_find_anaconda_download_url` on 3.8/3.10, an `api.anaconda.org` read timeout. Unrelated.
- Gate: the unprivileged create path validates the payload as `UserToolSource` (`managers/tools.py:209`, `api/dynamic_tools.py`). The admin path refuses `class: GalaxyUserTool` (`managers/tools.py:164`). `agents/custom_tool.py` also goes through `UserToolSource`. So the validator applies to user-defined tools only, as intended.
- Admin tool regressions: none found. All 2645 distinct `from_work_dir` values in tools-iuc and tools-devteam were checked. None contain `$`, backtick, `~`, `..`, a leading `/`, `[`, `{` or a backslash. Every one keeps its meaning under the new quoting. The odd one is `from_work_dir="tree.dat*.dist "` (mothur unifrac, trailing space): it was quoted literally before and still is. The validator does not touch XML tools.
- Merge forward: `dev` has the same unquoted copy line. The PR's files auto-merge cleanly onto `origin/dev`. The other conflicts in a release→dev merge are unrelated.

## Findings

### 1. High - symlinks bypass the working-directory restriction; host `cp` follows them

The new validator is lexical. The existing runtime guard (`jobs/runners/__init__.py:419`, `in_directory(source_file, tool_working_directory)`) runs when the command is built, before the job has created the file. Its realpath step therefore sees nothing.

The copy then runs on the host, outside the container (`command_factory.py:118-125` puts the work-dir copy after `containerize_command`). `[ -f ]` and `cp` both follow symlinks. A user-defined tool controls the contents of its working directory, so a path that passes the validator can still resolve outside the working directory when the host copies it.

I confirmed this locally with a scratch variant of the PR's own `_run_job_command` harness (not committed). A working-dir entry that is a symlink to a file outside the job directory had that outside file's content copied into the destination dataset. The same happened for a symlink inside a `precreate_directory` source.

This is the one collection path still unhardened:
- `discover_datasets` already rejects escaping symlinks at collection time (`job_execution/output_collect.py:589`, `ensure_path_in_directory`, from 64360a61721).
- `discover_target_directory` uses `safe_path_from_directory` after the job finishes.

Fix options (pick one):
- For user-defined tools, check the realpath after the job, before the copy. Either emit a containment guard into the copy line, or do the copy/claim in Python where `ensure_path_in_directory` (`model/store/discover.py:94`) is already available, as discover_datasets does.
- Note that user tools may legitimately `ln -s` an input as an output. The allowlist should be "inside the working dir, or a staged input path", not "no symlinks". `safe_contains(..., allowlist=...)` already supports this.
- Admin tools commonly symlink inputs as outputs. Any blanket change for all tools needs the same allowlist, so gating on user-defined tools is the lower-risk first step.

Because this is a public PR, I'd raise this privately (security channel) rather than in the PR thread.

### 2. Low - the validator is fail-fast UX; the runtime guard is the real backstop

The PR body says the model "accepted any string... including absolute paths and `..`". That is true of the model. At runtime, though, `in_directory` already dropped `..` and absolute values before this PR, logging via `log.exception` (`runners/__init__.py:421-426`).

So the validator is good defense in depth and gives a clear save-time error, and tools saved before the change are still covered at runtime. Rewording the PR description would stop readers from concluding that stored pre-existing tools are exposed to traversal. No code change needed.

### 3. Low - `discover_datasets.directory` on user tools isn't validated at save time

`FilePatternDatasetCollectionDescription.directory` (`tool_outputs.py:90-93`) is "relative to the job working directory" but has no model check. At runtime it is already safe (`safe_path_from_directory` with realpath, after the job). Applying `is_relative_subpath` to it in the user-tool models would make both path fields fail-fast the same way. Optional.

### Non-findings
- Quoting covers the only place the work-dir copy is built. Pulsar passes `include_work_dir_outputs=False` (`runners/pulsar.py:617`) and stages through its own client. Kubernetes doesn't emit the copy. godocker uses the same `build_command`.
- `__quote_preserving_globs` preserves the previous glob semantics exactly (`"foo"*"bar"` → `foo*bar`, with `[`/`{` still literal). Newlines and quotes inside path parts are handled by `shlex.quote`.
- Imports are at module top. Moving the helper into `tool_util_models` instead of reusing `galaxy.util.path.safe_relpath` is justified: `galaxy-tool-util-models` depends only on pydantic and typing-extensions. `safe_relpath` also accepts `a/../b`.
- Tests: the copy tests actually execute the generated script under `sh`, which is the right level. They are not trivial or weakened. The existing expectations in `test_command_factory.py` were updated to the new quoting, not loosened. They could live in `test_command_factory.py` instead of a new module, but that is not worth changing.

## Draft review

_This review was posted by Claude (AI assistant) on behalf of jmchilton._

The quoting change looks right to me. Moving the copy line from double quotes to `shlex.quote`, while keeping `*`/`?` live, keeps the old glob behaviour. I checked every distinct `from_work_dir` in tools-iuc and tools-devteam (about 2.6k) and none change meaning under the new quoting. The new tests run the generated script under `sh`, which is the right level for this. The unit failures in CI are the `api.anaconda.org` timeout and look unrelated. The change also merges forward to `dev` cleanly, and `dev` has the same copy line.

Small things:

- The runtime `in_directory` check in `get_work_dir_outputs` already dropped `..` and absolute `from_work_dir` values before this PR. So the new validator mainly gives fail-fast feedback at save time and adds defense in depth; previously saved tools were not open to lexical traversal. It might help to say so in the description.
- Optional: `discover_datasets.directory` on user-tool outputs could use the same `is_relative_subpath` check, so both path fields fail at save time the same way. Runtime is already safe there.

I have one more comment about the scope of the working-directory restriction, which I'll send through the security channel rather than here.

Approving the quoting fix.
