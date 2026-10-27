# Codex review — upgrade_advice_structured_like

Reviewed `origin/dev...4297169ea54`. Acted on P2 (repeat paths): fixed in `87a7b89abe7`, red→green test `test_26_0_reference_in_repeat_not_advised`; 164 passed. Did not act on P1.

## Not acted on
- **P1 top-level shadowing** — CONFIRMED-ish (matches the old debrief's note): a top-level `input1` plus `sect|input1` declared earlier with `structured_like="input1"`. Mapped-over resolution before 26.0 can pick the nested input, and 26.0 picks the top-level one, yet the advisor stays silent. NEEDS-DECISION: the ref is already valid and qualified, so advising would mean a new "resolution changes" message for an ambiguous tool shape. Left for John and noted as a follow-up.

<details><summary>Full Codex findings</summary>

- P1 `upgrade/__init__.py:271` — top-level name match hides changed nested resolution (likely).
- P2 `upgrade/__init__.py:273` — advice suggests a qualified path inside a repeat, which is unresolvable when mapping over (certain).

Coverage: linters/_util.py, output.py, upgrade/*, lint.py, tools/execute.py, parameters/__init__.py, dataset_collections/structure.py, parser/xml.py, tests.
</details>
