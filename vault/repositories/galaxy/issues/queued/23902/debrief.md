# Debrief: format_source legacy alias profile removal

Source: `format_source_legacy_alias_profile_removal.md`, a handoff from `fix_format_source_docs`. Proposal: `proposed_format_source_legacy_alias_profile_removal.md`.

## Research

- Read the `fix_format_source_docs` PR description and the `issue_23891_output_reference_resolver` implementation debrief. They are the sources for the sweep numbers (94 of 555) and the resolver behavior.
- `format_source_in_conditional.xml` on `fix_format_source_docs` is the visual lead. The test's assertions give the full one-deep and two-deep table, so the issue shows real test output, not a hypothetical.
- Checked on `dev`:
  - `set_legacy_alias` calls are in `actions/__init__.py`.
  - The XSD still says "a conditional name is not included".
  - `execute.py:585` gates `structured_like` at 26.0, at runtime and only for mapped-over tools.
- **Correction to the source:** the `structured_like` linter erroring at 26.0 exists only on the branch. The precedent the issue cites is the runtime gate from #22432.
- No duplicates. #11357 (unify nested param access) is related but broader.

## Review round (subagent)

- Every table cell matches the test assertions. Discovered-collection fallback confirmed on dev (`output_collect.py:215-227`). Shadowing matches #23891. #22432's gate was moved from 18.09 to 26.0.
- **Wrong claim fixed:** Cheetah `$input1` doesn't use the alias (`WrappedParameters` uses `.data`). The alias's other readers are `structured_like`, `type_source` and `change_format`.
- **Gap fixed:** "matched only through the alias" at load doesn't catch `cond|input1` resolving `cond|inner_cond|input1` across branches at runtime. The proposal now also says new-profile runtime lookups skip the alias, and adds an open question, because #19330's test comment says `cond|input1` "should work for both cases".
- Other changes:
  - Test tool provenance fixed: it was added in #15978 and extended in #19330.
  - `LegacyUnprefixedDict` location fixed: it is in `wrapped.py`.
  - The issue now says #23891's branch patches the discovered-collection and shadowing cases but still accepts the alias.
  - The unpublished `upgrade_advice_structured_like` branch reference is now #23884.

## Leftovers

- **Decision for John:** is `cond|input1` resolving the inner-conditional input intended? It decides whether the runtime half of the proposal stays.
- #11357 is not mentioned.
- Once filed, `fix_format_source_docs` should add the issue number to `format_source_in_conditional.xml`'s output3 comment. The branch agent owns that.
