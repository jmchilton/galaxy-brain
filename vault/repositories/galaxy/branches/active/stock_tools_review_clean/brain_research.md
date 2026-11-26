```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/tool_patches_static_findings/scope_evaluation.md
    why: Measured the static review over Galaxy's 171 stock `tools/` tools at each severity threshold and split findings into vulnerability and capability kinds; says which findings a tool edit can remove and which describe what the tool does.
    load_when: Deciding what "no findings" can mean for the stock tools, and which findings to fix versus leave.
  - path: vault/repositories/galaxy/branches/active/tool_security_runtime/implementation_debrief.md
    why: Lists the stock and test tools refused at the default level and why (`upload1` is refused for `uncheckable-template-code`); this branch is the template-side answer to its defaults decision.
    load_when: Starting; confirming what must stay unchanged for test-tool examples.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/alts/getvar_static_names.md
    why: The parked attempt to resolve `$getVar(name)` statically; explains why reflection is refused outright and that the analyser approach did not converge, which is why the fix here is on the template side.
    load_when: Reworking `upload1` away from `getVar`, or judging whether to ask for an analyser change instead.
  - path: vault/repositories/galaxy/branches/active/tool_security_static_findings/implementation_debrief.md
    why: What the analyser (`lib/galaxy/tool_util/security/`, the CLI, `Rule` catalog, `classify()` with `Uncheckable` codes) reports and how to read a report; the measuring tool for this branch.
    load_when: Running the analyser or interpreting codes, unchecked locations and severities.
  - path: vault/repositories/galaxy/branches/active/tool_security_static_findings/scope_evaluation.md
    why: Which rules are vulnerabilities and which are capabilities, and what stays analyser-owned.
    load_when: Triaging findings by kind.
  - path: vault/repositories/galaxy/branches/active/tool_security_runtime/subagents/review_port.md
    why: Options A to D for the defaults problem, including exempting Galaxy's own tools; relevant to whether stock tools need to review clean at all.
    load_when: Questioning scope, or if a remaining finding cannot be removed.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/alts/render_recording.md
    why: Why reads of model and user objects in a template stay statically refused, which matters if a stock tool reads such objects.
    load_when: A stock tool's finding comes from `$__user__`, `$__app__` or model attribute access.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/index.md
    why: Decisions on spec location and the "real tool XML only" rule; the spec tools are copies, so changing stock tools does not change spec expectations.
    load_when: Checking which tests pin findings.
  - path: vault/research/Component - Data Fetch.md
    why: Covers `__DATA_FETCH__`, the modern import path; `upload1` is only the legacy sibling (the note has no mention of it), so use it to see how the replacement tool declares its job inputs and outputs.
    load_when: Deciding how far the `upload1` rework can borrow from `__DATA_FETCH__`.
  - path: vault/repositories/galaxy/branches/merged/composite_upload_preserve_source/pr_description.md
    why: Notes the legacy `upload1` caller in `tools/data_source/upload.py` and its `sniff.handle_composite_file` behaviour that must not change.
    load_when: Editing how the command passes output files to `upload.py`.
  - path: vault/research/Component - Tool Profile Versions and Upgrade Advisor.md
    why: Profile-gated tool behaviour; `upload1` is `profile="16.04"`, and editing legacy tool XML on a release branch must not change what a profile gate does.
    load_when: Touching a tool's `<command>`, params or `profile`.
  - path: vault/research/Component - Tool Testing Infrastructure.md
    why: How tool tests in tool XML run (framework tests, Planemo) and how tool XML is loaded outside a toolbox; needed to test edited stock tools.
    load_when: Choosing tests for edited stock tools.
  - path: vault/research/Component - Tool Linters.md
    why: Lint framework and its output-reference resolver; edited stock XML should still lint as before.
    load_when: Validating edited tool XML.
  - path: vault/research/Component - API Tests Tools.md
    why: Conventions of the API tool tests; upload tests live in `lib/galaxy_test/api/test_tools_upload.py` and are what exercises `upload1` jobs.
    load_when: Running upload API tests after the rework.
  - path: vault/research/Component - Job Completion Lifecycle.md
    why: How `finish()` treats `upload1` and `__DATA_FETCH__` outputs (hashing, metadata), a reminder that dataset output handling is shared with the tool command's output arguments.
    load_when: Only if the output argument format passed to `upload.py` changes.
research_requests:
  - vault/agents/gx_research/todo/legacy_upload_tool_and_data_source_tools.md
  - vault/agents/gx_research/todo/tool_command_templating_and_sanitizers.md
```

