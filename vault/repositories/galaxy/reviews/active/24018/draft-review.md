# Unposted review draft — request changes

Reviewed commit: `0adbdb6655216e7a04c3d9e47816d3f06747fc31`.

The fake-executable tests cover a lot of the platform environment machinery. I found three cases where readiness and execution disagree, plus two introduced test failures that explain the red CI checks.

1. **Keep all foreign requirements usable together** — `lib/galaxy/tool_util/deps/resolvers/conda.py:443`. If `samtools` and `bwa` exist as separate foreign environments but the merged environment does not, routing accepts the platform and resolution returns both as `MergedCondaDependency` objects. Their successive activation commands replace the active environment, so only the last package stays on PATH. I reproduced this using real Conda activation: both requirements resolved, routing chose ARM, then `samtools` returned 127 and `bwa` succeeded. The native individual fallback instead populates one job-specific environment. Could we preserve that combined-environment contract for foreign platforms, and make platform availability agree with it?

2. **Preserve tool context in the platform check** — `lib/galaxy/jobs/__init__.py:1209`. The command-generation call passes `installed_tool_dependencies`, `tool_dir`, and the other tool context, but the check repeats resolution with only `platform` and `return_null`. With a real Tool Shed resolver and a valid installed dependency, an explicitly native `platform: linux-64` generated the expected PATH command, then this context-free check rejected it as unresolved. Reusing the command-generation resolution result, or sharing one contextual resolution method, would avoid that inconsistency.

3. **Check the selected container, rather than container enablement** — `lib/galaxy/jobs/__init__.py:1203`. `docker_enabled` / `singularity_enabled` do not guarantee a container was found for this tool. Bare fallback jobs can therefore bypass the missing-platform-dependency check and get no dependency commands. I reproduced the wrapper returning `[]` for an unresolved foreign requirement with `docker_enabled: true`. `command_factory` already calls dependency generation for bare jobs and containers that request dependency resolution, so its existing distinction seems the right place to rely on.

4. **Keep app tests out of the standalone metrics package** — `test/unit/job_metrics/test_core.py:13`. The new `galaxy.jobs` import breaks standalone `galaxy-job-metrics` test collection, including `test_env.py` which imports this test module. Both package CI versions show `ModuleNotFoundError: No module named 'galaxy.jobs'`. Could the wrapper-warning tests move to `test/unit/app/jobs/`?

5. **Make the fake executable fixtures portable** — `test/unit/tool_util/test_conda_multiplatform.py:109`. A raw `#!{sys.executable}` breaks when the interpreter path contains a space, as it does in the `galaxy root` CI checkout. Both unit artifacts have 42 failures in this new file; a minimal interpreter-path-with-spaces probe reproduces the initial `FileNotFoundError`. The fake signer has the same shebang pattern. Also, three local macOS tests fail because `/bin/true` is hardcoded; it lives at `/usr/bin/true` here. Explicit Python invocation/a quoting wrapper and the existing `FakeSigner` fixture should avoid those assumptions.

Local validation: 109 focused tests passed, with the three `/bin/true` failures above. The three correctness cases were separately reproduced with actual resolver/wrapper methods and real Conda activation; foreign hardware and real package installation were not exercised. The two integration failures in the downloaded artifact are Docker Hub pull-rate limits. Python lint CI also reports 14 introduced mypy errors across six changed files, so its failures need attention beyond the executable fixtures.

A small runner integration test with two separately installed package commands would cover the main contract without a heterogeneous cluster. An explicitly native destination with a contextual resolver and a container-enabled destination with no selected image would cover the other boundaries.

## Risks

The main one-way risk is establishing administrator configuration and dependency-resolution behavior for heterogeneous destinations, including which declared tool requirements are considered runnable.

<details><summary>Risk Details</summary>

- Global/resolver options, destination `platform`, and the routing helper become interfaces used by deployed site configurations.
- Tool requirement sets must remain usable together across native and foreign paths.
- Creation, backfill, retries, deletion, and locks affect persistent environments shared by concurrent jobs.
- Actual Conda activation and macOS signing must agree with the environment readiness markers.
- Disabling these options is relatively reversible, leaving extra environment directories; deployed routing and configuration contracts will be harder to change later.

</details>

<details><summary>Risk Review Advice</summary>

I would focus human review on the combined-environment contract, contextual native resolvers, and actual container selection, and exercise these through command execution. Shared-prefix concurrency and signing still deserve verification on the real test rig; the local probes do not establish those cross-host guarantees.

</details>
