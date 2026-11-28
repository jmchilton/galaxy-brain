```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/stock_tools_review_clean/scope_evaluation.md
    why: The sibling branch's measured results and decisions for the same job on stock tools (what "clean" meant, which findings were fixed versus left as capability or false positive, the quoting patterns used); the closest template for this branch.
    load_when: Starting; deciding the acceptance bar and what to leave unchanged.
  - path: vault/repositories/galaxy/branches/active/stock_tools_review_clean/test_challenges_debrief.md
    why: How the sibling validated edited tools (render comparison base versus head, tool tests with a scratch tool conf, analyser before/after counts) without changing behaviour.
    load_when: Planning validation of the edited fixture tools.
  - path: vault/repositories/galaxy/branches/active/stock_tools_review_clean/subagents/review_retarget_25_1.md
    why: A normal review of the sibling, showing what reviewers checked for argv and quoting changes (`./`, `--`, framework behaviour of wrappers and sanitization).
    load_when: Briefing the review subagent.
  - path: vault/repositories/galaxy/branches/active/tool_security_static_findings/implementation_debrief.md
    why: What the analyser reports, how to run it over `test/functional/tools`, the rule catalog and the `Uncheckable` codes; this branch is measured with it.
    load_when: Running the analyser or reading finding codes.
  - path: vault/repositories/galaxy/branches/active/tool_security_static_findings/scope_evaluation.md
    why: Which rules are vulnerabilities and which are capabilities, so incidental findings (unquoted identifiers, sanitizer bypass, sanitize=false) can be separated from findings a tool edit must not touch.
    load_when: Triaging a tool's findings.
  - path: vault/repositories/galaxy/branches/active/tool_patches_static_findings/index.md
    why: Records the decision that the refusal red case moves from `identifier_single` to a new `identifier_single_unsanitized` tool on that branch, which frees `identifier_single` to be cleaned here.
    load_when: Editing `identifier_single` or any tool a security test uses as a red case.
  - path: vault/repositories/galaxy/branches/active/tool_security_runtime/implementation_debrief.md
    why: Lists the functional test tools still refused at the default level (`model_attributes`, `config_vars`, `command_reads_configfile`, `command_reads_input_size`, and others) and why; bears on `config_vars` and on which tools must stay unchanged.
    load_when: Deciding on `config_vars` and its dead `$__app__` branch.
  - path: vault/repositories/galaxy/branches/active/tool_security_runtime/scope_evaluation.md
    why: Notes which framework tools are YAML `shell_command` tools that get no review, and which refused tools matter; confirms scope exclusions.
    load_when: Confirming YAML and CWL tools are out of scope.
  - path: vault/repositories/galaxy/branches/active/tool_patches_static_findings/scope_evaluation.md
    why: Measured the static review at each severity and the vulnerability versus capability split, and names the `identifier_single` and awk refusal cases that must still refuse.
    load_when: Checking tests on branches 3 and 4 that use framework tools.
  - path: vault/research/Component - Collection Tool Execution Semantics.md
    why: How collection and element wrappers reach Cheetah (`element_identifier`, `keys()`, `__getattr__`), and which wrapper values are not sanitized; grounds the `shlex.quote` fix for identifiers, keys and collection names.
    load_when: Editing the ~23 identifier and collection tools.
  - path: vault/research/Component - Tool XML Collection Commands.md
    why: Tool-author view of iterating collection elements in commands (paired/list/nested, identifiers); needed to keep each collection tool's command semantics unchanged when quoting.
    load_when: Editing collection tools or choosing how to quote loops and `$collection.keys()`.
  - path: vault/research/Component - Tool Testing Infrastructure.md
    why: How `<tests>` in tool XML run (expected output, `expect_failure`, test data), needed to confirm each edited fixture still passes the same assertions.
    load_when: Running or choosing tool tests for edited fixtures.
  - path: vault/research/Component - API Tests Tools.md
    why: Conventions of the API tool tests (`test_tools.py`, `test_tool_execute.py`) that invoke many of these fixture tools by id with literal expected output.
    load_when: Finding API tests that depend on an edited tool's output.
  - path: vault/research/Component - Collections in Tool XML Tests.md
    why: Test-side collection syntax (nested elements, identifiers) used by the identifier tools' own `<tests>`.
    load_when: Editing identifier tools whose tests assert element names.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/index.md
    why: Rule that spec tools are copies of real tool XML shipped in the analyser package, so changing `test/functional/tools` does not change spec expectations.
    load_when: Checking which tests pin findings.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/alts/render_recording.md
    why: Why model and user object reads in a template stay statically refused; relevant to `config_vars` and its `$__app__` access.
    load_when: Judging the `config_vars` finding.
  - path: vault/research/Component - Tool Linters.md
    why: Lint framework; edited fixture XML should lint as before.
    load_when: Validating edited XML.
research_requests:
  - vault/agents/gx_research/todo/tool_command_templating_and_sanitizers.md
  - vault/agents/gx_research/todo/framework_test_tools_directory.md
```

Notes (from code and records; no vault note covers these):

- No note covers `test/functional/tools/` as a fixture set, its tool confs or which suites load which tools (request queued). Tests reference several in-scope tools by id from Python: `identifier_single`, `config_vars`, `cheetah_casting` and `unicode_stream` appear in `lib/galaxy_test/api/test_tools.py`, `test_workflows.py`, `test_jobs.py`, `test_tool_execute.py`, `lib/galaxy_test/selenium/test_tool_form_harness.py` and `test/integration/test_handler_assignment_methods.py` (all found on this worktree's dev by grep). Check each before editing; `config_vars` is the one whose `$__app__` branch removal depends on this.
- No note covers Cheetah templating or sanitizers (the pending request `tool_command_templating_and_sanitizers` is extended with this branch's `$texttest.strip()` sanitizer-bypass question). Read `lib/galaxy/tools/evaluation.py` (`build_param_dict`, sanitizing) and `lib/galaxy/tools/wrappers.py` directly.
- Where the analyser lives: `jmchilton/tool_security_static_findings` (also in `tool_security_runtime` and `tool_patches_static_findings`; this branch is on `origin/dev` and does not carry it). The sibling's `test_challenges_debrief.md` describes extracting it into a scratch directory without touching the worktree.
- A private inventory of the functional test tools exists outside the repo (the prompt summarises its category (c) scope). It is not recorded here.
- The sibling `stock_tools_review_clean` changed argv words (`./`, `--`) and the same caution applies here: quoting with `shlex.quote` must not change what each tool's own test asserts; a render comparison before and after is the validation the sibling used.
