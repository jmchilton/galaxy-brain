Run via gpt-6-sol at medium effort.

Codex reviewed `29c93d4` against `83b59e7` and raised three findings. I confirmed all three and fixed them, one commit each, each red to green with a declarative case. A fourth commit fixes a false positive the fixes introduced. The new head is `cbe75dc` on `jmchilton`. I fixed one finding only in part, as noted below.

- `e0afd37`: **source resolution.** Sources now resolve by longest-label match over steps and inputs, and `<input>/output` then collapses to `<input>`.
  - Before this, the `<input>/output` special case ran ahead of `resolve_source_reference`. So when input `a` existed, a step keyed `a/output` was read as input `a`, which made `a` look fed and hid a rewire between the two.
  - New fixture `synthetic-diff-output-suffixed-step-key.gxwf.yml`, with self-diff case `test_diff_step_keyed_like_input_port_is_the_step`, asserting `unwired_inputs: [a]`.
- `8fd8514`: **input fields.** `INPUT_FIELDS` gained `min`, `max`, `restrictions`, `suggestions`, `restrictOnConnections`, `validators`, `fields` and `column_definitions`.
  - Before this, a changed restriction or bound reported no difference.
  - `synthetic-diff-changed-step` now gives `min_quality` `min: 0` and `max: 60`.
- `59f43d3`: **output actions.** A new `StepChange.out_actions` reports `{port: {before, after}}` for actions on declared `out` ports (`rename`, `hide`, `change_datatype`, tags, and so on).
  - It shares a new `_port_changes` helper with `in_defaults`, and it counts toward membership in `steps.changed`.
  - The `qc` step in `synthetic-diff-changed-step` now renames `html_report`.
  - The text renderer, `SCRIPT_DESCRIPTION`, `docs/cli_diff.rst` and the `diff.yml` header are updated.
- `cbe75dc`: **explicit `false` or empty now counts as absent.**
  - This is a follow-up to the two fixes above. Before it, `restrictOnConnections: false`, or `hide: false` and empty `rename`/tags on a port, counted as a change against the same field left out.
  - New fixtures `synthetic-diff-explicit-false` and `synthetic-diff-explicit-false-bare`, with case `test_diff_explicit_false_and_empty_equal_absent`.

Local gate green: ruff, flake8, black, `mypy gxformat2 tests`, pyrefly, `flake8-docstrings`, `make lint-docs`, and `pytest tests/` (986 passed, 8 skipped).

The "Contract decisions" section of [implementation_debrief.md](implementation_debrief.md) has been brought up to date with `cbe75dc`. It now covers `run`, the source rule, `in_defaults`, `out_actions`, the extended input fields, the false-equals-absent rule, the result shape, membership, and the JS key-order note.

## Not acted on

- **Bare `out` declarations with no actions (part of finding 2).**
  - Codex's example, an unreferenced port `out: [a]` becoming `[b]`, still reports nothing.
  - A bare declaration only documents a port, and the edges already cover the ports that are referenced.
  - Comparing them would flood draft diffs with `TODO_*` port churn.
  - Ports that carry actions are now compared.
- **Membership driven only by `out_actions` or `in_defaults` is not pinned by its own case.** The steps that change these in the fixtures also change other fields. The membership check is a single condition.

<details>
<summary>Full Codex review</summary>

Model `gpt-6-sol`, reasoning effort medium (Codex CLI v0.166.0, read-only sandbox). Codex reviewed the diff module and its tests, the expectations and fixtures, `draft.py`, `normalized/_format2.py`, `model.py`, the schema, `testing.py`, the docs and `pyproject.toml`. Its coverage note: "Did not review unrelated repository files."

### P1: changes to input restrictions are reported as no difference (`gxformat2/diff.py:33`, correctness, certain)

`_input_fields()` compares only `INPUT_FIELDS`. Valid input fields such as restrictions, validators and record fields are left out, although they change which values a workflow accepts.

Failure scenario: for a text input `x`, change `restrictions` from `['a']` to `['b']` and leave everything else unchanged. `diff_workflows` returns `has_changes=False`, and `gxwf-diff --exit-code` returns 0.

Verdict: CONFIRMED and fixed (`8fd8514`).

### P1: changes to declared step outputs are invisible (`gxformat2/diff.py:335`, correctness, certain)

`_step_change()` compares selected scalar fields, state, input defaults and referenced edges, but never compares `step.out`. A declared output can be renamed, or its output actions changed, without changing any of those values.

Failure scenario: change a step's unreferenced out port from `['a']` to `['b']`, or change its out port's rename action. Both are valid edits, and both return `has_changes=False`.

Verdict: CONFIRMED for actions, which are now fixed as `out_actions` (`59f43d3`). Not acted on for bare declarations; see above.

### P2: a special-case source parse overrides the existing longest-label resolver (`gxformat2/diff.py:229`, reuse, certain)

The new `resolve()` logic treats any `<input>/output` string as an input reference before calling `resolve_source_reference()`. That resolver matches a complete step label first, including labels that contain `/`, so the duplicated parsing collapses two distinct sources.

Failure scenario: with input `a` and a step keyed `a/output`, change a consumer's source from `a/output` to `a`. `normalized_format2.resolve_source('a/output')` identifies the step, but `diff_workflows` identifies both sources as input `a` and returns `has_changes=False`.

Verdict: CONFIRMED and fixed (`e0afd37`).

</details>
