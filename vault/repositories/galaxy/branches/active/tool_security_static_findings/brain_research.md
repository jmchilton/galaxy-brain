```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/index.md
    why: Source branch record (stacked on mvdbeek's tool-security-review-on-load, base release_25.1); decisions on spec location and the "real tool XML only" rule.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/initial_implementation_debrief.md
    why: What each source commit built (spec package, codes, docs page, review fixes) and the findings along the way; tells which hunks are static and which are runtime job-check cases (harm, fault, config).
    load_when: Choosing which commits and hunks to cherry-pick or drop.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/subagents/normal_review_1.md
    why: Prior review of the spec runner, codes, docs drift guard and packaging; items 3 and 6 (code mapping, Cheetah not in tool-util requirements) bear on the port.
    load_when: Reviewing the port; note finding 6 is stale, see Notes below.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/plan.md
    why: Shape of spec/, cases.yml, runners, codes and docs page; the red/green case model whose job halves need runtime and must be trimmed or kept as data only.
    load_when: Deciding what of cases.yml and the docs page survives without enforcement.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/alts/getvar_static_names.md
    why: Parked alt for resolving `$getVar(name)` statically; the working branch refuses reflection. Explains why `reflection`-style findings are blanket and why the approach did not converge.
    load_when: Porting reflection/getVar handling in interp.py or touching known_helpers.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/alts/render_recording.md
    why: Parked alt (render-time recording of unsanitized views); explains the static refusal of model and user-object reads and why it stays.
    load_when: Porting the app_model / user-object capability rules.
  - path: vault/research/Component - Tool State Specification.md
    why: Prior art for Galaxy's declarative YAML specs (parameter_specification.yml, framework_tool_checks.yml, runner, fixtures); model for cases.yml plus completeness tests.
    load_when: Reviewing the spec runner, the case schema and completeness tests.
  - path: vault/research/Component - Tool Linters.md
    why: Lint framework, Linter discovery and profile gating; relevant if findings are surfaced via lint later and for keeping the static module free of linter coupling.
    load_when: Deciding whether anything integrates with galaxy.tool_util.lint.
  - path: vault/research/Component - Tool Testing Infrastructure.md
    why: How tool XML is loaded in unit tests and by Planemo; relevant to the offline CLI loading tools via get_tool_source (macros) and to Planemo reuse of the packaged spec.
    load_when: Testing the CLI and the spec runner against real tool XML.
  - path: vault/research/Component - YAML Tool Parser and Authoring Model Boundary.md
    why: Where tool sources are built (get_tool_source, get_expanded_tool_source, macro expansion); the CLI and review read tool sources the same way outside a toolbox.
    load_when: Checking the CLI's loading of macro-using tools and YAML tools.
  - path: vault/research/Problem - basic.py Parameter Hierarchy.md
    why: Parameter classes, validators and sanitizer handling that the analyser's validators.py/values.py model against a ToolSource.
    load_when: Reviewing parameter-type value modelling.
  - path: vault/research/Component - Tool XML Collection Commands.md
    why: Collection wrappers in Cheetah commands (element identifiers, groups) that the static review treats as value sources.
    load_when: Reviewing collection-related findings and spec tools.
  - path: vault/research/Component - Collection Tool Execution Semantics.md
    why: How collections and identifiers reach templates via wrappers; grounds the static source model for element identifiers and tags.
    load_when: Judging element-identifier and group-tag sources.
  - path: vault/research/Component - User-Defined Tools.md
    why: Trust model contrast (admin Cheetah XML tools vs sandboxed UDTs); frames the docs page's scope and threat-model language.
    load_when: Editing the docs page intro and scope statements.
  - path: vault/projects/workflow_state/TOOL_PARSING_DECLARATIVE_TESTING_DESIGN.md
    why: Design for declarative testing over tool fixtures; only if the spec runner is to be aligned with gxformat2.testing.
    load_when: Questioning the standalone spec runner.
  - path: vault/repositories/galaxy/branches/active/tool_patches/index.md
    why: Sibling branch (tool_patches_static_findings is a child of this one) touching tool load; shares dev as base and cross-links to this record.
    load_when: Coordinating with tool_patches or its static_findings child.
research_requests:
  - vault/agents/gx_research/todo/tool_command_templating_and_sanitizers.md
  - vault/agents/gx_research/todo/declarative_yaml_test_harnesses.md
```

