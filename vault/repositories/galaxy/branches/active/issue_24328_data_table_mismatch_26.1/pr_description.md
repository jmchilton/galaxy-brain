Fix 🎯 #24328 - installing IUC `data_manager_fetch_index_maf` leaves Galaxy unable to start.

Galaxy core and that data manager both define `indexed_maf_files`, with different columns. After the install, the next boot dies with no hint about which file or repository is responsible:

```
AssertionError: Merging tabular data tables with non matching columns is not allowed: indexed_maf_files:{'name': 0, 'value': 1, 'dbkey': 2, 'species': 3} != indexed_maf_files:{'name': 0, 'value': 1, 'indexed_for': 2, 'exists_in_maf': 3, 'path': 4}
```

With this PR, the same state stops startup with:

```
galaxy.exceptions.ConfigurationError: Data table 'indexed_maf_files' is already registered with columns {'name': 0, 'value': 1, 'dbkey': 2, 'species': 3}, refusing to register conflicting columns {'name': 0, 'value': 1, 'indexed_for': 2, 'exists_in_maf': 3, 'path': 4} from file '/srv/galaxy/var/shed_tool_data_table_conf.xml' (installed by repository iuc/data_manager_fetch_index_maf revision 3483c363dc6b from toolshed.g2.bx.psu.edu). To start Galaxy, remove the <table name="indexed_maf_files"> element from '/srv/galaxy/var/shed_tool_data_table_conf.xml' or remove the other definition of 'indexed_maf_files'; tools that rely on the removed definition will not work until the conflict is resolved.
```

That's real output from `_configure_tool_data_tables` against those two `<table>` definitions (paths shortened). The fix it names is the workaround the reporter confirmed on the issue.

