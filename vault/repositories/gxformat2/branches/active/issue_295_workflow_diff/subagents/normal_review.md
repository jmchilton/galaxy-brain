Run via Claude Opus 5.5 at high effort.

Reviewed `2ae336e`. Fixed four real gaps and two smaller cleanups as six commits; the new head is `29c93d4` on `jmchilton`. Each bug fix went red to green with a declarative case.

- Two bugs:
  - `workflow_outputs` came back empty for step keys that contain `/`.
  - `<input>/output` refs produced spurious edge changes.
- Two silent false negatives:
  - A changed step `in` default went unreported.
  - A relinked subworkflow `run` went unreported.
- Cleanups: the private `draft` helpers are now public, and a few typing and import fixes.

The local gate is green: ruff, flake8, black, `mypy gxformat2 tests`, pyrefly, `flake8-docstrings`, `make lint-docs`, and `pytest tests/` (984 passed, 8 skipped).

## Contract changes the TS port must mirror

- **`StepChange.in_defaults`** is a new key: `{port: {before, after}}`.
  - It compares the `default` of every step `in` entry, sourced or not.
  - The side with no default is `null`.
  - Ordering: BEFORE ports first, then ports only in AFTER.
  - It counts toward membership in `steps.changed`.
- **`run` is now in the step fields** (`fields.run`).
  - A string run compares as the string itself, a URL or path.
  - An `@import` compares as `{"@import": path}`.
  - Inline runs compare as `null`, so their contents are still not compared.
- **`<input>/output` is canonicalized to `<input>`** in step sources and output sources, because the converter treats the two as the same connection.
- `StepSummary` is unchanged: it has no `in_defaults` and no `run`, consistent with it having no `state` either.
- New fixture `synthetic-diff-relinked-slash-key.gxwf.yml`, paired with the existing `synthetic-url-run-yml.gxwf.yml`.
- `synthetic-diff-changed-step.gxwf.yml` gained:
  - `qc` now reads `reads/output`
  - `filter.in.header_lines.default: 1`
- `draft._iterate_steps` and `draft._present_plan_fields` were renamed to `iterate_steps` and `present_plan_fields`. Only `diff.py` used them outside `draft.py`.

## Not acted on

- **Edge strings are ambiguous for step keys that contain `/`** (`reads -> a/b/i`). Consumers mirror the strings rather than parse them, and changing the format would churn the contract.
- **Replacing an inline subworkflow, or changing its contents, is not detected.** Top-level-only comparison is a documented decision. Nested diffs are listed as left undone.
- **`tool_shed_repository`, `out`, step `doc`, and recursion into repeat lists in state** are documented decisions.
- **`draft._split_source_ref` duplicates input-vs-step resolution.** Its semantics differ slightly: any slash-less non-step ref counts as an input. Unifying the two would change draft behavior, which is out of scope. It is a candidate shared helper if a third caller appears.
- **JS orders integer-like object keys numerically.** `steps.changed` and the other step dicts promise AFTER/BEFORE order, but in JS, index-id keys (`"1"`, `"2"`) for unlabeled list-form steps will iterate in numeric order. No assertion depends on dict order, so this is a note for the TS port, not a code change.
- **A state `{$link: reads}` input is not a false positive in `unwired_inputs`.** I probed it: normalization lifts `$link` into `in_`. It is not pinned by a test.
- **A dict-form step with an inner `id:` different from its key** gave no crash and an empty self-diff when probed. It is still untested, as the implementation debrief already notes.
- **A change in draft status alone (draft to final with identical content) does not set `has_changes`.** It is reported through `before_is_draft` and `after_is_draft`, which seems intended.
- **There are no tests for `kind: removed` state leaves.** I probed it and it is correct. Not worth a fixture.

<details>
<summary>Full review</summary>

### Verdict

The branch is solid and well scoped. The contract is clean and portable, and the fixtures are well chosen. It reuses `normalized_format2`, `draft_as_workflow`, `resolve_source_reference` and draft step iteration rather than re-implementing them. There are two real bugs and two false negatives, all small to fix.

### Bugs

1. **`_Side.outputs_from` splits the canonical `node/port` source on the first `/`.**
   - A step keyed `a/b` that feeds an output listed `workflow_outputs: []`.
   - Labels containing `/` are explicitly supported (AGENTS.md "Key Patterns", `synthetic-draft-slash-label`).
   - Fix: keep outputs as `(node, port)` refs and render text only at the model boundary.
2. **`<input>/output` was not canonicalized.**
   - `in: {i: reads/output}` and `in: {i: reads}` convert to identical native `input_connections`, yet the diff reported a `connections_in` change.
   - `fed` ignored the edge, so an input referenced only that way would wrongly land in `unwired_inputs`.

### False negatives (gaps not listed as compared or not compared)

3. **A changed step `in` `default` was invisible.** A sourceless `in` entry produces no edge, and defaults weren't compared.
4. **A changed linked `run` (URL, path or `@import`) was invisible.** `fields` covers `tool_id` for tool steps; the run reference is the subworkflow equivalent.

### Reuse and abstraction

5. **`diff.py` imported `_iterate_steps` and `_present_plan_fields` from `draft.py` as private names.** Promoted them to public helpers with docstrings.
6. **`_split_source_ref` in draft and `resolve` in diff overlap.** Left as is; see the not-acted-on list above.

### Nits (applied)

- `_input_fields(inp: Any)` is now `BaseInputParameter`.
- `WorkflowSource` listed `Path` alongside `os.PathLike`.
- The draft import names weren't sorted.

### Checked and fine

- Imports are at module top.
- Comments and docstrings are short.
- The CLI follows the sibling `main(argv)`/`_parser()` pattern, and `argparse` docs come from `_parser`.
- The `fixture_after` harness change is additive and small.
- `state` versus `tool_state` (as a JSON string) compares equal.
- A `$link` in state is lifted into `in_`.
- `has_changes` is a `computed_field`, so it appears in the JSON dump.
- The test split is right: semantics are declarative, while the CLI and text rendering are imperative.
- The tests are not trivial.

</details>
