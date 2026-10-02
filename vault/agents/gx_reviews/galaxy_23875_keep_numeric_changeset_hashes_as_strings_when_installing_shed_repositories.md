# galaxy #23875 — Keep numeric changeset hashes as strings when installing shed repositories

- Author: mvdbeek · base `release_25.1` · +48/-24 · not draft
- Reviewed at `ec4b78987dd` (base `6cdf9f6c136` = current origin/release_25.1)
- Worktree: `~/projects/worktrees/galaxy/pr/23875`

## Summary

Fixes the ~1/300 flake in `test_1040_install_repository_basic_circular_dependencies` (test_0035/40/45).
The shed test client (`lib/tool_shed/test/base/twilltestcase.py:279`) posts
`install_repository_revision` form-encoded. `__extract_payload_from_request`
(`lib/galaxy/web/framework/decorators.py:227-236`) JSON-decodes every form string, so an all-digit hg hash
becomes an `int`, `InstallRepositoryManager` comparison at `install_manager.py:337` never matches, the
"already installed" branch wins and the dependency is never reactivated.

Fix: private `__parse_repository_from_payload` (whose `include_changeset=False` branch had no caller)
becomes module-level `parse_repository_from_payload` and returns `str(name)`, `str(owner)`,
`str(changeset_revision)` after the existing missing-value checks. One unit test.

## Verdict

Approve. Small, correctly diagnosed, right layer for a release branch. Nothing blocking; a couple of
optional notes.

## Coverage of install-path parse sites

- `install_repository_revision` (`tool_shed_repositories.py:154`) — fixed.
- `install_repository_revisions` (`:216-252`) — values go through `listify` and re-enter
  `install_repository_revision(**current_payload)`, so they hit the new coercion. Covered.
- `uninstall_repository` (`:286`) reads raw `kwd`, not the decoded payload — values stay strings. Unaffected.
- FastAPI `index`/`show`/`check_for_updates` use typed query params. Unaffected.
- Client (`client/src/components/Toolshed/services.js:110`) and bioblend/ephemeris post JSON; the JSON-body
  branch keeps quoted strings. Unaffected. Only form-encoded callers (the shed test client, curl `-d`) hit this.
- Float form (`"1e10"`, `"40000000000000e5"`) already handled by `parse_non_hex_float` (#96cca7ccadb), and
  leading-zero hashes fail JSON decoding so they stay strings. Probed: `"1e10"` → str, `"012345678901"` → str,
  `"290925147592"` → int. So `str()` on an all-digit int is lossless. The PR covers the only remaining case.

## Layer

Fixing the decoder globally (e.g. `parse_int=str`) would break every legacy endpoint that relies on form ints,
and moving this controller to pydantic/FastAPI is dev-scope work. Coercing at the one parse helper for these
fields is right for 25.1. Turning the private method into a module function is enough of a seam for the test.

## Findings

1. **Low (optional), sibling of the same bug** — `new_tool_panel_section_label` / `tool_panel_section_id`
   in the same form payload get the same decoding (`"2024"` → `2024`, probed) and reach
   `tool_panel_manager.py:401` `new_tool_panel_section_label.lower()` → `AttributeError`. Only form-encoded
   callers; fine to leave out of a flake fix, worth a sentence or a follow-up.
2. **Nit** — `str()` isn't lossless for JSON literals: a form `owner=true` arrives as `True` → `"True"`, and
   `name=null` → `None` → misleading "Missing required parameter 'name'". Valid shed names can be `true`/`null`
   in principle; not realistic. Hashes can't hit this (hex). No change needed.
3. **Nit** — complementary hardening: `twilltestcase.py:278` could post `json=True` like real clients do.
   Keeping the server fix is still right, since the test then wouldn't exercise the form path; just noting.
4. **Nit** — the moved helper keeps the mixed `RequestParameterMissingException` vs `HTTPBadRequest` for
   `changeset_revision` (`:81-82`). Pre-existing; leave for 25.1.
5. **Test** — `test/unit/webapps/api/test_tool_shed_repositories.py`: drives the real
   `__extract_payload_from_request` with a form content-type and asserts the parsed tuple. Not trivial, tests
   the real seam rather than a mock. Importing a dunder module-level private is a bit awkward but acceptable.
   Comment at `:83-84` explains a non-obvious reason; keep it. Imports are top-level.
   - Ran locally (borrowed a 25.1-compatible venv, no install): passes; with the `str()` coercion reverted it
     fails `('…', 123, 456, 290925147592) != ('…', '123', '456', '290925147592')`. Red-to-green confirmed.
   - The `test_1040` regression itself is probabilistic (depends on generated hash), so CI green on Toolshed
     tests proves nothing either way; the unit test is the real guard.

## Forward-merge

`tool_shed_repositories.py` auto-merges into dev (dev only added type hints to neighbouring methods and still
has the old private helper unchanged). New test file doesn't exist on dev. `git merge-tree` conflict is only in
`lib/galaxy_test/api/test_framework.py`, pre-existing release_25.1↔dev drift, not this PR.

## CI (at review time)

- 2 failures: "Test Galaxy packages" Test (3.10)/(3.13) — `tests/files/test_gcsfs.py::test_file_source`,
  `google.auth ... Anonymous credentials cannot be refreshed`. Unrelated.
- Lint, test-class-names green; ~41 jobs (incl. unit, toolshed) still pending.

## Draft PR comment

> *Posted by Claude (AI assistant) on behalf of jmchilton; not written by them personally.*
>
> Looks good to me. Nice diagnosis. I checked the other install-path entry points: `install_repository_revisions`
> funnels through `install_repository_revision` so it gets the coercion too, `uninstall_repository` reads the raw
> `kwd` strings, and the client/bioblend post JSON so they never hit the form decoder. The `1e10`-style hashes
> were already covered by `parse_non_hex_float`, and leading-zero hashes fail JSON decoding, so all-digit ints were
> the only gap. I confirmed the new unit test fails with the `str()` calls reverted.
>
> One optional thing: `new_tool_panel_section_label` in the same form payload gets the same treatment
> (`"2024"` → `2024`), which would then blow up on `.lower()` in `handle_tool_panel_section`. Fine to leave
> for a follow-up since only form-encoded callers can hit it.
