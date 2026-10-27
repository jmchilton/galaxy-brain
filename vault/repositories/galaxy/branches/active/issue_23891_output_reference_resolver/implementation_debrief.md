# issue_23891_output_reference_resolver — implementation debrief (revision, 2026-10-27)

**STATUS: READY.** Fixes galaxyproject/galaxy#23891. The branch is at `jmchilton/issue_23891_output_reference_resolver` @ `b28aa18d1b5`, 11 commits on `origin/dev` (`a9a68082414`). The re-harden debrief is in `earlier_drafts/3/`.

## Revision: John answered open question 1
John's decision: "Yes - but dev has shifted lets error it out at 27.0". `release_26.2` has branched, so dev is now 27.0.
- **Gate moved:** the branch's existing load error for an unresolvable `format_source`/`metadata_source` moved from profile 26.2 to 27.0, with John's OK. Without the move, tools that already have profile 26.2 would newly fail to load. Both gates now read one `OUTPUT_REFERENCE_STRICT_PROFILE`.
- **New error: shadowed legacy alias.** This is an unqualified reference whose qualified key is also another input's legacy alias, e.g. `input1` → `cond|input1` when `cond|inner|input1` exists.
  - From profile 27.0, it fails tool load with "is ambiguous. Use the qualified name 'cond|input1'".
  - Below 27.0 the reference is kept as written, which is the same as dev.
  - The linter errors at the same threshold through the shared `output_reference_ambiguity()`.
  - Runtime verified: the suggested qualified key wins, because `set_legacy_alias` names are looked up only after real keys.
- **Docs and wording:** the XSD has a new `### 27.0` section covering both rules. The linter's discovered-collection error now says "before Galaxy 27.0".
- **Tests:** the new load and lint tests were red against the old code. They cover the 27.0 load and lint errors, both attributes, and the lenient behavior below 27.0.
- **Process:**
  - A normal review found no bugs. I applied two nits; see `subagents/profile_27_review.md`.
  - A fresh test challenge rewrote one fixture as a literal; see `test_challenges_debrief.md`.
  - 194 unit tests pass, and `black`/`ruff`/`isort` are clean.
  - I didn't rerun the API or framework tests, because no runtime path below profile 27.0 changed.

## Snapshot
```
created .../differential-review/snapshots/20261027T192012Z-revision-b28aa18d1b5e.json
  revision @ b28aa18d1b5e vs origin/dev (merge-base a9a68082414f)
  since 20261027T164915Z-hardening-bc6d953af2ce:
    commits: 9 same, 0 rebased, 0 changed, 2 new, 0 dropped
```

## Open questions for John
1. **Mixed-type matches:** keep `any()`?
2. **YAML tool linting:** do it as a follow-up?
3. **PR split:** one, two or three PRs (see `scope_evaluation.md`)?
4. **PR description:** `pr_description.md` is stale. It predates the `metadata_source` lint, the `value_from` fix and the 27.0 gate, and it still says 26.2.
5. **CI:** fork CI hasn't run on `b28aa18d1b5`.
