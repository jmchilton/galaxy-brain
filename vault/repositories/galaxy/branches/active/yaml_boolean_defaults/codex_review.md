# Codex review — yaml_boolean_defaults (re-harden)

Codex (read-only, independent brief) reviewed `6df388987b4...975b9157f50` (base `origin/release_26.1`) and returned one P3 reuse finding, CONFIRMED and handed to the thermo-nuclear step for the fix (see [thermo_nuclear_review.md](thermo_nuclear_review.md)). No correctness defects reported.

## Not acted on

- None.

<details>
<summary>Full review</summary>

**P3 reuse — `lib/galaxy/tools/evaluation.py:132` `_strip_group_state_keys`** (confidence: certain). Duplicates the recursive dict/list traversal of `_remove_internal_state_keys` in `lib/galaxy/tools/parameters/meta.py:192`. Policies differ (two named keys + copy vs every `__`-prefixed key + in-place mutation), so direct substitution would change behavior; extract/generalize a shared cleanup keeping caller-specific policies. No runtime failure claimed.

Triage: CONFIRMED by reading both helpers. `meta.py`'s version runs on request-format state before Pydantic validation; the new one runs on legacy/21.01 user-tool state before `to_cwl` rendering, where `__class__`-style runtime values must survive, so a blanket `__` prefix filter is not safe there.

Coverage: full diff plus surrounding loading/execution code. Codex ran 96 targeted conversion and YAML-model unit tests (pass); API tests not run.

</details>
