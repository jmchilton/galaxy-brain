# Normal review debrief

Run via claude-opus-5-5 at default effort (general-purpose subagent).

I fixed findings 1–10 in foundry-lib `3952d36` and Foundry `6d96d0aa`:
- The Runtime Notes line now names every declared map and makes no promise about research or sibling-map links.
- The verifier checks that `expanded_from` names a declared ref that SKILL.md names.
- The lib now tests that an expanded ref isn't expanded again, and that an expanded note's companions carry `expanded_from`.
- The hook gets the unhashed skeleton and returns records, and refs that aren't note-resolved are skipped explicitly.
- `mocLinkNotes` skips companions, and `mocLeafRefs` is registered directly.

Not acted on:
- 11, leaves that link pages which aren't packaged: this was already true for authored pattern refs and is out of scope. It's a possible follow-up on transitive reachability.
- 12, the lockfile and lib release: this is merge order, recorded in the branch record.
- Reverse validator direction (a `related_patterns` entry the body never links): harmless, because the entry still ships.

<details><summary>Full review</summary>

Summary: tests pass. The design is sound, with the hook in lib and MOC semantics in build-cli. Dedup, ordering, licence and the orphan sweep are correct. Findings:

1. should-fix: the Runtime Notes line overclaims for research-survey and sibling-map links.
2. should-fix: the verifier exempts any `expanded_from` without checking it.
3. should-fix: the lib's "one level" test didn't test recursion.
4. should-fix: companions of an expanded note weren't tested.
5. nit: the hook context carried fake null hashes.
6. nit: the return type `unknown[]` could be records.
7. nit: the docs said every declared ref, but the code skipped non-note refs implicitly.
8. nit: `mocLinkNotes` didn't skip companions.
9. nit: the notes line could omit a map whose leaves were all claimed elsewhere.
10. nit: `mocLeafRefs` was exported but unused, and the hook had a wrapper.
11. note: leaves link unpackaged pages (19 targets in the repair bundle), as authored refs already did. Track separately.
12. merge order: the lockfile and the 0.13.0 release.

Fine as is: the validator rule, the integration tests, the regenerated casts, and the docs and changeset.
</details>
