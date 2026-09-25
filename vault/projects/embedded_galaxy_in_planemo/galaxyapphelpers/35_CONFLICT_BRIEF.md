# 35 — Conflict Brief for the Verification Agent

Written by the orchestrating session after reading both planning reports. This is the
adjudication agenda. Not a finding — a list of things that must be resolved.

## CONFLICT 1 (primary): ordering. The two agents disagree.

**Agent 1 (`20_PLAN_INPROCESS_TOOL_TEST.md`)** — *"They share a substrate, and ask #1 IS the
substrate. Do ask #1 first."*
Evidence: stopping its spine after `runner.prepare_job(jw)` — no Popen, no finish — yields a
complete `tool_script.sh` in **0.227 s**, with a real Tool / Job / ComputeEnvironment. So #2's
deliverable is a **strict prefix** of #1's pipeline: no `SessionlessContext`, no hand-built ORM
graph, no fourth hand-rolled `ComputeEnvironment`. Conceded counter-argument: #2 wants a
sub-second loop and this path pays ~2 s of app build.

**Agent 2 (`30_PLAN_TOOL_SCRIPT_CLI.md`)** — *"Independent tracks. Overlap is three modules, not a
foundation. Recommend parallel; if forced to serialize, #2 first — but '#2 first' buys #1 about
one afternoon, not a platform."*
Evidence: #2 wants a *throwaway* in-memory DB never seen by a second thread; #1 needs a persistent
one because handler and runner threads read the job back by id. #2's app deliberately has **no
toolbox at all** (verified: `AttributeError: no attribute 'toolbox'`, and that is fine). #2 stops
exactly where #1's hard part starts.

### This may be a design fork, not a factual contradiction. Resolve it as such.

The two are describing **different designs for ask #2**, with different cost and fidelity profiles:

- **(a) Short-circuit the full in-process runtime** (agent 1). Pays ~2 s app build + needs a
  toolbox. **Byte-faithfulness is free — it *is* real Galaxy.** One code path, so it cannot drift.
- **(b) Purpose-built lean path** (agent 2). ~70 ms in-memory sqlite, no toolbox. **Byte-fidelity
  must be proven and maintained** — and agent 2 already determined byte-identity is *impossible*
  for any tool with `<configfiles>` or `<environment_variables>` (three normalization token
  classes + a dataset-path map).

**Questions the verifier must answer with evidence:**
1. Is agent 1's 0.227 s prefix measured *after* app build, or inclusive? If exclusive, what is the
   honest end-to-end cost of (a) vs (b) for a single tool, and for a 225-tool sweep?
2. Does (a) actually produce a correct `tool_script.sh` for the *hard* cases agent 2 swept —
   `<configfiles>`, `<environment_variables>`, `data_column`/metadata tools, YAML tools? Agent 1
   measured the prefix on its own experiments; agent 2 swept 225 tools. **Do not assume (a)
   generalizes from one measurement to agent 2's 175-OK corpus.**
3. Drift risk: does (b) create a second implementation of tool-script rendering that can diverge
   from Galaxy? Agent 2 says no — it factors `render_tool_script()` *out of* `command_factory` and
   verified byte-identity against live `__externalize_commands`. **Verify that claim specifically**;
   if true it substantially defuses the drift objection and strengthens (b).
4. Can both be true — `render_tool_script()` + `LocalDirectoryComputeEnvironment` shared, with (a)
   and (b) as two thin drivers over them? If so, say so plainly; that is likely the real answer and
   makes the ordering question mostly moot.

Do **not** split the difference rhetorically. Pick, with reasons, or show the question is
ill-posed.

## CONFLICT 2: is metadata required to expand a command line?

- `10_RECON.md` §8 and `00_SESSION_ORIENTATION.md`: **not strictly required** —
  `DatasetFilenameWrapper.MetadataWrapper.__getattr__` falls back to `spec[name].no_value`
  (`tools/wrappers.py:313-332`).
- Agent 2, **executed**: without `datatype.set_meta`, `column_param_configfile` fails with a hard
  `ParameterValueError` ("invalid option ('11')... valid options: 2,1,3") because `data_column`
  reads `input.metadata.columns` and gets the datatype `no_value` of 3. With `set_meta`, columns=11
  and it expands.

Both can be literally true (fallback exists; fallback is wrong often enough to fail validation).
State the resolved rule precisely — it drives whether `set_meta` is mandatory in the CLI.

## CONFIRMED ERRATA — already verified by the orchestrating session, do not re-litigate

Fold into the unified plan; append an errata note to `10_RECON.md`.

- **`10_RECON.md:125` shebang is wrong.** `DEFAULT_JOB_SHELL = "/bin/bash"`
  (`lib/galaxy/jobs/__init__.py:143`), not `/bin/sh`.
- **`strict_shell` is a *tool* property**, `jobs/__init__.py:1211-1213` -> `tool_util/parser/xml.py:683-690`,
  defaulting **True for profile >= 20.09**. Both shebang and `set -e` are derivable from the tool
  alone; getting them wrong diverges from Galaxy for every modern tool.
- **Env-var trap mechanism confirmed.** `SharedComputeEnvironment.env_config_directory()` returns
  the literal `"$_GALAXY_JOB_DIR"` (`job_execution/compute_environment.py:163-165`); `env_to_statement`
  is reused by `BaseJobRunner.get_job_file` at `jobs/runners/__init__.py:518`.
- **Orientation-note premise inverted.** `00_SESSION_ORIENTATION.md` framed the ask-#2 substrate
  question as "`SessionlessContext` vs real DB". Agent 2 measured **175 OK (sqlite) vs 172 OK
  (sessionless), zero tools where sessionless wins**; sessionless fails structurally via
  `SessionlessContext.scalars()` returning `None` (`model/store/__init__.py:233`) and via missing
  ORM column defaults. Note that the note's *conclusion* (independent tracks) was reached on a
  *wrong premise* — which is exactly why conflict 1 needs independent adjudication.

## Also verify (load-bearing, single-source claims)

- Agent 1: `JobWrapper.finish()` -> `_report_error()` dereferences `app.error_reports`, a
  `UniverseApplication`-only attribute (`jobs/__init__.py:2414,2893`), so every *failing* tool test
  becomes an `AttributeError`. If real, this is a genuine upstream bug worth its own issue.
- Agent 1: the GIL rebuttal numbers — in-process 0.494 s vs job subprocess 3.800 s, of which the
  tool is 0.013 s and `python metadata/set.py` startup is 3.787 s. Sanity-check the decomposition;
  this is the number that answers the standing review objection.
- Agent 1: thread counts 1 (manager app) / 6 / 14 (`UniverseApplication`).
- Agent 2: `render_tool_script()` byte-identical to live `__externalize_commands` across all three
  strict_shell x integrity_injection combinations.
- Agent 2: dependency resolution works with **no toolbox and no job config**; seam is
  `Tool.build_dependency_shell_commands` hard-coding `self.app.toolbox.dependency_manager`
  (`tools/__init__.py:2597`).
- **Top risk, unverified by either agent: conda resolution in-process.** Agent 1 saw `cat1`'s
  `coreutils` requirement silently no-op and `_configure_toolbox()` do a network download of
  involucro. Planemo tool tests resolve conda routinely. Assess whether this breaks the premise of
  either plan.

## Open naming question — surface, do not decide

`galaxy-tool-script` sits one letter-group from the existing `galaxy-tool-test` in a script list.
John is sensitive to naming outliers. Present alternatives; leave the call to him.
