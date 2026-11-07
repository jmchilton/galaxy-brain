Fix 🎯 #216 - `gxwf draft-validate --concrete --json` can report `ok: false` with every `*_errors` array empty, leaving a consumer nothing to act on; this adds a top-level `concrete_errors` array that always explains the failure, and a step `label` that means the same thing in every report that carries it.

The issue's workflow wires a connection to a parameter `cat1` doesn't have. Here is `gxwf draft-validate badkey.gxwf.yml --concrete --strict-state --json`, trimmed to the top-level error fields:

```jsonc
// main: exit 1
{
  "ok": false,
  "structure_errors": [],
  "topology_errors": [],
  "semantic_errors": [],
  "summary": "1 error"
}

// this branch: exit 1
{
  "ok": false,
  "structure_errors": [],
  "topology_errors": [],
  "semantic_errors": [],
  "summary": "1 error",
  "concrete_errors": [
    {
      "check": "tool_state",
      "label": "cat",
      "tool_id": "cat1",
      "message": "No parameter definition matching connection key \"not_a_param\""
    }
  ]
}
```

On `main` the only trace of that error is `concrete.tool_state.results[].errors`, which a consumer has to know to look for. [Foundry's doc for this command](https://github.com/galaxyproject/foundry/blob/main/content/cli/gxwf/draft-validate.md) tells a cast skill or harness to prefer `--json`, and a Foundry run spent three probe invocations mapping the report before it could read a failure.

The step numbers don't help either. The same step reports as `0` under `tool_state` and `1` under `connection_report`, and neither counts positions in the draft, because both number the extracted subset. Put a `TODO` step ahead of a subworkflow and its inner step reports as `0.0`, while the label says what it is:

```jsonc
"tool_state":    { "results": [{ "step": "0.0", "label": "nested/inner_cat", "tool_id": "cat1", "status": "fail" }] }
"concrete_errors": [{ "check": "tool_state", "label": "nested/inner_cat", "tool_id": "cat1", "message": "…" }]
```

***This only adds to the report, apart from `label: ""` below.*** On both demo workflows, the only differences from `main`'s JSON are `concrete_errors` and `concrete.tool_state.results[].label`. `summary` and exit codes don't change, and neither does the text output. [Diffs against `main`](https://github.com/jmchilton/galaxy-brain/blob/main/vault/repositories/galaxy-tool-util-ts/branches/active/issue_216_concrete_errors/demo/demo_output.txt).

***An empty `concrete_errors` doesn't mean the workflow passed.*** It lists only failures of checks that ran, so `--no-tool-state` or a missing tool without `--strict-state` can leave it empty. Read `ok` and `concrete.ok` for the verdict, and `topology_errors` and `semantic_errors` for draft-level failures.

***`concrete_errors` exists only on `draft-validate --concrete`.*** `gxwf validate --connections --json` gets `label` but no such array.

***`step` keeps its numbering.*** Renumbering would change the meaning of a field consumers already use, and either number would still count the extracted subset. So `concrete_errors` entries have no `step`, and they name the step by label. Tool-state and connection results give a top-level step the same label, including a list-form step's non-numeric `id`, because both now go through `nativeStepLabel`. Steps inside a subworkflow have no `connection_report` entry; there, the outer step carries the label.

***`concrete_errors` covers every check that can fail the concrete pass:*** `structure`, `strict_structure`, `strict_encoding`, `strict_state`, `tool_state` and `connections`, the same six `isConcreteOk` tests.

***It can be longer than the count in `summary`.*** `summary` counts a failing step once and an invalid connection report once; the array has one entry per message.

***An unlabelled inner step is named by its id.*** Under a labelled subworkflow it reports `outer/<id>`, using the numeric id `in:` references use, so a nested subworkflow can give `outer/1/inner`. That id counts the subworkflow's inputs, so with one input the first step is `outer/1`. It comes from the id rather than `step` because draft extraction shifts `step`: with a `TODO` first, a draft's third inner step reports as `0.1` but stays `outer/3`.

***`label` is null when there's no step to name, or no real name to start a path from.*** Structure, strict-structure and strict-encoding failures are plain strings, so their `label` is null even when the message mentions a step. An unlabelled top-level step gets null, as the issue specifies, and so does everything inside an unlabelled top-level subworkflow: `inner` alone could be mistaken for a top-level step. Two such failures with the same tool and message give identical entries, and `concrete.tool_state.results[]` still has the position for those.

***`skip` connections stay out.*** They carry `errors`, but they don't fail the report. Skipped tool-state steps are entries only under `--strict-state`, where they do fail it.

***`label` also reaches other commands.*** `gxwf validate`, `validate-tree`, `lint`, `lint-tree` and gxwf-web's validate and lint responses all return step results from these walkers, so `results[]` gains the field there too. It stays out of gxwf-web's `openapi.json` and `api-types.ts`, like the TS-only `label` on connection step results. `failures[]` in `validate-tree --json` is unchanged.

***A step with `label: ""` now counts as unlabelled in `connection_report`.*** It's the one existing value that changes: native workflows use `""` for no label, and keeping it would have put `""` in `concrete_errors` where the contract says null. `connection_report` omits the field for these steps, as it does for null. Edge annotations in `mermaid`, `cytoscapejs` and gxwf-web are unchanged.

<details><summary>How it works</summary>

- `collectConcreteErrors` in `report-models.ts` builds the array in `buildSingleDraftValidationReport` from the finished concrete report. It's present whenever `concrete` is, and empty when the pass ran clean or was skipped (`ok: null`). When draft structure errors stop the concrete pass, both are absent and `structure_errors` explains the failure.
- `step-label.ts` holds three helpers for all four walkers (effect and json-schema, native and format2). `stepName` picks what a step goes by: its label, or its key inside a subworkflow. `withStepLabel` sets it on a step's result. `withParentLabel` qualifies a subworkflow's results as they come back up, so the walker signatures don't change.
- Connection messages are prefixed with the target input (`input_list: Incompatible types: …`), since a step can have several connections and the validator's text doesn't name the input.
- Strict-state messages read `skipped (<status>): <reason>`.
- `@galaxy-tool-util/schema` now also exports `nativeStepLabel`, `UNLABELED_STEP_PREFIX` and the `ConcreteError` types.

</details>

<details><summary>Tests</summary>

- `packages/cli/test/concrete-errors.test.ts` runs `runDraftValidate` and `runValidateWorkflow` against a seeded tool cache:
  - the issue's failure, clean passes, and no `--concrete`;
  - labels through inline subworkflows, three levels deep, and with each level unlabelled, including inner ids that stay put when extraction drops a step ahead of them;
  - list-form ids, `_unlabeled_step_*` sentinels and `label: ""`;
  - the same step under the same label in `tool_state` and `connection_report`;
  - failed and skipped steps together under `--strict-state`;
  - invalid connections, and `skip` connections left out;
  - strict-structure and strict-encoding failures, asserting `concrete.ok` is false with entries present;
  - format2 and native `gxwf validate`, in effect and json-schema modes;
  - `label` reaching `validate-tree` results but not its `failures[]`, and `lint` results.
- `packages/gxwf-web/test/validate-step-label.test.ts`: `operateValidate` returns the label.
- `packages/cli/test/annotate-connections.parity.test.ts`: a `.ga` step with `label: ""` keeps its annotation key.
- `packages/schema/test/report-models-draft.test.ts` covers what's awkward to reach through the CLI: a skipped pass, step-less checks, several errors on one step, and step-level connection errors.
- `packages/cli/test/user-defined-tool-step.test.ts`: exact-shape assertions gain `label`, as the issue expected.
- Full `vitest run`: 3 integration tests fail, and the same 3 fail on `origin/main` (`validate_legacy_encoding_skipped_2`, `validate_iwc_repeatmasking_stale_rejected`, `disconnected-optional-runtime`). The gxwf-e2e Playwright specs also error at vitest collection.

</details>

## Risks

Risks are low. The one thing that's hard to walk back is the JSON shape itself, since consumers such as Foundry will start routing on `concrete_errors`, its `check` values and the `outer/inner` label format.

<details><summary>Risk Details</summary>

- `check` values and the label format become a public contract once a release ships them.
- A `/` inside a step label makes the `outer/inner` path ambiguous.
- Entries for unlabelled top-level steps, and for steps inside an unlabelled top-level subworkflow, can't be told apart. `.ga` workflows with unlabelled subworkflow steps hit this.
- A number in a label path is an id that counts inputs, not an index into `steps`. An inner step explicitly labelled with a number looks the same as an id.
- Consumers comparing `results[]` or step results by exact shape will see the new `label` key.
- `connection_report` no longer reports `label: ""`.

</details>

<details><summary>Risk Review Advice</summary>

Check that the `check` values and null-label rules are what Foundry wants to route on, since those are what's hard to change later. The invariant is that `concrete.ok === false` always comes with at least one entry. Tests assert it for each check the CLI can reach. `structure` is covered only by a hand-built report, because every malformed draft I tried was caught by the draft-level check first. `collectConcreteErrors` and `isConcreteOk` are separate lists of the same six checks, so a seventh would have to be added to both.

</details>

## Context

Related to galaxyproject/foundry#668, part 1; Foundry's per-step loop routes failures from these diagnostics. ***This doesn't close foundry#668:*** part 1 still asks for the report shape to be documented, and its other parts are untouched. Follow-ups: add `label` to `failures[]` in `validate-tree --json`, and derive `ok` from `collectConcreteErrors` so an entry exists by construction.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>One structural finding and four small ones acted on; reports unchanged.</summary>

- Walkers qualify a subworkflow's results as they come back up, which removed a three-state parameter from all four walker signatures.
- Tightened `nativeStepLabel`'s return type, reused `SKIP_STATUSES` for the strict-state filter, shared the tests' JSON report helper, and added a three-level nesting test.
- Left as follow-ups: merging the four walkers, renaming the positional `stepLabel` variable, and splitting `report-models.ts`.

It predates the id-based labels in `bf3a5b6b`. [Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_216_concrete_errors/thermo_nuclear_review/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings, from a limited pass: Codex read only the diff and 15 embedded source files.</summary>

Codex's shell couldn't run in this environment, so it couldn't open other files or run anything. The result is weaker than a normal run. It reviewed `f7cab7b8`, before the thermo-nuclear commits, the edge-annotation fix in `0756cf04` and the id-based labels in `bf3a5b6b`.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy-tool-util-ts/branches/issue_216_concrete_errors/codex_review/). Run via gpt-6.1-sol at high effort.

</details>
