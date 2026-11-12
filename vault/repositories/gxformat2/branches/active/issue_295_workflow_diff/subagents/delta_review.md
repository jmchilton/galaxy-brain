Run via Claude Opus 5.5 at high effort. Codex part run via gpt-6-sol at medium effort (`codex exec -s read-only`).

# CI fix + delta review (nested inline keys, list-form id pairing)

Scope: `570de0f..397819a`, rebased as `ac595a7..66625f7` (range-diff identical), with the TS port `3fd23149..a5c6cd57` reviewed alongside. Head now `efb2e5b`.

## CI on `397819a`

- `build (3.10)`: tox `py310-lintdocstrings` D401 at `diff.py:242`, `:593`. Branch-caused; reproduced with `uvx --with tox-uv tox -e py310-lintdocstrings`, fixed in `a8f6c28` (imperative docstrings).
- `build (3.13)`: `py313-unit` collection errors (`iwc/` needing `planemo`, `schema_rules.yml` not in the installed package). The #299 red; the branch was already rebased onto `3547f99` (`66625f7`). `tox -e py313-unit` passes locally.
- `build (3.14)`, `build (3.15)`: fail-fast cancellations after 3.10, not failures.

## Findings

Normal review (REVIEW_FOCUS, bugs first) and Codex over the same ranges.

1. **Fixed (`2dff5d4`, Codex P1, confirmed).** The collision `ValueError` only fired when both colliding keys were *reported*. An unchanged top-level `nested/first` step plus a removed inner `first` gave `steps.removed["nested/first"]` with no error, ambiguous for Foundry. `_claim_keys` now records every level's step keys and input/output ids (both sides) before diffing it and raises on reuse by another level; `_merge` became plain `dict.update`. Red-to-green: `test_nested_key_colliding_with_unchanged_slash_keyed_step_rejected`, `test_nested_input_colliding_with_slash_keyed_input_rejected`. Self-diff of such a workflow now raises (was empty).
2. **Coverage added (`efb2e5b`, task + Codex P3).** Three `diff.yml` cases, four fixtures, all cataloged:
   - `test_diff_list_step_id_not_unique_falls_back_to_key`: AFTER shares `id: first` across two steps, so `first` is removed and `first cat` added (both `id: first`).
   - `test_diff_list_step_id_pair_onto_unpaired_key_falls_back_to_key`: the blocked-pair (fixpoint drop) path.
   - `test_diff_relabeled_list_step_prefixes_nested_levels_with_after_key`: relabeled list-form parent, two inline levels, `new/deep/x` removed.
   - Green on arrival. Each fallback case goes red when its path is mutated out (uniqueness filter; blocked-drop loop), in Python and TS.
3. **Needs decision (Codex P1, behaviour kept).** The blocked-pair rule prefers key matching: BEFORE `[id first]`, `[id second, label second cat]` → AFTER `[id first, label second cat]` reports `first` removed and `second cat` changed, not `first` relabeled with `second` removed. Doing the latter would put `second cat` in both `removed` and `changed`. Now pinned by the case above.
4. **Refuted (Codex P2).** Integer-like step keys ordering differently in JS. This is a known accepted difference in #233's body. Key order isn't in the contract.
5. **Docs.** `diff.yml` header and `docs/cli_diff.rst` now say: blocked pairs fall back; nested prefixes use the parent's AFTER key; a list-form id change on a key-matched step is no change; collisions raise whether changed or not.

## JSON shape

No change from `397819a`/`a5c6cd57`. Raw `--json` for all 29 earlier cases and 5 probes was identical before and after the fixes. Py/TS raw `cmp` is identical on all 32 cases and the 5 probes. The delta itself added `steps.{added,removed}.*.id` and `<parent>/`-prefixed nested keys. The only new behaviour is the error on cross-level collisions.

## Gates

`make lint`, tox `py310-lintdocstrings` and `py313-unit`, `make lint-docs`, pytest 1021 passed / 8 skipped. IWC: 132 workflows self-diff clean, and 34 inline-removal pairs give identical Py/TS JSON.

## Open questions

- Should the blocked-pair fallback prefer id identity (item 3)?
- Should a list-form `id` change on a step matched by label be reported? This would flip `has_changes`.
