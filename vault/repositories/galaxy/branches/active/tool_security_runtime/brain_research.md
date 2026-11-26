```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/tool_security_runtime/index.md
    why: This branch's record: source pin d5f7cb05e91, parent head, and the re-sync recipe for later source commits.
  - path: vault/repositories/galaxy/branches/active/tool_security_static_findings/implementation_debrief.md
    why: What the parent kept and replaced (Rule catalog, classify(), CLI, spec trimmed to static cases) and what it stripped (runtime, codes.py); the runtime must adapt to this.
    load_when: Deciding how runtime code maps onto classify()/Rule/Uncheckable instead of _no_plain_value/RefusalCode.
  - path: vault/repositories/galaxy/branches/active/tool_security_static_findings/scope_evaluation.md
    why: Why runtime was stripped, what stays analyser-owned (mvdbeek), and the PR decompositions; bounds what the runtime branch may change in static code.
    load_when: Touching anything under lib/galaxy/tool_util/security (prefer changing the parent first).
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/initial_implementation_debrief.md
    why: What the source's spec runner, 11 RefusalCodes, docs page and harm checks do; the four review over-approximations pinned as green-only cases.
    load_when: Porting the spec job runner, cases.yml job blocks and codes.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/subagents/normal_review_1.md
    why: Prior review of exactly the runtime pieces (refusal codes lead the message because job.info is 255 chars, fail-closed code mapping, one user per SpecJobRunner, ToolInputRejected pickling, green harm needs rc 0).
    load_when: Porting or reviewing security_review.py, the spec runner and ToolInputRejected; finding 6 (Cheetah in tool-util) is stale on dev.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/index.md
    why: Decisions: default level stays enforce_code, no `enforce` alias for enforce_code, spec lives in the package, real tool XML only.
    load_when: Writing config_schema.yml entries and the docs page.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/alts/getvar_static_names.md
    why: Parked alt on resolving $getVar names; explains why reflection is refused blanket at runtime (ae52f9c3e35, 5530db35200) and that it did not converge.
    load_when: Porting reflection / getVar handling in the job check.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/alts/render_recording.md
    why: Parked render-time recording prototype; why model and user-object reads stay statically refused and the strict check stays.
    load_when: Reviewing the model/user-object access rules or tool_evaluation_strategy remote behaviour.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/plan.md
    why: Spec package shape (cases.yml, red/green, runners, codes, docs page) before the parent trimmed it.
    load_when: Restoring job cases and the docs codes section.
  - path: vault/repositories/galaxy/branches/active/tool_security_static_findings/test_challenges_debrief.md
    why: How the parent's spec/CLI tests were challenged; the strengthened expectations the runtime tests must not weaken.
    load_when: Re-adding job cases or editing test_spec.py.
  - path: vault/research/Component - Job Completion Lifecycle.md
    why: How runners call job_wrapper.fail() and what a failed job stores; context for a refusal being a decision, not an error.
    load_when: Implementing the ToolInputRejected handling in BaseJobRunner and PulsarJobRunner.
  - path: vault/projects/embedded_galaxy_in_planemo/galaxyapphelpers/10_RECON.md
    why: Seam-by-seam trace queue_job -> prepare_job -> ToolEvaluator.build, plus the exact ToolEvaluator constructor contract and what it needs from a MockApp.
    load_when: Wiring security_reviewer into get_tool_evaluator and building the spec job runner.
  - path: vault/research/Component - User-Defined Tools.md
    why: UserToolEvaluator and the user_defined / expression tool types that the reviewer skips; trust model of admin XML tools vs UDTs.
    load_when: Checking _UNREVIEWED_TOOL_TYPES and the UserToolEvaluator build() path.
  - path: vault/research/Component - YAML Tool Runtime.md
    why: UserToolEvaluator.build_param_dict versus the XML path in evaluation.py; where the check hook must not double-run.
    load_when: Placing _check_input_values in ToolEvaluator.build vs subclasses.
  - path: vault/research/Component - Dynamic Tool Manager and Toolbox Lifecycle.md
    why: Tool reload creates a new Tool object, which is what invalidates the per-process WeakKeyDictionary review cache.
    load_when: Reviewing review caching and Tool.security_review.
  - path: vault/research/Component - Galaxy Pulsar Runner Code Sharing.md
    why: Pulsar runner coupling and remote evaluation; PartialToolEvaluator.build() also runs the check where the command is built remotely.
    load_when: Reviewing the pulsar.py prepare-failure path and remote evaluation.
  - path: vault/research/Component - Tool Testing Infrastructure.md
    why: How tool XML and integration tests are loaded (driver, populators, test/functional/tools); the integration test writes its own tool XML.
    load_when: Writing or running test/integration/test_tool_security_review.py.
  - path: vault/research/Component - API Tests Tools.md
    why: API tool test conventions for the changed model_attributes test in lib/galaxy_test/api/test_tools.py, which the default-on review refuses.
    load_when: Re-applying the test_tools.py change.
  - path: vault/research/Component - Backend Logging Architecture.md
    why: Logger conventions; the review logs warnings per refused job and a summary per tool.
    load_when: Checking log levels and the captured-warning handler in the integration test.
  - path: vault/repositories/galaxy/branches/active/tool_patches/index.md
    why: Sibling branch (tool_patches_static_findings child of tool_patches); touches tool load and the same toolbox seams as Tool.security_review.
    load_when: Coordinating Tool-class edits or rebases with the tool_patches stack.
research_requests:
  - vault/agents/gx_research/todo/job_preparation_and_job_script.md
  - vault/agents/gx_research/todo/tool_evaluation_compute_environment.md
```

