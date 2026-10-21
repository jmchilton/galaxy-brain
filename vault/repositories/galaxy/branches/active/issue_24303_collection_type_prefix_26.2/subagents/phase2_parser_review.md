# Phase 2 parser/spec review (`f19122cecdc`, `e10e12f0be6`)

Acting on (fixups after phase 3 lands): reject any `sample_sheet` level in a static `type_prefix` (parser + linter, shared helper); fix vacuous `"type_prefix" not in lint_ctx.warn_messages`; YAML empty prefix → validation error (`is None` fallback, prefix only); compute `Version(profile)` once in the linter; drop the borderline description-only model test line.

Not acted on:
- tool_util imports `check_collection_type` from `galaxy.tool_util_models._base` — packaging already depends on it; mention in PR rather than add a re-export.
- Pydantic `collection_type_prefix` not typed `CollectionType` — sibling `collection_type` isn't either; keep consistent.
- Sibling `type_source` YAML `or` quirk — out of scope.

<details><summary>Full review</summary>

27 targeted tests pass; schema.ts diffs only the field; no security issues.

Medium: (1) `sample_sheet` accepted as prefix by `check_collection_type` (`_base.py:24`) though XSD rejects it; (2) vacuous linter test assertion.
Low: (3) public helper in private `_base` module, imported from tool_util in 2 places; (4) model field unvalidated; (5) YAML `or` drops `""`; (6) `Version(profile)` per-iteration; (7) borderline description test.
Fine: `from_dict` back-compat, XML/legacy/YAML consistency, linter mirrors `structured_like` precedent, XSD docs accurate, imports at top.

</details>
