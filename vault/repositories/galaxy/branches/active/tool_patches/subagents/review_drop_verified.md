# Review: drop coverage/ reading and `verified`

I acted on nothing. The review found no real issues in the new commit `a10f45acba4` (read only `collection.yml`, `codes.yml` and `patches/`) or in the three commits rebased onto it (`469cb604a52`, `d16178fc120`, `4993f7d8d92`). All five findings are nits or informational, and every nit predates this change.

Not acted on:

- **The override `expanded_sha256` check probably never matches real content.** `database.py` compares `advisory.expanded_sha256` with `current.sha256()`. The collection likely computes that value over c14n, as it did for coverage, so real overrides would be ignored and Galaxy falls back to the version file. That fails safe. The input hash also depends on whether an earlier collection patched the tool. This needs John's keep-or-drop decision, like the one `verified` got, so it is out of scope here.
- **`digest_for` leaves out the collection version** (pre-existing). If only the version in `collection.yml` changes, stored entries keep reporting the old version, although `token()` notices the change. Coverage never covered this either. Left for a separate decision.
- **The comment at `model.py:267` is stale** (pre-existing, already flagged in `review_phase_ab.md` item 11). It belongs with the `expanded_sha256` decision.
- **`codes.yml` is read twice, once to parse and once to hash** (pre-existing). This is harmless.
- **`verified` disappears from tool API output.** No client code, API schema or test reads it, so nothing needs updating.

<details>
<summary>Full review</summary>

The reviewer found no security issues. It extracted each commit with `git archive` and ran the tests there:

- `test_tool_patches.py` plus `test_index_versions.py` passed 213, 211, 232 and 234 at the four commits, with 2 skipped each time.
- Both `INDEX_SCHEMA_HASH` re-pins are correct: `9f4ff8ab…` at the first two commits and `7b91466c…` at the python2to3 commits. The base was `a46094bf…`.
- `ruff --select F` is clean at every commit.

Findings, ranked:

1. **Informational.** The override `expanded_sha256` check in `database.py` has the same to_string-vs-c14n problem. In the first collection, `current.sha256()` is `sha256(tool_source.to_string())`; once an earlier collection has patched, it is `sha256(xml_to_string(tree))`. A mismatch logs "is for other content, ignored" at INFO and falls back to the version file. `test_advisory_override_checks_expanded_sha256` builds its hash with Galaxy's own `to_string()`, so it cannot catch this. Under the REVIEW_FOCUS "never-working input" item, this field may need a decision like the one `verified` got.
2. **Nit, pre-existing.** `digest_for` hashes the name, path, file sha, codes, policy, series and changeset, but not `c.version`. Yet `PatchState.collection` records the version, and `indexed_patch_is_current` compares only the digest. `token()` does include the version. Apart from this, both digests cover everything Galaxy reads that can affect the patched result.
3. **Nit, pre-existing.** The comment at `model.py:267` says "unpatched expanded sha256". The value compared is the input this collection sees, which is already patched once collections stack.
4. **Nit, pre-existing.** `_load_codes` and `codes_sha256` each read `codes.yml` on their own.
5. **Informational.** `patches_as_dicts` no longer emits `verified`. Nothing consumes it.

Areas checked:

- **Completeness: clean.** No code anywhere in the tree reads `coverage/`, uses `verified`/`unverified` in a tool-patch context, or takes `expanded_sha256` from coverage. The remaining matches are unrelated, such as the source-store coverage scan, the `coverage` dev pins, and the email and biocontainer text.
- **Dead code: none.**
  - `_lock` is still used by `file_sha256` and `load`.
  - `_file_sha256` is still used for `codes.yml`.
  - `_Input.sha256()` is still used by the override check.
  - The `json` imports are gone.
- **Tests: they pin real behaviour.** Both `test_applied_patch_logs_at_info` and the `== plain` assertion in `test_digests_follow_codes_and_ignore_coverage` fail on the base code. `test_mixed_case_shed_key_matches_verbatim` exercises the shed owner/repo walk. The only test dropped was the one for the path guard that no longer exists.
- **Rebase.** `git range-diff` shows only the intended differences: the guard and its test removed, the commit message updated, the hash re-pinned, and the coverage test context dropped. No commit references a symbol that an earlier commit removed.

</details>
