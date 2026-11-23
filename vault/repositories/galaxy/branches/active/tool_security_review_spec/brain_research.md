```yaml
documents:
  - path: vault/research/Component - Tool State Specification.md
    why: Galaxy's declarative YAML spec prior art (parameter_specification.yml, framework_tool_checks.yml, runner, fixture tools, how-to guides for adding cases); the closest model for the red/green case file and completeness checks.
    load_when: Designing the case-file schema, the runner and the completeness test.
  - path: vault/projects/workflow_state/TOOL_PARSING_DECLARATIVE_TESTING_DESIGN.md
    why: Worked design for reusing gxformat2.testing (DeclarativeTestSuite, navigate() path language, run_declarative_case) as a declarative harness over Galaxy tool fixtures; says what needed zero harness changes.
    load_when: Deciding whether the spec runner reuses gxformat2.testing or stays standalone.
  - path: vault/plans/TOOL_FORM_POPULATE_REFACTOR.md
    why: Another YAML-expectation regression gate in Galaxy; shows how cases are laid out and compared against real tool fixtures.
    load_when: Comparing case-file shapes and expectation styles.
  - path: vault/research/Component - Tool Testing Infrastructure.md
    why: Tool XML test parsing, loading and execution plus Planemo's role; relevant to shipping tools plus cases for Planemo/Tool Shed reuse and to how real tool XML is loaded in unit tests.
    load_when: Wiring the runner to real tool loading; planning Planemo reuse.
  - path: vault/research/Component - Collection Tool Execution Semantics.md
    why: How collections and element identifiers reach tool templates via wrappers (lib/galaxy/tools/wrappers.py); the job-context fixtures for collection element identifiers must match this.
    load_when: Materializing collection and element-identifier context in the runner; judging which values flow into templates.
  - path: vault/research/Component - Tool XML Collection Commands.md
    why: Tool-author view of DatasetCollectionWrapper in Cheetah commands (paired/list iteration, identifiers); informs tool XML for collection cases.
    load_when: Writing spec tools that use collection identifiers in a command.
  - path: vault/research/Component - Tool Linters.md
    why: Lint framework, Linter discovery and profile gating; the Planemo/Tool Shed lint reuse path for a static template review, and the output-reference resolver shared with runtime.
    load_when: Planning how the static review could be exposed as a linter or run on load, and Planemo/Tool Shed reuse.
  - path: vault/research/Problem - basic.py Parameter Hierarchy.md
    why: Structure of lib/galaxy/tools/parameters/basic.py (parameter classes, validators, sanitizer handling, isinstance dispatch); the security model reads parameter types, validators and sanitizers from it.
    load_when: Reasoning about what values each parameter type can emit into a template.
  - path: vault/research/Component - YAML Tool Parser and Authoring Model Boundary.md
    why: Where tool sources are built from disk or dicts (get_expanded_tool_source, galaxy-tool-util loaders); the review reads outputs and declarations through a tool source, and the spec must load tools the same way outside a toolbox.
    load_when: Loading spec tool XML in the runner and in galaxy-tool-util.
  - path: vault/research/Component - User-Defined Tools.md
    why: Contrasts trust models (admin-vetted Cheetah XML tools vs sandboxed UDTs) and the broader security hardening around tool execution; context for what the static review does and does not promise.
    load_when: Writing the docs section on scope and threat model.
  - path: vault/research/Component - Tool State Dynamic Models.md
    why: Pydantic models for the 12 tool-state representations; reference for how parameter values are typed per representation when the case file supplies parameter values.
    load_when: Deciding how case parameter values are validated or converted.
  - path: vault/research/Component - Collection Models.md
    why: HDCA / DatasetCollectionElement structure needed to materialize real model objects for collection cases.
    load_when: Building collection model objects in the runner.
  - path: vault/repositories/galaxy/branches/active/issue_25040_collection_paths_rewrite_26_2/brain_research.md
    why: Pointer set for the tool-facing wrapper accessors (DatasetFilenameWrapper, DatasetCollectionWrapper) and compute-environment hooks that evaluation goes through; includes the embedded-test example of running a tool end to end.
    load_when: Materializing dataset wrappers, metadata and compute environments in the runner.
  - path: vault/research/Component - YAML Tool Runtime.md
    why: Describes UserToolEvaluator.build_param_dict versus the XML path in lib/galaxy/tools/evaluation.py and which model objects evaluation needs; sibling evaluator the hook in ToolEvaluator should not break.
    load_when: Checking that the ToolEvaluator hook is placed where XML and YAML tools diverge.
  - path: vault/research/Dependency - gxformat2.md
    why: Overview of gxformat2 (note does not cover gxformat2.testing, which is the prior art; read the source at ~/projects/repositories/gxformat2/gxformat2/testing.py and examples/ directly).
    load_when: Only for orientation before reading gxformat2/testing.py, examples/expectations and examples/catalog.yml.
research_requests:
  - vault/agents/gx_research/todo/declarative_yaml_test_harnesses.md
  - vault/agents/gx_research/todo/tool_evaluation_compute_environment.md
```

Notes (no document covers these; from the code at WORKING_DIRECTORY):

- No note covers the ToolEvaluator `build_param_dict` / `__sanitize_param_dict` path (`lib/galaxy/tools/evaluation.py`) or per-parameter sanitizers and validators; the existing ToolEvaluator mentions are YAML-tool specific. Read the code.
- No note covers galaxy-tool-util package data (`MANIFEST.in` / `setup` package_data for `lib/galaxy/tool_util`), needed to ship the spec XML and YAML in the wheel.
- Prior art on disk: `test/unit/tool_util/parameter_specification.yml` + `test_parameter_specification.py` in WORKING_DIRECTORY; `~/projects/repositories/gxformat2/gxformat2/testing.py`, `examples/expectations/`, `examples/catalog.yml`.
