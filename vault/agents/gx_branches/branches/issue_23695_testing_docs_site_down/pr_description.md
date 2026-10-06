Fix 🎯 #23695 - document how to skip tests when a remote service they depend on is down.

🔀 #23685 added skip-when-down decorators for quay.io, depot.galaxyproject.org and Dockstore and applied them, with the existing WorkflowHub one, across the suite. 🔀 #23842 added `unavailable_pattern` and `skip_on_network_error`. `writing_tests.md` mentions none of it. A developer writing a test against a remote service today has to find `galaxy.util.unittest_utils` by grepping. The new section in "Avoiding External Dependencies in Tests" covers it:

| Decorator | Probes |
|-----------|--------|
| `skip_if_github_down` | `https://github.com/` |
| `skip_if_quay_down` | `https://quay.io/` |
| `skip_if_galaxy_depot_down` | `https://depot.galaxyproject.org/` |
| `skip_if_dockstore_down` | `https://dockstore.org/` |
| `skip_if_workflowhub_down` | `https://workflowhub.eu/` |
| `skip_if_toolshed_down` | `https://toolshed.g2.bx.psu.edu` (moved here, see below) |
| `skip_if_site_down(url)` | Any other `url` |

It also covers stacking decorators, skipping from setup code with `is_site_up` (as `UsesShed.configure_shed` does), and what the front-page probe misses: `unavailable_pattern` for errors behind a healthy front page and `skip_on_network_error` for connection errors and timeouts.

The branch also makes `galaxy.util.unittest_utils` the one place to import these from. `skip_if_toolshed_down` moves there from `galaxy_test.base.populators`. The "Skip Decorators" section now covers `skip_unless_executable(name)`, which was undocumented, and points `skip_unless_environ(var)`, which was listed only as an `integration_util` helper, at `unittest_utils` for any kind of test.

***It's for developers writing Galaxy's own tests (not tool tests). No test's skip behavior changes, and no existing test needs retrofitting. It documents the convention #23685 and #23842 already applied.***

***The code changes are moves, not new behavior. `populators` still re-exports `skip_if_toolshed_down`, and `integration_util` re-exports the `unittest_utils` `skip_unless_environ` instead of keeping an identical copy, so every existing import keeps working, including under mypy.***

***Skipping doesn't hide regressions. A test skips only when the probe fails, or on an explicit `unavailable_pattern` match or network error; any other failure still fails.***

***It separates "skip when down" from "flaky". Outages get skipped; other intermittent failures still go through `@transient_failure`, and the two sections now link to each other.***

<details><summary>Code changes</summary>

- `skip_if_toolshed_down` is defined in `galaxy.util.unittest_utils` beside the other per-service decorators. `galaxy_test.base.populators` re-exports it, and its two callers (`test_data_manager.py`, `test_shed_tool_tests.py`) import from the new home.
- `integration_util.skip_unless_environ` was a line-for-line copy of `unittest_utils.skip_unless_environ`. It's now the same function, re-exported explicitly (`x as x`, as mypy's `no_implicit_reexport` requires), so `@integration_util.skip_unless_environ(...)` in `test_coexecution.py` still works.

</details>

<details><summary>Where the new text lives</summary>

- New `### Skipping Tests When a Remote Service Is Down` (`{#remote_service_down}`) under "Avoiding External Dependencies in Tests".
- A pointer from the mulled "Slow 'Unit' Tests" section, whose tests hit quay.io and depot.
- A pointer from "Handling Flaky Tests", so outages aren't filed as transient failures.
- A paragraph and example after the integration "Skip Decorators" table on `skip_unless_executable` / `skip_unless_environ` (real tests: `test_docker_to_singularity`, `test_real_azure_blob_store`), linking back to the remote-service section.

Every decorator name, probed URL and example test name was checked against `lib/galaxy/util/unittest_utils/__init__.py` and existing usages (`test_workflows.py`, `test_metadata_source.py`, `uses_shed.py`).

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Builds on 🔀 #23685 and 🔀 #23842.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? N/A. Docs and test helpers only; skip messages are unchanged.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A. No new tests; the moved decorators are the same objects, checked by import identity.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] Instructions for manual testing are as follows:

<details><summary>Manual check</summary>

Build the docs (`make docs`) and read `dev/writing_tests.html#remote-service-down`. Check that the cross-links (from "Slow 'Unit' Tests", "Skip Decorators" and "Handling Flaky Tests") land on the new section. A standalone Sphinx + MyST render of the page showed no new warnings before the `skip_unless_executable` paragraph was added; fork CI's docs build covers the final page.

`skip_if_toolshed_down` and `skip_unless_environ` resolve to the same objects from their old and new import paths. `test_data_manager.py`, `test_shed_tool_tests.py` and `test_coexecution.py` collect cleanly. mypy on the changed modules plus `test_coexecution.py` is clean; with an implicit re-export it fails on `test_coexecution.py`'s `integration_util.skip_unless_environ`.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
