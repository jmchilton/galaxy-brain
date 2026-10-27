# Codex review debrief

Codex found 1 finding (P2). It's confirmed but I didn't act on it. No code changes.

Not acted on:
- **Identifier leaks to another input that uses the same HDA** (`runtime.py:194`): when one input maps over a list and a second input selects one of those element HDAs directly, the second input's `element_identifier` also becomes the element's identifier (it was `null` before). Confirmed: the lookup is keyed by dataset id. Cheetah's `ElementIdentifierMapper` already behaves this way (keyed by dataset object, last name wins), so this matches existing semantics. Making it per-input would mean passing parameter paths through runtimeify's `adapt_dataset` callback signature. That's a rare edge, so it's noted in the issue text and not fixed here.

<details><summary>Full review</summary>

Codex reviewed every changed hunk plus actions/meta/wrapped/convert/runtime/registry. It ran a focused runtime reproduction but not the API suites.

- P2 correctness, `lib/galaxy/tools/runtime.py:194`, "Keep mapped identifiers specific to each input". Scenario: a GalaxyUserTool with two data inputs, one mapped over a list holding HDA 1 as `sample_a`, the other selecting HDA 1 directly. The plain input's `$(inputs.plain.element_identifier)` becomes `sample_a` instead of null. Confidence: certain.
</details>