Notes (from code; no vault note covers these):

- No note covers Cheetah templating, `ToolParameterSanitizer`, or the evaluator's `build_param_dict` / `__sanitize_param_dict` (new request queued above). `tool_evaluation_compute_environment` (pending) is runtime-side and mostly not needed for a static-only port.
- Source branch `jmchilton/tool_security_review_spec` (head `d5f7cb05e91`) vs `origin/dev` touches 94 files. Static piece: `lib/galaxy/tool_util/security/` (`__init__`, `__main__`, `capabilities`, `charsets`, `codes`, `interp`, `judge`, `known_helpers`, `model`, `nodes`, `patterns`, `report`, `sed`, `shell`, `template`, `validators`, `values`, `spec/`), tests under `test/unit/tool_util/security/`, `packages/tool_util/MANIFEST.in` (two `include` lines for `spec/*.yml` and `spec/tools/*.xml`), `doc/source/admin/tool_security_review.md` + `index.rst` toctree entry. Runtime-only (drop): `lib/galaxy/tools/security_review.py`, `tools/evaluation.py`, `tools/__init__.py` (`Tool.security_review`), `app.py`, `structured_app.py`, `galaxy_mock.py`, `jobs/__init__.py`, `jobs/runners/*`, config schema/sample/`galaxy_options.rst`, `app_unittest_utils/security_review_spec.py`, `test/unit/app/tools/test_security_review*.py`, `test/integration/test_tool_security_review.py`, `lib/galaxy_test/api/test_tools.py`.
- Mixed pieces to trim: `spec/__init__.py` has job-case models (`JobCase`, `ReviewConfig` with `mode` / `when_unsure`, `fault`, `harm`) and `cases.yml` red/green job blocks that only the runtime runner executes; `spec/docs.py` renders them into the docs page, and `test_spec.py` asserts `rejected` / `codes` on jobs and "every code has red and green jobs". `codes.py` `RefusalCode` is the runtime refusal vocabulary and `patterns.py` (path/option/argument injection codes) is gated by runtime modes. The docs page (1496 lines) describes `tool_security_review` / `tool_security_review_when_unsure` config and job refusals; it needs reframing as static findings.
- `sanitize.py` move: the source branch moves `lib/galaxy/tools/parameters/sanitize.py` to `lib/galaxy/tool_util/parser/sanitize.py` (plus `basic.py` import, `interface.py` docstring, `mypy.ini` section, `doc/source/lib/galaxy.tool_util.parser.rst` / `galaxy.tools.parameters.rst`). On `origin/dev` the file is still at `lib/galaxy/tools/parameters/sanitize.py`; check whether the analyser imports it from `tool_util` (the review code in `galaxy.tool_util.security` imports no `galaxy.tools.*`), so the move (or an equivalent) is a prerequisite.
- Packaging: the prior debrief says Cheetah is not a `galaxy-tool-util` requirement. That is stale on dev: `packages/tool_util/pyproject.toml` (packaging moved from setup.cfg) lists `galaxy-util[template,image-util]`, and `galaxy-util[template]` pulls CT3. Still needed: confirm MANIFEST.in / package-data (`[tool.setuptools]` in pyproject.toml) ships `spec/` yml and xml, and that `anthropic` stays an optional lazy import in `judge.py` (it is, via try/except).
- Docs conventions: admin pages are Markdown or rst under `doc/source/admin/` listed in `index.rst`'s toctree; API stubs under `doc/source/lib/` are autogenerated per package (`galaxy.tool_util.rst` plus subpackage files), so a new `galaxy.tool_util.security` package needs stub entries if the repo keeps them in sync. Prior page kept code fences untagged because prettier rewrites embedded YAML; a freshness test compares the generated section.
- Prior art on disk: `test/unit/tool_util/parameter_specification.yml` + `test_parameter_specification.py` in WORKING_DIRECTORY; `~/projects/repositories/gxformat2/gxformat2/testing.py`.