***Healthy 26.1 servers already refuse this install, but a data manager install could switch that check off for the rest of the server's run. This PR stops that, so installs can't write the conflicting `<table>` any more.*** The install check (#22679) compares against the live registry, and `handle_missing_data_table_entry` emptied that registry after any data manager install whose tools reference a table not yet registered. Every later install in the same run skipped the check, which fits the reporter's batch of data manager installs through ephemeris. A new test installs a data manager, then a conflicting table: it's refused with this PR, and goes through on `release_26.1`.

***Galaxy still refuses to start on a conflicting table; it doesn't skip it.*** Skipping (as in #19855) would boot with the data manager's table silently missing. ***A server that's already broken still needs the conflicting `<table>` removed by hand, but the error now names the element and the file.***

***Servers without a conflicting table boot exactly as before.*** The other change they see is that data manager installs no longer empty the registry of the running server.

***The core vs IUC name collision on `indexed_maf_files` isn't fixed here.*** That's a tools-iuc rename. This PR makes Galaxy refuse the install cleanly instead of failing on the next restart.

***This targets `release_26.1`, where the install check exists.*** 26.0 has the same startup crash but different install code, so it would be a separate port.

<details><summary>What each commit does</summary>

1. **Declare `columns` on `ToolDataTable`** (refactor). Every concrete table sets it, so the `getattr(..., "columns", None)` fallback in `assert_data_table_consistency` and the `existing.columns is not None` guard in `install_tool_data_tables` were dead.
2. **Halt startup with an actionable error.** `load_from_config_file` checks each table's columns before merging it, and the `DataTableColumnMismatch` names the file and installing repository. `_configure_tool_data_tables` re-raises it as a `ConfigurationError` with the fix.
3. **Don't wipe Galaxy's data tables in `handle_missing_data_table_entry`.** Drops the `reset_tool_data_tables()` call, the root cause. `reset_tool_data_tables` stays for its one Tool Shed caller (`lib/tool_shed/tools/tool_validator.py`), with a comment saying Galaxy must not call it. Tested by keeping core tables registered across the call, and by refusing a conflicting install after it.
4. **`merge_tool_data_table` raises `DataTableColumnMismatch`** instead of a bare `assert`, so the check survives `python -O` and every column conflict has one exception type.
5. **Name the shed config regardless of load order.** With admin-ordered sources the shed config can load before the core one; the error now carries the existing table's config files and points at the shed config either way.

</details>

## Risks

No one-way doors. Two behavior changes: column conflicts raise `ConfigurationError`/`DataTableColumnMismatch` instead of `AssertionError`, and data manager installs stop emptying the running server's data table registry. Startup halts in the same cases as before.

<details><summary>Risk Details</summary>

- Callers on these paths only catch `Exception` broadly (`add_new_entries_from_config_file`, `handle_sample_tool_data_table_conf_file`, the queue worker's reload), which covers both exception types. Nothing catches `AssertionError` specifically.
- `DataTableColumnMismatch.__init__` and `ToolDataTableManager.assert_data_table_consistency` gain optional `config_filename` and `repository_info` keyword arguments; existing calls are unchanged.
- Tables registered by earlier installs in the same server run now stay registered after a data manager install.
- For a conflict between two shed tables, the message points at the later one, which may be the newer install. It also offers removing the other definition.
- When admin-ordered `tool_data_table_config_path` loads the shed config before the core one, the message still names the shed config but can't name the installing repository.
- A conflict between two core configs raises a bare `DataTableColumnMismatch` naming the file, without the fix hint.

</details>

<details><summary>Risk Review Advice</summary>

Check that dropping `reset_tool_data_tables()` from `handle_missing_data_table_entry` is safe. The call is a leftover from the Tool Shed, where the registry was throwaway. In Galaxy nothing refills the emptied registry until restart, because `reload_tables()` only reloads tables that are already registered. Also check the wording of the startup message, since it's what admins will act on.

</details>

## Context

Builds on 🔀 #22679, which added the install-time `DataTableColumnMismatch` check this PR keeps from being bypassed. Alternative to #19855, which skips conflicting tables at startup. Alternative kept on 🌿 [`issue_24328_data_table_mismatch_26.1_alt_skip_at_startup`](https://github.com/jmchilton/galaxy/tree/issue_24328_data_table_mismatch_26.1_alt_skip_at_startup) - startup logs and skips the conflicting shed `<table>`, so Galaxy boots without the data manager's table; registry-wipe and typed-merge commits are the same. Alternative kept on 🌿 [`issue_24328_data_table_mismatch_26.1_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24328_data_table_mismatch_26.1_alt_original_scope) - the skip version without the typed `merge_tool_data_table` error.

## Agentic Checks

Scope, thermo, second-model and baseline reviews ran before the switch from skipping to halting at startup; a separate review of that switch had no blockers, and its fixes went in.

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep: covers both Galaxy-side causes from the issue's root-cause comment, startup and the registry wipe.</summary>

- Declined: moving `reset_tool_data_tables` to the Tool Shed (public method on a release branch), atomic strict `load_from_config_file` and `reload_from_files` (pre-existing, off the main install path), a 26.0 port (different install code; separate branch if wanted), admin-visible reporting beyond the log, and the tools-iuc rename.
- The commits split cleanly (refactors, startup, wipe, typed merge) if reviewers prefer several PRs.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural blockers; the root fix is a two-line deletion.</summary>

- The column check exists in both `assert_data_table_consistency` and `merge_tool_data_table`; both raise the same type, and merge guards the reload path.
- Follow-ups for dev: move `reset_tool_data_tables` to the Tool Shed side, make `reload_from_files` atomic, decompose `tool_util/data/__init__.py` (already over 1k lines before this branch).

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Rewrote the startup test against a real <code>GalaxyAppConfiguration</code>; kept the other four.</summary>

- The startup test runs `MinimalGalaxyApplication._configure_tool_data_tables` on a small stub app against a real `GalaxyAppConfiguration`, for both core-first and shed-first source order.
- All 5 tests it reviewed fail on the refactor-only lib: four with the original `AssertionError` escaping `pytest.raises`, one at its own assertion (`set() == {'all_fasta', 'core_table'}`).
- No integration test: the behavior is a startup failure, and there's no pattern for asserting a server fails to boot.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings.</summary>

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Two refactor-only commits lead; each fix is its own commit.</summary>

</details>

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? Galaxy refuses to start with a `ConfigurationError` naming the table, both column sets, the shed config file, the installing repository and revision, and the `<table>` to remove.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They load real config XML and loc files into real registries and check the admin-facing message and the registry contents.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A. The two leading commits are refactor-only, and every new test is a red bug test.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- New: `test/unit/app/test_tool_data_table_startup.py`, three tests in `test/unit/tool_util/data/test_tool_data.py` and two in `test/unit/tool_shed/test_data_table_manager.py`. Each fails on `release_26.1` at the bug: the original `AssertionError`, the emptied registry, or a conflicting install that isn't refused.
- Locally the unit suites for startup, `test/unit/tool_util/data`, `test_data_table_manager.py` and `test_install_manager.py` pass (46 tests).

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