Notes (from code; read with `git show d5f7cb05e91:<path>` from WORKING_DIRECTORY):

- Runtime delta is small against the source's merge-base `89a8ba1d47e` (release_25.1): `lib/galaxy/tools/security_review.py` (900 lines), `app_unittest_utils/security_review_spec.py` (288), unit tests `test_security_review.py` (1105) and `test_security_review_spec.py` (99), integration test (188), and small hunks in `tools/evaluation.py` (`security_reviewer` ctor arg, `_check_input_values()` at the start of `ToolEvaluator.build` and `PartialToolEvaluator.build`), `tools/__init__.py` (`Tool.security_review()`), `jobs/__init__.py` (`get_tool_evaluator` passes `app.tool_security_reviewer`), `jobs/runners/__init__.py` and `pulsar.py` (catch `ToolInputRejected`: `job_wrapper.fail`, log.info not exception), `app.py`, `structured_app.py`, `galaxy_mock.py` (`ToolSecurityReviewer(OFF)`), `config_schema.yml` (two options), generated `galaxy.yml.sample` and `galaxy_options.rst`, `doc/source/admin/index.rst`, and `lib/galaxy_test/api/test_tools.py` (`model_attributes` test now expects the quoted-name job refused, then a plain name runs).
- Parent symbols the source runtime imports that no longer exist at HEAD (adapt, do not re-add to the static package without checking the parent first): `galaxy.tool_util.security.codes.RefusalCode` (file removed; the parent has `Uncheckable` with 5 codes and `Rule`), `report.enforced_findings`, `report.REFLECTION_RULE`, `report.CHECKED_SEVERITIES` (now `SERIOUS_SEVERITIES`), `SourceRef.param_path`, `Report.added_by_rewrites`, `charsets.enforced`. `charsets` still has the level constants and `level_of`/`LEVELS`/`DATA_HARM`. `_no_plain_value` becomes `classify(report)` (reasons and `unchecked_locations`); `RefusalCode` also carries violation, not-plain, strict-check-error and when-unsure codes that `Uncheckable` does not, so those codes need a runtime-side home. `PatternCode` is a `StrEnum` in the parent (was `str, Enum`).
- The parent targets Python 3.10+ typing (`dict`, `X | None`, `StrEnum`); the source runtime file uses `Optional`/`Dict`. Match the parent's style.
- Spec: the parent stripped job cases. At the pin, `spec/__init__.py` is 318 lines (`JobCase`, `ReviewConfig`, `JobExpectation`, `SweepJob`, `HARM_MARKER`, `iter_jobs`) vs 146 at HEAD, `cases.yml` 909 vs 375 lines, and `docs.py`/`test_spec.py` lost the red/green and codes sections. The parent added `Rule`-typed spec rules, `codes` expectations from `classify`, and one new tool (`server_python_command.xml`) the source lacks. Restoring job blocks means merging both, not reverting.
- Default behaviour change: `tool_security_review` defaults to `enforce_code` and `when_unsure` to `strict`, so any existing tool test whose values carry quotes can now be refused (hence the `test_tools.py` edit). Run only one heavy test type at a time per CLAUDE.md; unit tests first.
- Docs: the parent's `doc/source/admin/tool_security_review.md` is offline-CLI framed; the source's 1496-line page describes the config options and refusals. Its codes section is generated by `spec/docs.py` and checked by a freshness test.
- Source moved past the pin (`45231d97bac` at branch time); see the re-sync recipe in `index.md`.
- Research requests: extended two pending ones (job preparation and job script; tool evaluation and compute environment). `tool_command_templating_and_sanitizers.md` (queued by the static branch) also applies to sanitizer behaviour the strict check mirrors. No note covers config schema conventions or `MockApp`/`galaxy_mock.py`; reading the code answers those quickly.