Notes (from code; no vault note covers these):

- No note covers the legacy `upload1` tool: `tools/data_source/upload.xml`, `UploadToolAction` and `upload_common.py` (`lib/galaxy/tools/actions/`), the paramfile special cases (`MinimalJobWrapper.__prepare_upload_paramfile` in `lib/galaxy/jobs/__init__.py`, and `param_dict["paramfile"]` in `ToolEvaluator.build_param_dict`, `lib/galaxy/tools/evaluation.py`), and `tools/data_source/upload.py`, which takes `dataset_id:files_path:file_name` arguments built by the command's output loop. A request is queued.
- No note covers Cheetah in tool commands or `ToolEvaluator` namespace construction (output dataset wrappers are added by `__populate_output_dataset_wrappers`; the request already queued by the static-findings branch is extended).
- Where the analyser lives: `jmchilton/tool_security_static_findings` (also in `tool_security_runtime` and `tool_patches_static_findings`; absent from `release_26.1`). Run it without touching the worktree by extracting `lib/galaxy/tool_util/security` and `lib/galaxy/tool_util/parser/sanitize.py` from that branch with `git archive`/`git show` into a scratch directory, appending the scratch `galaxy/tool_util` to `galaxy.tool_util.__path__` and registering the extracted `sanitize.py` as `galaxy.tool_util.parser.sanitize` (the branch moves that module) before calling `galaxy.tool_util.security.__main__.main(argv)`, using any Galaxy `.venv`'s Python. A script that does this was run against the clean worktree during this research; `--json` over `tools/` and `lib/galaxy/tools/` reviewed 204 XML files.
- Baseline measured on `origin/release_26.1`, 204 XML files (172 under `tools/`, 32 under `lib/galaxy/tools/`): 85 produce no findings and 119 produce at least one. Maximum severities: high 54, medium 19, low 46. Only two files carry an uncheckable code (`uncheckable-template-code`): `upload1` and one more under `tools/extract/`. One more tool under `tools/metag_tools/` has an unchecked location. Rule frequencies are dominated by capability kinds (`capability-network`, `capability-container`, `template-app-access`, `capability-api-key`) and injection-shaped rules on quoting and options; `template-reflection` appears in two files (three findings), `upload1` and the other file that carries the uncheckable code. A tool edit can remove the quoting and reflection findings but not capability findings, so the acceptance bar needs a definition ("no findings" versus "no vulnerability findings and no uncheckable codes"); see `tool_patches_static_findings/scope_evaluation.md`.
- `upload1` on release_26.1 reports `template-reflection` twice (the `getVar` lookup in the command, and `self.separator` in the `from_parameter` option `transform_lines`), an `option-injection` finding on the `$paramfile` argument, and the `uncheckable-template-code` note. Removing only `getVar` leaves the other three. `varExists`/`getVar` iterate `output0..outputN` in the command; the tool also has `<outputs>` declared further down in `upload.xml`.
- Test tools the security tests use as examples are under `test/functional/tools/` (for example `model_attributes`, `config_vars`, `command_reads_configfile`) and the analyser's `spec/tools/` copies; none are in `tools/`, so editing stock `tools/` does not touch them. `test_rules.py` in the security branches reviews `test/functional/tools` and the spec tools, not `tools/`.
- Callers that depend on `upload1` behaviour: `lib/galaxy/actions/library.py`, `lib/galaxy/webapps/galaxy/api/library_datasets.py`, `lib/galaxy/tools/__init__.py` (`GALAXY_LIB_TOOLS_UNVERSIONED`, `old_id in ("upload1", "__DATA_FETCH__")`), `lib/galaxy/jobs/__init__.py`, `lib/galaxy/tool_util/client/staging.py`, plus `lib/galaxy_test/api/test_tools_upload.py` and `lib/galaxy_test/base/populators.py`.
- Four other `tools/data_source/` files use `$getVar('q', ...)` in an output `label` (a different use from `upload1`'s output loop, and the analyser exempts output labels from the reflection rule as far as measured); check the whole directory when changing a pattern, not only `upload.xml`.
- Security policy: per-tool vulnerability detail from the analyser belongs in a private report, not in the vault; this file records only aggregate counts and the `upload1` reflection finding the task names.
