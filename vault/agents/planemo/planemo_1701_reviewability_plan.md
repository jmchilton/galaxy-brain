# Making Planemo #1701 easier to review and merge

Reviewed 2026-10-06 against [`ca2becff`](https://github.com/galaxyproject/planemo/commit/ca2becffe6fbe8dce22faad9846beed88ee99b1f), based on `b1002b01`. This is a proposed implementation sequence, not a rewritten branch. Correctness findings and reproduction results are in [the review](planemo_1701_run_package_installed_galaxy_through_gravity.md).

Follow-up: the three correctness findings were fixed, and change 1 below was extracted into [draft #1735](https://github.com/galaxyproject/planemo/pull/1735). The [runtime-only comparison](https://github.com/jmchilton/planemo/compare/recognize-yaml-galaxy-tools...package-installed-galaxy-gravity) now excludes the YAML recognition files. Changes 2 and 3 remain proposals; they were not requested in this implementation follow-up. Existing branch history was retained with a normal prerequisite merge.

## Recommendation

Keep the Gravity-backed package runtime. Move independently useful fixes and the shared-code extraction ahead of its introduction. The current single commit changes 27 files (+1,363/-309); `planemo/galaxy/config.py` alone accounts for +491/-193. A reviewer currently has to establish both that existing checkout behavior survived a large extraction and that a new backend works.

The upstream discussion already supports Gravity for this modality. A Galaxy core runtime API would be a different project and need not delay this one. See [John's explanation](https://github.com/galaxyproject/planemo/pull/1690#issuecomment-5542644258).

## Proposed sequence

| Change | Concrete scope | Evidence needed |
| --- | --- | --- |
| 1. Recognize YAML Galaxy tools | `runnable.py`'s two-line `GalaxyTool` recognition and `test_runnable.py`. Keep the runtime acceptance fixture with the runtime PR unless this fix needs it. | Recognition regression plus existing runnable tests. No Galaxy startup is needed. |
| 2. Preserve Galaxy test/result associations | `_collect_test_results` and `_run_galaxy_tool_test_case` in `engine/galaxy.py`; omit the installed engine class and runtime-specific exception diagnostics from this change. | An existing-engine regression with a tool containing multiple tests, a workflow, and another tool; reverse their input order and assert report identities, types, counts, and failures. The present installed integration test exercises mixed cases, but does not isolate this fix or cover expansion to multiple tests. |
| 3. Extract shared local configuration and daemon control | The checkout-independent configuration assembly and `_start/_detach/_stop_daemon_monitor` helpers. Initially only the checkout backend consumes them. | Characterize generated files, environment overrides, dependency paths, and database teardown against the parent commit. Cover default and explicit config directories, persistent profile paths, and both legacy and modern checkout configuration. Separate any deliberate behavior fixes from the extraction. |
| 4. Add the installed runtime | Optional dependencies, `InstalledGalaxyConfig`, backend selection, package-specific settings, CLI registration, docs, and released-package acceptance CI. | `serve`, `run`, and `test`, successful output assertions, startup failure, SIGINT and SIGTERM, repeated runs, daemon detachment/termination, and engine preservation through profiles and `autoupdate --test`. Test claimed managed PostgreSQL support against the actual backend or clearly state the narrower evidence. |

Changes 1 and 2 can be independent small PRs. Change 3 is a preparatory PR; change 4 can retain #1701's identity. A four-commit sequence is also useful if separate PRs create too much coordination. Each preparatory change should pass its own tests without requiring installed Galaxy.

Do not mechanically split the present extraction and call it behavior-preserving. It also filters `config_directory` before forwarding keyword arguments, changes where database startup occurs relative to file generation, removes creation of an explicit checkout dependency directory, and changes repeated daemon shutdown behavior. Review and test those deltas individually.

## Simplify the configuration boundary

`_prepare_managed_galaxy_config` is described as shared preparation, but takes an `installed` boolean and branches on dependency directory selection, default tool-data tables, property overrides, and config serialization. Keep shared preparation responsible for the common properties and files; let each backend normalize its settings and write its own runtime configuration after that step. The installed backend can then be reviewed mainly as additive code. The existing artifacts dataclass is a useful starting point; a new generic runtime/plugin framework would add unnecessary scope.

Reuse the existing daemon monitor. Its extraction is appropriate and avoids another implementation of process supervision. The foreground SIGTERM finding is another reason to give foreground and daemon launches a common ownership mechanism: losing the Planemo parent must stop the managed group. Keep lifecycle hardening and its tests even if they make the residual runtime patch longer.

## Make the acceptance evidence stronger

- Assert that the Gravity/monitor process group and its services have disappeared. Current acceptance tests check the Planemo parent's process group, while the new runtime intentionally launches services in a different session. A closed HTTP port alone also cannot establish that Celery exited.
- Add small CLI regressions for profile engine persistence and `autoupdate --test` engine propagation. Shared Click choices expose this engine in more commands than the three named in the PR summary; audit each command that receives the choice.
- Retain deterministic XML/YAML/workflow integration and opt-in Tool Shed coverage. Add a failing tool case so failure reports and service logs are demonstrated, not only successful execution.
- State the tested Python/Galaxy/Gravity combination in user-facing installation guidance. The extra constrains Galaxy to 26.1 but specifies `gravity>=1.2.3` without an upper bound; the current description's claim of a Gravity 1.2 bound needs correction or an intentional dependency policy change.

## Reviewer-facing description

Lead with the concrete benefit: install Galaxy once in Planemo's environment and execute tools/workflows without provisioning a checkout and its virtual environment. Include one reproducible installation and test command, the dependency/support matrix, and a brief ownership explanation: Planemo generates configuration and requests startup/cleanup; Gravity runs Gunicorn/Celery; the existing daemon monitor bounds their lifetime.

Report simple cold/warm startup measurements if available, including environment and what installation work was excluded. Keep the historical #1690/#1691 discussion to one linked paragraph. Explicitly identify interactive tools as unsupported in this runtime and document the meaning of cleanup and persistent profiles. Preserve the existing [#1708 dependency](https://github.com/galaxyproject/planemo/pull/1701#issuecomment-5670129042); after preparatory PRs merge, rebase #1701, then rebase its `test --serve` follow-up.
