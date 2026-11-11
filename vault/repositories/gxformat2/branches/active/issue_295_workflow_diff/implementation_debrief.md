# Implementation debrief: `issue_295_workflow_diff`

Head `2ae336e`, base `origin/main` `83b59e7`. Three commits: the harness gets `fixture_after` (`706cf58`), the diff itself is added (`2f79ee4`), then more contract cases (`2ae336e`).

## What was built

- `gxformat2/diff.py`:
  - `diff_workflows(before, after) -> WorkflowDiff` (pydantic). Each argument is a dict or a path.
  - `render_text(diff)`.
  - `main` and `_parser` for the `gxwf-diff BEFORE AFTER [--json] [--exit-code]` console script, registered in `pyproject.toml`.
- `gxformat2/testing.py`: a new optional `TestCase.fixture_after`. When it is set, the operation gets `(load(fixture), load(fixture_after))`. The change is additive; existing callers are unaffected.
- Fixtures: nine `format2/diff/synthetic-diff-*.gxwf.yml` files, all in the catalog.
- `expectations/diff.yml`, with twelve cases:
  - identical workflows (empty diff)
  - a removed step, with its downstream edge and the rewire
  - an added step (the same pair reversed)
  - a removed leaf step that fed a workflow output, where the upstream step changes only through losing a consumer (`connections_out`/`downstream`)
  - a removed output, and an added output
  - an unwired input in AFTER
  - an unwired input on both sides (not a change)
  - changed `tool_version`/`tool_id`, state, label, `when`, and an input default
  - a draft BEFORE against a final AFTER
  - draft `_plan_*` edits only (not a change)
  - unlabeled list-form steps (warnings)
- `tests/test_diff.py`: CLI text, JSON equal to the model dump, `--exit-code`, plan fields in the text output, and native input rejected.
- Docs: `docs/cli_diff.rst`, plus entries in the toctree and in `gxformat2.rst`. AGENTS.md lists the new operation and the `fixture_after` key.

## Contract decisions (the TS port must mirror these)

- **Harness:** add `fixture_after` to TS `declarative-test-utils.ts` and its runner. If `diff.yml` is synced before `diff_workflows` exists in TS, the TS run will fail, so sync the file and the operation together.
- **Loading:**
  - Drafts go through `draft_as_workflow` and then `normalized_format2`.
  - Native `.ga` input is rejected: `normalized_format2` raises `ValueError`.
  - `$graph` documents are rejected with `ValueError`.
  - A non-mapping input raises `TypeError`.
Current as of the strengthening head (see `subagents/strengthen.md`). The JSON contract hasn't changed since `cbe75dc` (after the normal and Codex reviews); the thermo-nuclear refactor kept output byte-identical, and the strengthening round (`1c698f2`, `e4d1b9a`) only pinned existing behavior and changed how text renders `null` and `""` state leaves.

- **Step identity:** the step key from `draft.iterate_steps`. That is the dict key, or for list form the label, else the id, else the index id (index plus the number of inputs).
  - This is the key that source refs use. It is also what `detect_draft` paths use, and what the Foundry ledger's `step:` field names (for example `classify_context`).
  - Prose labels can differ from keys (draft fixtures have `fastp` with the label "trim and QC paired reads"), so matching on labels would turn a relabel into one removed step plus one added step.
  - A label change on a matched step is reported as `fields.label`.
  - A dict-form step's inner `id` is never its identity. Changing it while consumers keep sourcing the key is not a change (`test_diff_dict_step_inner_id_is_not_its_identity`). Sourcing through the inner id isn't valid Format2: the converter fails on `cat_b/out_file1`.
- **Unlabeled fallback:** list-form steps with no `label` and no `id` are matched by position (index id). Each side that has any gets a warning: `"BEFORE has unlabeled steps matched by position: 1, 2"`.
- **Source resolution:**
  - An exact workflow-input id resolves to that input, with no port.
  - Anything else goes through `resolve_source_reference` (longest label first) against step aliases (key, id, label → key) plus input ids.
  - If that names an input with port `output`, it collapses to the bare `<input>`, since the converter treats `<input>/output` and `<input>` as one connection. A step keyed `a/output` still wins over input `a`, because it is the longer match.
  - Otherwise the label maps through the aliases to a step key. A bare step ref means port `output`.
  - Output sources are canonicalized the same way, to `key/port` or `input`.
- **Edge strings:** `"<step>/<port> -> <step>/<port>"`, or `"<input> -> <step>/<port>"`.
  - `connections_in`/`connections_out` hold port-level edges.
  - `upstream`/`downstream` hold node-level ones: step keys or input ids, so that renaming `TODO_*` ports doesn't hide which step was removed.
  - All of these lists are sorted.
- **Fields compared:**
  - Steps (`fields`): `label`, `type` (the enum value), `tool_id`, `tool_version`, `when`, `run`.
    - `run` as a string (URL or path) compares as that string, an `@import` as `{"@import": path}`, and an inline run as `null`, so inline contents are not compared.
  - Inputs, under these document (alias) names: `type`, `collection_type`, `optional` (a missing value counts as `false`), `format` (a string becomes a one-item list), `default`, `min`, `max`, `restrictions`, `suggestions`, `restrictOnConnections` (a missing value counts as `false`, like `optional`), `validators`, `fields`, `column_definitions`. Fields an input type lacks compare as `null`. `restrictOnConnections` is camelCase, so the TS `toSnakeCaseKeys` wrapper would rename it; `diff.yml` doesn't assert on it.
  - Outputs: `outputSource` only.
  - Field values are compared as `json.dumps(sort_keys=True)`.
