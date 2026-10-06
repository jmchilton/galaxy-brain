# Planemo: worth filing

Live gaps with no issue, found during the 2026-09 triage sweep. File them or drop them; move each out of this list once it has an issue.

Found during the sweep; not filed anywhere.

- **Dockstore web URLs are rejected misleadingly.** `dockstore.org/workflows/...:version` — the
  form a user copies from the address bar — fails with "try linting with planemo workflow_lint",
  and `_resolve_trs_url` builds a garbage URL instead of erroring. Root cause is two divergent
  TRS predicates: inline in `runnable_resolve.py` vs. exported `is_trs_identifier()` at
  `workflows.py:844`; only the inline copy sanity-checks the id. Consolidating on
  `is_trs_identifier` and moving service-segment validation into `parse_trs_id` fixes the
  duplication and the latent bug together. Detail: `old/planemo_1508_verification_trs_dockstore_id.md`.
- **Unversioned TRS ids resolve to `versions[0]`**, which is the branch (`main`), not the newest
  release — the "usually the latest" comment is wishful, and reproducibility suffers.
- **TRS/Dockstore support is undocumented.** `grep -rni "\btrs\b" docs/` returns nothing and
  `cmd_run.py` help never mentions it.
- **`workflow_lint` does not cross-check `.ga` `input_connections` targets** against existing
  step ids.
- **`docker_galaxy` engine has a dead hardcoded image fallback.** `planemo/options.py:617`
  defaults `--docker_galaxy_image` to the maintained `quay.io/bgruening/galaxy`, but
  `planemo/galaxy/config.py:1163` falls back to `bgruening/galaxy-stable` when the kwd is absent
  — Docker Hub, frozen at `20.09` since 2021-04-18. Two defaults for one thing; the non-CLI one
  is five years stale. Related to https://github.com/galaxyproject/planemo/issues/1721.
- **`metadata_source` and `format_source` lint gaps** — filed 2026-09-21 as
  https://github.com/galaxyproject/planemo/issues/1722 (tracked in planemo, fix lands in
  galaxy-tool-util).
- **`<repeat>`/`<section>`/`<conditional>` names are not checked against output names.**
  `_iter_param()` walks only `./inputs//param`, so a container element sharing an output's name
  is a real Cheetah namespace collision that lints clean. galaxy-tool-util. Unfiled.
- **Invalid datatype extensions are stored, not rejected, at runtime.**
  `lib/galaxy/model/__init__.py:5418-5427` falls back to `data` without erroring, and the bad
  string stays in the HDA `extension` column. Galaxy runtime. Unfiled.
- **`DATATYPES_CONF` and tool-local `datatypes_conf.xml` are undocumented.** Both are verified
  working escape hatches for non-core datatypes failing `ValidDatatypes`; nothing under `docs/`
  mentions either. The one planemo-side gap out of this batch. Unfiled.
- **The one `docker_galaxy` test is skipped.** `tests/test_cmd_test.py:185`
  `@skip("Configuring quay.io/bgruening/galaxy:latest is currently broken")`, added by mvdbeek
  in `d6b222d4` (2025-06-19). The engine has no other coverage. Un-skipping this is the
  acceptance test for 1721.
- **Nothing guards that a command's computed exit code reaches `ctx.exit()`.** `cmd_autoupdate`
  built an `exit_codes` list and `return`ed `coalesce_return_codes(...)` for years (#1478);
  click discards a callback's return value, so every failure exited 0. That one instance is fixed
  (PR 1727, merged), and it was the only command doing it, but nothing would catch the next one.
  planemo. Still unfiled.
- **`--urls` is defined inline and identically in both `cmd_lint` and `cmd_shed_lint`.** PR 1729
  moved `--doi` and `--conda_requirements` into `options.py` factories; `--urls` is the last
  copy-paste of the pattern that caused #667. One line each to fold in. planemo. Unfiled.
- **The DOI linter cannot currently succeed.** doi.org answers 403 to an unauthenticated
  `requests` GET, so `lint --doi` reports "dx.doi returned unexpected status code 403" for every
  DOI. `tests/test_lint.py:86` `test_lint_doi` still passes because it only asserts exit 1, which
  the 403 warning also produces — the check is dead and the test cannot tell. planemo. Unfiled.
