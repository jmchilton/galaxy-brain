# Implementation debrief — Planemo #1757

Implemented and pushed as [`4177dcf4`](https://github.com/jmchilton/planemo/commit/4177dcf4a78180d69dc8829ef486f76ff5f2137d) on [`embedded-user-tool-workflows`](https://github.com/jmchilton/planemo/tree/embedded-user-tool-workflows).

## Ownership and root cause

This is Planemo setup work. Galaxy already imports embedded `GalaxyUserTool` definitions and exposes role creation with `role_type: user_tool_execute`. A pristine Galaxy dev checkout ran the regression successfully without core changes.

gxformat2 normalizes an embedded tool into `tool_representation` without `tool_id`. Planemo's toolbox discovery dereferenced `tool_id` anyway; native exports carrying an embedded definition and an ID could also be mistaken for toolbox dependencies. After bypassing discovery, the managed user lacked the role Galaxy requires for embedded-tool import.

## Changes

- Reuse the existing recursive workflow walker and skip embedded definitions during toolbox discovery.
- Detect embedded user tools in local native and format2 workflows, including nested and linked subworkflows.
- Before managed import, grant the workflow user a `user_tool_execute` role when needed. Reuse active permission roles and replace deleted ones exposed by older user-role APIs.
- Share the existing beta-format setting across local and Docker-managed configurations.
- Add discovery, permission, nested/native/linked, and external-isolation regressions plus a runnable container-based workflow fixture.

External Galaxy permissions and direct TRS imports are outside the provisioning change.

## Verification

- Before implementation, the discovery regressions failed on base `5ff07fa8` with the reported `KeyError`; native mixed discovery also included the embedded tool's ID incorrectly. Permission regressions failed at the missing-provisioning assertion.
- `PLANEMO_SKIP_GALAXY_TESTS=1 make test TESTS='tests/test_galaxy_workflow_utils.py tests/test_galaxy_config.py tests/test_galaxy_serve.py tests/test_galaxy_activity.py tests/test_linked_subworkflows.py'`: **89 passed, 5 skipped**.
- `make lint`: **passed** (flake8, Black, isort, Ruff).
- Optional targeted mypy check found one pre-existing `GalaxyInstance(url=...)` optional-string error in `api.py`; the same diagnostic reproduced on the unmodified master file. No new touched-file diagnostics.
- Real managed `planemo test --docker` of `tests/data/wf_user_tool.gxwf.yml` against pristine Galaxy dev `c93175dc985`: **1/1 passed**, including `hello` output assertion. Existing Galaxy dependencies were reused; bootstrap used `--skip-venv --skip-wheels --skip-client-build`. No Galaxy source modifications or manual role provisioning.
- [Fork CI](https://github.com/jmchilton/planemo/actions/runs/40381754222) queued after the push.

The smoke test used local Galaxy with Docker job execution. The Docker-hosted Galaxy engine's environment generation is covered locally; a full container-hosted deployment was not exercised.

## Reviews and handoff

Normal review identified deleted-role reuse; fixed with active-role intersection and regression coverage. Hardening removed duplicate recursion through the existing walker. Neither review left a blocker.

The code branch is committed, pushed, clean, and waiting for fork CI. No PR opened. Automatic approval review twice rejected saving `pr_description.md`, interpreting the shared no-description instruction as applying to this feature work. No bypass was attempted; the description-dependent polishing steps await explicit user approval. See [polishing debrief](polish_debrief.md).
