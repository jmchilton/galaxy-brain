# Review: rebase onto release_25.1 and the job-parameter reading (debrief)

Acted on in `5d002704315`: the blocker and the confirmed should-fix. Both were handled under the private security process. Also acted on: two of the three low items, the two stale-docs and guard items, and three of the nits (loop targets, the data source detection and the `_in_namespace` docstring). Not acted on: one low item, five nits, and two questions for John. All are listed below.

Not acted on:
- One low item, raised from reading the code: a job-resource input that an admin defines as unsanitized text. It is contrived and older than this branch. Details are in the private report.
- Nit: a name the review reads outside a missing local is still a job parameter where nothing else holds it, even where no job parameter can reach the templates. This is kept on purpose, because Galaxy sets names the model doesn't know (`output_file`, `paramfile`, output collection elements). It only over-reports. The `_in_namespace` docstring now says so.
- Nit: a hidden name loses what an `#if` test showed about it. This only over-reports.
- Nit: the "content of a file" assertion in the test of the replaceable names matches a string. The finding has no narrower field to match on.
- Nit: the spec harness and the CLI review without the tool's `template_job_parameters`, so they assume any name can be a job parameter. That is conservative, and Galaxy's own reviewer passes the tool's set. Mirroring `TEMPLATE_JOB_PARAMETERS` in tool_util would copy an upstream list. Left for John.
- Nit (lint, not part of this change): the worktree's ruff (0.17.6, newer than CI's 0.13.3 pin) flags one ISC004 in mvdbeek's `test_security_review.py`, and its isort flags an import order in `test_sources.py`. Neither file was touched by the rebase.

<details><summary>Full review (non-sensitive part)</summary>

Reviewer: general-purpose subagent (Claude Opus 5.5). It reviewed `2963dcacc1e` and `fdacfd6a8bd` on top of the rebased stack. It edited nothing, and the unit suites passed (954).

Rebase interaction:
- The job check sees the same filtered parameters as the templates. `_template_job_parameters` filters `incoming`; `build_param_dict` builds `evaluator.param_dict` from it; `check_job` runs in `build()` on that same dict; hooks run before `build()`.
- The job cache, `__use_cached_job__` and `__data_manager_mode` are unaffected.
- `REPLACEABLE_SPECIALS` is right. It was checked against the order in `build_param_dict`, the user template environment merged after the filter, `__populate_non_job_params`, and the tool action, which always sets `chromInfo`.
- Should-fix, done: the `Model.job_parameter` docstring was stale for the new base.
- Should-fix, done: nothing guarded the dependency on `build_param_dict`'s order. A test in the app suite now runs a job and checks that a job parameter replaces exactly `REPLACEABLE_SPECIALS` in a tool that keeps its job parameters, and none in a regular tool.

New commits:
- Locals: sound across `#if` and `#try` merges, loops, lambdas, generators and comprehensions, with the narrowing applied the same way in all of them.
- The `#for` fix (union with the names hidden before the loop; targets bound inside the body) is right.
- Nit, done: the loop un-hid the base name of an attribute or subscript target.
- Nit, done: data source detection read the XML root directly. It now goes through the tool's input pages, and the tool type counts too.
- The `_describe` wording ("the job parameter '<key>'") is now accurate.
- Tests: every new parametrized test fails without its change, and each has negative rows. The app-level test checks that Galaxy passes the tool's own attributes.
- Spec cases `maybe_unset_local`, `galaxy_url_replaced` and `galaxy_url_kept` are right. None of them covered `getVar` or `#set global`; `getvar_request_parameter` now does.

Sensitive findings: handled under the private security process, not recorded here.

</details>
