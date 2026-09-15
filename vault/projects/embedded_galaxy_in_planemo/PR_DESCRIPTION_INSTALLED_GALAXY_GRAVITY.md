# Run package-installed Galaxy through Gravity

This supersedes #1690 and #1691 with a narrower implementation of the package-installed Galaxy idea.

## Motivation

#1690 explored running Galaxy directly inside Planemo's Python process. The discussion there, particularly [this review comment](https://github.com/galaxyproject/planemo/pull/1690#issuecomment-5512616053), made a good case that Planemo should not own a second Galaxy process-management implementation.

#1691 moved the package-installed approach to Gravity, but retained history and interface surface from the broader experiment. This PR rebuilds that approach cleanly on current `master`.

## What this PR does

- Adds one explicit `installed_galaxy` engine for `planemo serve`, `run`, and `test`.
- Runs the Galaxy packages installed alongside Planemo exclusively through Gravity.
- Adds an `installed_galaxy` package extra, currently bounded to Galaxy 26.1 and Gravity 1.2.
- Supports Galaxy XML tools, YAML `GalaxyTool` definitions, native Galaxy workflows, Tool Shed dependency installation, and the existing `postgres_singularity` database mode.
- Gives foreground and daemon executions explicit process-group cleanup so Galaxy, Gunicorn, and Celery do not leak across Planemo invocations.
- Exercises the released packages in a Python 3.13 CI job.

Install the optional runtime with:

```console
pip install 'planemo[installed_galaxy]'
```

Then select it explicitly, for example:

```console
planemo test --engine installed_galaxy path/to/tool.xml
```

## Deliberate differences from #1690

This does **not** expose the `embedded_galaxy` engine, an in-process/non-Gravity entry point, or knobs for choosing between embedded and Gravity lifecycle implementations. `installed_galaxy` has one meaning: use the packaged Galaxy runtime and let Gravity manage its services. Existing Galaxy checkout and Docker engine defaults are unchanged.

The original `embed_galaxy` and `gravity-installed` branches remain available for comparison, while #1690 and #1691 are closed in favor of this consolidated implementation.

## Validation

- Focused unit and lifecycle suite: 48 passed.
- Released-package integration suite with Galaxy 26.1.1 and Gravity 1.2.4: 3 passed, 1 external-service test deselected.
- Real Tool Shed workflow integration test: passed separately.
- `tox -e lint`: passed.
- `tox -e mypy`: passed.

The deterministic released-package tests run in CI. The real Tool Shed case remains an opt-in integration test so Tool Shed availability does not gate every pull request.
