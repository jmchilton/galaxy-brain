Run via Claude Opus 5.5 at high effort.

Reviewed `cbe75dc` against `origin/main` `83b59e7`. One refactor commit, `e5439cf`, pushed to `jmchilton`. It doesn't change behavior or the contract.

- The verdict:
  - `diff.py` (584 lines, now 605) wasn't yet a pile of special cases.
  - But three rounds of fixes had left four hand-rolled versions of one comparison: step fields, input fields, state, and `_port_changes` for `in_defaults`/`out_actions`.
  - They had also left two copies of the edge-to-set projection, in `_summary` and `_step_change`.
  - Steps were the one entity `_Side` didn't reduce to comparable values.
- The equivalence check:
  - I compared `diff_workflows` JSON and `render_text` before and after with `cmp`, so key order counted, and both were byte-identical.
  - That covered 568 fixture pairs (every `format2/diff` pair, every Format2 fixture against itself and its neighbors, and 31 expected errors) plus 30 dict-literal cases.
  - The dict-literal cases exercised each merged branch: a `None` state leaf against an absent one, nested and empty-dict state, `restrictOnConnections`/`optional`/`format`/`min: 0`, an input and a step sharing a name, `a/b` output-source ambiguity, `in_defaults`-only and `out_actions`-only changes, `run` kinds, unlabeled list steps, and an inner `id` that differs from the dict key.
- The gate is green: ruff, flake8, black, `mypy gxformat2 tests`, pyrefly, `flake8-docstrings`, `make lint-docs`, and `pytest tests/` (986 passed, 8 skipped).
- Contract changes for the TS port: none. Membership, ordering, the None-for-missing-side rule and state `kind` are all unchanged. The TS port can mirror the new shape: project, then one keyed compare.

## Acted on (`e5439cf`)

- **`_StepView`.**
  - Each step is projected once into `fields`, state leaves, `in_defaults`, `out_actions` and `plan_fields`.
  - `_Side` now holds only comparable projections, as its docstring already claimed.
  - This deletes `_step_field`, `_step_state` and `_in_defaults`, plus `_Side.plan_fields`, a parallel dict.
- **`_differing_keys`.** One ordered-union rule: BEFORE keys first, and a key that one side lacks always differs.
  - `_value_changes` uses it for step fields, input fields, `in_defaults` and `out_actions`.
  - `_state_changes` uses it too, and derives `kind` from which side has the key.
  - This replaces the inline input loop, the `STEP_FIELDS` loop, the state loop and `_port_changes`.
- **`_Neighborhood`.** One edge projection (`connections_in`/`out`, `upstream`/`downstream`) that the summary and the change both read. `_Edge.from_input` names the `source_port is None` convention that `edges_out_of` and `fed` relied on.
- **`_source_resolver`** is now extracted from `_side`.
  - Dropped the `source in input_ids` exact-match branch. It was redundant: in the length-sorted scan of `resolve_source_reference`, an exact match is always the first hit, and the `<input>/output` collapse then yields the same `(id, None)`.
- **`INPUT_FIELD_ABSENT_VALUES`** is a declarative table for the absent-means-`false` flags, in place of a hard-coded tuple inside the loop.
- **`STEP_FIELDS` is gone.** Nothing outside the module used it, and it would have been a second source of truth beside the `_step_view` dict literal.
- `_only_in` names the seven added/removed/unwired comprehensions.
- Output refs still compare as tuples, and a comment now says why: step `a/b` and port `b` of step `a` render alike.

## Not acted on

- **Delegating to `NormalizedFormat2.resolve_source` / `resolve_render_source`.**
  - Both key on `label or id`, not on the step key. A dict-form step with a prose label (`fastp` / "trim and QC paired reads") has the label as its render identity but `fastp` as its key.
  - So the diff can't delegate without a new parameter on shared model code.
  - It does reuse `resolve_source_reference`, which is the canonical longest-label primitive.
- **Splitting the module.** At 605 lines, with clear sections (models, view, comparison, diff, rendering, CLI), it is well under the 1k bar. A split would only churn imports.
- **Merging `draft._split_source_ref` with `_source_resolver`.** The semantics differ, as the normal review already noted, and changing draft behavior is out of scope.
- **The raw-to-normalized step alignment (`iterate_steps` zipped with `nf2.steps`).** It is needed because `_plan_*` fields and the dict key exist only on the raw side: normalization overwrites `label` and keeps an inner `id`. The length guard never fired across the fixture sweep.
- **Rendering, result models and CLI.** These are already small and table-driven, so I made no changes.

<details>
<summary>Full review</summary>

### Verdict

Behavior is solid and the contract is clean. The structure was drifting: each review round fixed a gap by adding a parallel comparison path instead of extending one. That's still cheap to fix, and nothing yet justified a module split or new shared abstractions.

### 1. Four copies of "compare two keyed value maps" (missed simplification)

- `_step_change` had three of them:
  - a `STEP_FIELDS` loop with `_canonical`
  - a hand-written added/removed/changed state loop over an ordered union
  - `_port_changes`, an ordered union with `.get` for `in_defaults`/`out_actions`
- `diff_workflows` had a fourth: an inline `INPUT_FIELDS` loop.
- They are all the same rule, so it should be one helper. State differs only in that it labels `kind`.
- A key that one side lacks must count as different, whatever the other side's value. Otherwise a state leaf that is `None` on one side and absent on the other would vanish.

### 2. Steps weren't projected (abstraction boundary)

- `_Side` projected inputs to field dicts and outputs to refs, but kept raw `NormalizedWorkflowStep`s.
- So the comparison code reached into model attributes through `_step_field` (a type/run dispatcher), `_step_state` and `_in_defaults`.
- Plan fields lived in a parallel dict keyed the same way.
- Projecting a `_StepView` once makes comparing a step the same act as comparing an input.

### 3. Duplicated edge-to-set projection

`_summary` and `_step_change` each built the same `{e.source}`, `{e.target}` and `{e.text}` sets from `edges_into` and `edges_out_of`. A `_Neighborhood` value object removes that duplication. `source_port is None` meant "from an input" in two places without saying so.

### 4. `_side` did too much, including a redundant branch

- `_side` handled alignment, plan fields, the unlabeled check, aliases, the resolver closure, edges and outputs, all in one 60-line function.
- The exact-input branch duplicated what `resolve_source_reference` already guarantees.

### 5. Minor

- `_Side.inputs` was typed `dict[str, Any]`.
- `optional`/`restrictOnConnections` were a hard-coded tuple inside the loop.
- `STEP_FIELDS` was a constant no code read once the projection existed.

### Checked and fine

- No file crosses 1k lines.
- No spaghetti went into shared code: `draft.py` changed only by renames, and `testing.py` by one additive field.
- Imports are at the top.
- The comments are short.
- `has_changes` as a `computed_field` is right.
- The renderer is table-driven.
- The CLI matches its sibling modules.

</details>
