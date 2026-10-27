# Thermo-nuclear code quality review

Acted on: nothing. Diff (3 commits, +222/-111, lib ~+130/-110 net move) has no structural regression, no file over 1k lines (output.py 436, upgrade/__init__.py 333, _util.py 105), no spaghetti growth. No code commits made; tests untouched.

Not acted on:
- `upgrade` importing from private `linters._util` - boundary smell, but the known open decision (#23891/#23902 move it to public `parser/output_references.py`). View: `parser/` is the right home, since it describes tool input structure, not lint policy. Rebase onto that when it lands; don't create a third location now.
- `ProfileMigration26_0.advise` repeats the linter's "qualified, else legacy" lookup (`_check_structured_like_reference`). A shared `InputReferences.resolve()` would save ~2 lines, but the two callers differ on purpose (linter: legacy only when no `|` and profile < 26.0; advice: also flags partially qualified refs, skips repeats). A shared resolver would need flags, which is worse. Left as is.
- `normalize()` then `qualified()` happens at three call sites. A `qualified_match()` helper was considered. Skipped because format_source reuses `normalized` for its legacy and error paths, so the helper only saves code at two sites.
- `output.attrib.get('name', 'unknown')`: collection outputs need `name`, so the fallback can't happen. It's harmless and matches the rest of the module, so left as is.

<details>
<summary>Full review</summary>

**Verdict: approve.**

1. Structural: moving `_InputReferences` to `linters/_util.py` and making it public removes code from output.py instead of copying it into upgrade, which is the right call. The new `legacy()` method replaces two inline comprehensions, so it adds no extra concept.
2. Code-judo: the obvious bigger move is a single "structured_like resolution" policy object shared by the linter and the advice. It was rejected because the profile-gated semantics differ (see above), and merging them would bring back the flag-driven branching this standard warns against.
3. Spaghetti: removing the old 18.01 `consider` check and adding a dedicated `ProfileMigration26_0` class follows the existing per-profile pattern. There are no bolted-on conditionals.
4. Boundaries/types: `InputReference` is a NamedTuple with explicit fields, with no casts or `Any`. The only issue is the private-module import across packages, which belongs to the known decision above.
5. File size: fine.
6. Modularity: the advice text builds the qualified-name list inline. It is acceptable for a single caller.
7. Legibility: fine. The `latest_supported_version` bump to 26.0 is consistent with the profile migration list.

</details>
