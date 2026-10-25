Implement 🎯 #202 - `gxwf validate --strict-state` rejects conditionals missing their test param, and new `gxwf fill-defaults` fills absent state from the tool.

Fixes #202

Today `gxwf validate --strict` passes the fastp state from #202, and Galaxy's import then fails with `KeyError: 'eval_dups'`. From reading Galaxy's source (not reproduced against a live Galaxy here): import leaves absent params absent, `visit_input_values` builds `{}` for an absent section or conditional, and `Conditional.value_to_basic` indexes the test param. Absent leaves are tolerated; a missing conditional test param is not.

Real output on the issue's exact fastp workflow (`@galaxy-tool-util/cli@1.14.0` vs this branch):

```
$ gxwf validate --strict fastp.gxwf.yml          # 1.14.0, exit 0
Detected format: format2, mode: effect
Structural validation: OK
  [0] tool_state: OK

Tool state: 1 validated, 0 skipped

$ gxwf validate --strict fastp.gxwf.yml          # this branch, exit 1
Detected format: format2, mode: effect
Structural validation: OK
  [0] tool_state errors (toolshed.g2.bx.psu.edu/repos/iuc/fastp/fastp/1.4.0+galaxy0):
    duplicated_reads|handling_options: missing conditional test parameter 'eval_dups'
    read_mod_options|polyg_tail_trimming: missing conditional test parameter 'trimming_select'
    read_mod_options|polyx_tail_trimming: missing conditional test parameter 'polyx_trimming_select'
    read_mod_options|cutting_by_quality_options|cut_front_select: missing conditional test parameter 'cut_front'
    read_mod_options|cutting_by_quality_options|cut_tail_select: missing conditional test parameter 'cut_tail'
    read_mod_options|cutting_by_quality_options|cut_right_select: missing conditional test parameter 'cut_right'

Tool state: 1 validated, 0 skipped

$ gxwf fill-defaults fastp.gxwf.yml --output filled.gxwf.yml
Filled defaults on 1 step(s)
Filled workflow written to filled.gxwf.yml

$ gxwf validate --strict filled.gxwf.yml         # exit 0
Detected format: format2, mode: effect
Structural validation: OK
  [0] tool_state: OK

Tool state: 1 validated, 0 skipped
```

The check flags only missing conditional test params; absent leaves and absent sections without conditionals still pass, matching what Galaxy's import tolerates. `--strict` is shorthand for `--strict-structure --strict-encoding --strict-state`, so it includes the check. `fill-defaults` is the issue's ask #2, so agent draft-to-concrete tooling can emit minimal state and normalize it before handoff. Whether Galaxy then imports the filled workflow is not verified against a live Galaxy here.

<details><summary>What changed</summary>

- CLI test reproduces the issue's exact fastp workflow with the cached fastp 1.4.0+galaxy0 ParsedTool as a fixture (red on base, green here).
- `findMissingConditionalTests` (schema) walks state with `walkNativeState`, following absent sections and conditionals (default `when`) and existing repeat instances, and flags reachable conditionals missing their test param. Works on native and format2.
- Wired into `--strict-state` for `validate` (effect and json-schema modes), `validate-tree`, `lint`, and `draft-validate --concrete`. Runs after connection injection, so a connected test param counts as present.
- `gxwf fill-defaults` wraps `expandToolStateDefaults` for native, format2, `$graph`, and inline or embedded tools. A new `connectedPaths` option keeps connected leaves absent (and still materializes repeat instances they need). It warns on unresolved tools, JSON-string `tool_state`, and gaps left after the fill.
- Docs (`docs/packages/cli.md`, `docs/guide/workflow-validation.md`) and a changeset (schema + cli minor).

</details>

<details><summary>Why under <code>--strict-state</code> and not a new flag</summary>

Run over IWC (132 `.ga` workflows, 2585 schema-valid steps), the check flagged none, and the existing CLI and gxwf-web suites stay green with it on. So it rides on `--strict-state`; no `--complete-state` flag was added.

</details>

<details><summary>Not covered</summary>

- `/`-separated `in:` keys are not handled (the shared helpers don't support them either).
- URL subworkflows warn and aren't fetched.
- No format2 corpus with real cached tools was measured.

</details>

## Risks

Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door). `--strict-state` can now fail workflows it passed before; the IWC sweep found none, and the check can be moved behind its own flag later.

## Context

Related: foundry #644 (no importability gate). Not addressed here: foundry #649 (`__current_case__` not checked). Follow-up refactor drafted to replace the `checks` arg threaded through the validators with a `StepValidationContext`.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural blockers; three cleanups applied, validator arg threading deferred to a follow-up.</summary>

- Applied: folded the JSON-string guard and write-back into `fillStep`; one `validateSteps` call in `lint`; one `connectedPaths` source in `expandToolStateDefaults`.
- Deferred: `checks` threaded positionally through validator functions in two parallel files. A `StepValidationContext` plus shared dispatch is too big for this PR.
- Accepted: the small second recursion in `findMissingConditionalTests`. No file over 1k lines.

</details>

### ✅ Second Frontier Model Review

<details><summary>Three findings, all confirmed red-to-green and fixed.</summary>

- Connected paths now materialize repeat instances in `expandToolStateDefaults`.
- Format2 JSON-string `tool_state` warns and is left as-is instead of being split into character keys.
- Format2 `$graph` entries are filled; `#id` run refs no longer warn as non-inline.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
