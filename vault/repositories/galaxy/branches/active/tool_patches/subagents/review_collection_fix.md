# Review: collection_fix revision (e0a94aa8566)

The verdict was ship. The review found no bugs. It ran a parity script over 19 cases, feeding each document to both the checker's `lint_patch` and `PatchFile`, and the two agreed on every one. I acted on its two optional test suggestions by adding the flag value `1.0` and a mixed file with a security advisory and no upstream entry (`f531c63edc2`).

Not acted on:
- **A shared `OnlyTrue` type for `UpstreamRef.subset`, plus the same rule for `changes_requirements`.** The checker rejects an explicit `false` in both fields, but the engine accepts it. That gap predates this branch revision, so it's left as a follow-up.
- **Report differences caused by stopping at the first error.** The model raises only the first error, while the checker collects all of them. The verdict is the same either way.

<details>
<summary>Full review</summary>

**Verdict: ship it.** There are no bugs, and nothing security-sensitive came up.

- **Parity.** The model and the checker agreed on all 19 cases:
  - The flag values null, false, 1, 1.0 and "true" are rejected, and true is accepted with or without an upstream entry.
  - A file that isn't hand-authored is rejected, as is an advisory-only file.
  - A mixed file is accepted with no upstream entry, and also with only a compat upstream entry.
  - A security advisory is rejected without a security upstream entry and accepted with one.
  - Plain security ops without the flag are still rejected.
- **Placement.** The new checks sit just before the upstream rule. `has_security_ops and not collection_fix` mirrors the checker's `ops_need_up`, and the three messages match `docs/lint.md` exactly.
- **Tests.** They pin the behaviour and fail without the change: on head, `extra="forbid"` makes every `match=` miss. The apply test pins the full apply path with an empty `upstream`, and checks that the flag stays off the state.
- **Not putting the flag on `PatchState`: agree.** It is a file-level flag, and in a stacked file it would mislabel the PR's ops. If it's ever needed, derive it per kind instead, from a security state with an empty `upstream`. Nothing in `lib/galaxy` or `client/src` assumes `upstream` is non-empty.
- **Nits.**
  - A shared only-true validator would also suit `subset`, which has the same pre-existing gap.
  - No Galaxy docs cover the patch file format.

</details>
