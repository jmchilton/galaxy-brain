# Component - Declarative YAML Test Harnesses

How Galaxy-adjacent code drives tests from YAML case files, and how to add a suite. Cover `gxformat2/testing.py` (`DeclarativeTestSuite`, `navigate()` path language, `run_declarative_case`, expectation files under `examples/expectations/`, `examples/catalog.yml` as the case index), Galaxy's `test/unit/tool_util/parameter_specification.yml` with `test_parameter_specification.py` and `framework_tool_checks.yml` (tool fixtures resolved from `test/functional/tools`), and the workflow_state `test_declarative.py` suites. Compare: where tools/fixtures live, how a case names its operation and expectations, red/green (valid/invalid) pairing, how completeness against an enum or registry is enforced, and how a suite is shipped to external consumers (package data in `galaxy-tool-util` / gxformat2 wheels, reuse from Planemo or the Tool Shed). Leave out the parameter/state representation internals (covered by `Component - Tool State Specification`) and workflow execution tests (`Component - Workflow Testing`).

## Why

Adding a distributable declarative spec (tools plus YAML cases, run by a custom runner) needed the harness conventions of both prior-art suites; they only appear scattered across `Component - Tool State Specification`, `projects/workflow_state/TOOL_PARSING_DECLARATIVE_TESTING_DESIGN.md` and `plans/TOOL_FORM_POPULATE_REFACTOR.md`, and `Dependency - gxformat2` does not mention `gxformat2.testing`.

## Requested by

- vault/repositories/galaxy/branches/active/tool_security_review_spec/brain_research.md: needed a side-by-side of the gxformat2 and Galaxy declarative harnesses to shape the security-review spec runner, case file and completeness test.
