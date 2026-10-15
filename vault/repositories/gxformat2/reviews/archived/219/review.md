# Review of gxformat2 PR #219

PR: https://github.com/galaxyproject/gxformat2/pull/219

Reviewed commit: `773a20b975704689bd716a566cc8c6ed8017b2f7` on 2026-10-11.

Recommendation: **hold merge** until extraction preserves step identity and draft validation consistently enforces the shared workflow contract. This is a local, unposted review. No GitHub review/comment was submitted and no merge was performed.

## Findings

### P1 — Preserve derived IDs before removing unlabeled list steps

Source: [`gxformat2/draft.py:910–913`](https://github.com/galaxyproject/gxformat2/blob/773a20b975704689bd716a566cc8c6ed8017b2f7/gxformat2/draft.py#L910-L913).

`_trim_steps` filters the original list without storing the index-based identity of retained entries. For supported list-form steps without an explicit `id` or `label`, normalization and `_list_step_key` derive identity from `index + input_count`. Removing an earlier draft step therefore changes every later derived ID while surviving input references and `outputSource` values still address the original IDs.

Reproduction: a draft with one `reads` input and three unlabeled list steps has identities `1` (TODO tool), `2` (concrete producer), and `3` (concrete consumer referencing `2/output`), with workflow output `3/output`. `validate_draft` accepts the original. Extraction correctly drops only the TODO step, but the retained producer/consumer become `1`/`2`. The consumer now references itself and the workflow output addresses a nonexistent `3`; `validate_draft(extracted.workflow).ok` is false. Replacing the output with another surviving reference can conceal the changed dependency from validation, since cycles are not diagnosed.

Materialize the original derived `id` on retained list entries before filtering, or rewrite every surviving reference and output to a stable identity. Add a shared declarative extraction case covering an early dropped unlabeled step followed by a retained producer and consumer. Apply the fix at every nested extraction level.

### P2 — Reuse shared semantic validators in `validate_draft`

Source: [`gxformat2/draft.py:418–428`](https://github.com/galaxyproject/gxformat2/blob/773a20b975704689bd716a566cc8c6ed8017b2f7/gxformat2/draft.py#L418-L428).

`validate_draft` invokes only the generated structural model and its own draft-specific checks. It does not run the shared semantic validators that the same PR calls from `validate_format2_draft` and `validate_format2_draft_strict`.

A draft containing a resolved `cat1` step with nonempty `state: {a: 1}` and `tool_state: {a: 2}` returns `ok: true` and no diagnostics from `validate_draft`, while `validate_format2_draft` rejects the identical document with `ValueError: Workflow step specifies both 'state' and 'tool_state'; only one may be set`. This is a shared invariant on concrete parameter binding, not an unresolved wrapper choice. The same missing reuse also bypasses workflow-input cross-field invariants checked by `_semantic_validators`.

Run the shared workflow/input/step semantic checks through the diagnostic-producing draft validator, retaining appropriate step paths, and add declarative negative cases. Avoid implementing a second divergent copy of those rules.

### P2 — Enforce the TODO input-type prohibition for shorthand inputs

Source: [`gxformat2/draft.py:505–513`](https://github.com/galaxyproject/gxformat2/blob/773a20b975704689bd716a566cc8c6ed8017b2f7/gxformat2/draft.py#L505-L513).

The input-type topology check handles only mapping-valued input declarations. The supported string shorthand `inputs: {reads: TODO}` therefore returns `ok: true`, while the equivalent expanded declaration `inputs: {reads: {type: TODO}}` returns the expected topology error. Both pass structural validation; a step referencing `reads` does not otherwise reveal the violation.

Read the input type from either the shorthand string or the mapping before checking it. Add a shared declarative case proving both representations reject TODO input types.

## Verification

- Exact-head isolated checkout: `/private/tmp/gxformat2-pr219-review`; no tracked files changed. `ghwt create gxformat2 219` could not create the canonical PR checkout because its branch is already used by `branch/abstraction_applications`; an isolated temporary clone was used without moving that branch.
- Installed dependencies from the committed `uv.lock` with Python 3.14.3.
- Repository suite: `.venv/bin/pytest tests/ -q` — **871 passed, 8 skipped** in 12.82 seconds. IWC environment was not configured for this run.
- Expected-failing regression checks: `.venv/bin/pytest -q /private/tmp/gxformat2-219-reproductions.py` — **3 failed**, one for each finding above.
- Ruff checks on the changed handwritten draft, validator, rendering, and generation implementations passed.
- Black checks on those six handwritten implementation files passed with `--target-version py310`. The first attempt required escalation because Black's process manager needs a local socket.
- `.venv/bin/flake8` passed.
- `.venv/bin/mypy gxformat2 tests` — passed, 97 source files.
- Whole-tree Ruff reported existing E402 imports in untouched `docs/conf.py` and `scripts/bootstrap_history.py`; these are not PR findings.
- GitHub checks for the reviewed head are green. The in-repository TypeScript workflow is not a check of the separate `galaxy-tool-util-ts` repository; the coordinator is reviewing that parity separately.

Reproduction script and output accompany this review as ordinary supporting artifacts. These are review checks only; no project tests were edited and no fix was applied.