- **Step input defaults (`in_defaults`):** `{port: {before, after}}` over the `default` of every step `in` entry, sourced or not. The side with no default is `null`.
- **Step output actions (`out_actions`):** `{port: {before, after}}`. Each side is the declared `out` entry dumped by alias, without `id` and keeping only truthy values (so `null`, `false`, `""`, `[]` and `{}` mean no action, the same as absent): `rename`, `hide`, `change_datatype`, `add_tags`, `remove_tags`, `delete_intermediate_datasets`, `set_columns`. Only these declared fields count; undeclared keys on an `out` entry (e.g. `_plan_note`) are ignored (`test_diff_undeclared_out_key_is_not_an_action`). Ports with no actions are skipped, so a bare `out: [a]` → `[b]` is not a change. The side without actions is `null`.
- `in_defaults` and `out_actions` share one per-port rule: BEFORE ports first, then ports only in AFTER, keeping only ports whose values differ.
- **State:**
  - The compared state is `state`, falling back to `tool_state`.
  - Leaf paths join nested dict keys with `|`.
  - Lists, empty dicts and dicts with a `__class__` marker are leaves.
  - Values are compared as `json.dumps(sort_keys=True)`.
  - Each changed leaf is reported as `{kind: added|removed|changed, before, after}`. `before`/`after` are `null` on the side where the leaf is missing.
  - An absent leaf differs from one set to `null`, `""` or `[]`: that is `kind: added` (or `removed`). This is the opposite of input flags and `out_actions`, on purpose. Galaxy treats an absent parameter as "substitute the tool default" and an explicit one as set, and Foundry revisions make that change deliberately (the bamtofastq revision change-set rows 1-4, 8 and 9 do exactly this). Pinned by `test_diff_unset_state_leaves_differ_from_absent`; don't "fix" it in the port.
- **`_plan_*`:** read from the raw step, never compared.
  - Added and removed steps show them as `plan_fields`.
  - Changed steps show `plan_fields_before` and `plan_fields_after`.
  - A step whose only difference is its plan text does not appear under changed.
- **Ordering:**
  - Added and removed inputs and outputs follow workflow order.
  - `steps.removed` follows BEFORE order; `steps.added` and `steps.changed` follow AFTER order.
  - JS objects put integer-like keys first, in numeric order, ahead of all string keys. So in TS, index-id keys (`"1"`, `"2"`) for unlabeled list-form steps move ahead of labeled step keys (mixed list form: Python `a, 2, c`, TS `2, a, c`), not only out of order among themselves. Only mixed labeled/unlabeled list-form steps are affected, and those already warn. No assertion depends on dict order.
- **Result shape:**
  - `StepChange`: `label` (AFTER), `fields`, `state`, `in_defaults`, `out_actions`, `connections_in`, `connections_out`, `upstream`, `downstream` (each `{added, removed}`), `plan_fields_before`, `plan_fields_after`.
  - `StepSummary` (added or removed steps): `label`, `type`, `tool_id`, `tool_version`, `plan_fields`, `upstream`, `downstream`, `workflow_outputs`, `connections`. It has no `state`, `run`, `in_defaults` or `out_actions`.
  - The header comment in `diff.yml` holds the same shape.
- **Membership:**
  - A matched step appears under changed only if a field, a state leaf, an `in_defaults` or `out_actions` entry, or a port-level edge differs. `in_defaults` alone and `out_actions` alone each suffice (`test_diff_step_input_default_alone_is_a_change`, `test_diff_output_action_alone_is_a_change`).
  - Gaining a new consumer counts, as a `connections_out` change.
- **`has_changes`** is a computed field. It is true when any added, removed or changed entry exists. `unwired_inputs` and `warnings` don't count.
- **`unwired_inputs`:** AFTER input ids, in order, that are not the source of any step `in` edge. An input used only as a workflow output still counts as unwired.
- **Not compared:**
  - workflow metadata (label, doc, tags, creator, license, comments, report)
  - step `doc`, position, `tool_shed_repository`, and bare `out` declarations without actions
  - input `label`, `doc` and `position`
  - subworkflow contents, since only the top level is compared
- **CLI:** exit status 0 by default. `--exit-code` gives 1 on differences, like `git diff`. JSON is `model_dump_json(indent=2)`.
- **Text:** not part of the contract, but state lines print a present `null` leaf as `null` and `""` as `""` (other lines print a missing value as `(none)`).

## Checks

- `pytest tests/`: 982 passed, 8 skipped (991 after the strengthening round; IWC subset 910).
- Lint and type checks green: ruff, flake8, black, `mypy gxformat2 tests`, pyrefly, `flake8-docstrings`.
- `make lint-docs` exits 0. The new pages add no Sphinx warnings.
- Red first: before the operation existed, the first nine `diff.yml` cases failed. The three added later pin existing behavior.
- Fork CI was triggered by the push of `2ae336e` and has not been seen green. Nothing under `typescript/` or `java/` reads the expectations, so the new cases can't turn those jobs red.

## Left undone

- Subworkflow recursion, which could be a nested `WorkflowDiff` per subworkflow step.
- Native `.ga` input.
- `$graph` documents.
- Comparing `tool_shed_repository`, bare `out` declarations with no actions, and doc.
- Recursing into repeat lists in state. A repeat change currently shows the whole list.
- No HISTORY entry. Those are added at release time.
