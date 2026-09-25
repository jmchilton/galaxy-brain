# Planemo issue triage

PR and issue states below verified against GitHub 2026-09-24.

## Blocked issues

None. 1672 (repo-level data-manager / data-table linting) was blocked on
galaxyproject/galaxy#23229, merged 2026-09-22 — now actionable, moved to the build-next list.

## Open issues with an open PR

- 542 shed_lint --fail_fast https://github.com/galaxyproject/planemo/pull/1710 (draft, closes)
- 1112 TS repo name lint level https://github.com/galaxyproject/planemo/pull/1111 (closes; CI green)
- 1175 test --serve https://github.com/galaxyproject/planemo/pull/1708 (draft, stacked on 1701)
- 1476 anonymous external Galaxy https://github.com/galaxyproject/planemo/pull/1700 (closes)
- 1478 autoupdate exit code 0 on failure https://github.com/galaxyproject/planemo/pull/1727 (draft, closes)
- 1489 pin Galaxy python version https://github.com/galaxyproject/planemo/pull/1704 (closes)
- 1536 `--test_data` for tool tests https://github.com/galaxyproject/planemo/pull/1725 (closes)
- 1625 test crash on undefined workflow output https://github.com/galaxyproject/planemo/pull/1728 (draft, closes)
- 1629 invocation label slashes https://github.com/galaxyproject/planemo/pull/1724 (closes)
- 1667 config click.Path conversion https://github.com/galaxyproject/planemo/pull/1714 (closes)
- 1668 run --no_wait crash https://github.com/galaxyproject/planemo/pull/1712 (closes); related https://github.com/galaxyproject/planemo/pull/1713
- 1680 dedupe wait_on https://github.com/galaxyproject/planemo/pull/1711 (closes)
- 1686 embedded Galaxy run engine https://github.com/galaxyproject/planemo/pull/1701 (draft; no closes keyword)
- 1693 iwc lint missing tests https://github.com/galaxyproject/planemo/pull/1695 (closes)
- 1694 iwc changelog date https://github.com/galaxyproject/planemo/pull/1697 (closes)
- 1705 workflow collection assertions https://github.com/galaxyproject/planemo/pull/1723 (closes)

No issue behind it: https://github.com/galaxyproject/planemo/pull/1726 (draft) skips tests when
quay.io, the Tool Sheds, Dockstore or usegalaxy.eu are down. Test infra, nothing to close.

## Close candidates (1)

1267 only. **Not implemented** — the #1213 false positive is fixed (proved by counterfactual),
but `workflow_lint` and the editor's Best Practices panel lint different data structures:
planemo reads the legacy `.ga` `step["inputs"]` list, so it false-positives on nested conditional
inputs and misses a genuinely dangling data input. Close-with-ask; the divergence table and 11
enumerated follow-ups are in [[ISSUE_CLOSE_DRAFTS_2026-09-21]]. Highest-value single fix is
galaxy `managers/workflows.py:1764` (`val` should be `partval`) — three of the planemo-side
items collapse into it.

## Transfer, don't close (2)

Live bugs filed in the wrong repo:
- 1535 `mulled-search` GitHub 401 → galaxy-tool-util
- 1589 `HelpInvalidRST` on local images → galaxy-util docutils settings

1649 (`NodeJSEngine.__del__` TypeError → cwl-utils) was closed by its reporter on 2026-09-23
with "fixed in the latest version". Nothing was transferred, so if the cwl-utils defect is still
live upstream it is now untracked anywhere.

## Cluster decisions

- **Appliance**: resolved 2026-09-21. The four stale issues are closed and the decision is
  tracked in https://github.com/galaxyproject/planemo/issues/1720 — either rebuild the appliance
  or take the docs down (`docs/appliance.rst`, `writing_appliance.rst`, `writing_cwl_appliance.rst`,
  `_writing_test_and_serve_appliance.rst`, `docs/Vagrantfile`, the `appliance` toctree entry in
  `docs/index.rst`, and the appliance route offered in `docs/writing.rst`).
- **Machine-readable lint** (1139 1360): tool-side JSON report is nearly free; the workflow side
  is the real work. Split along that line. Check `PR_DESCRIPTION_STRUCTURED_DATA_ERRORS.md` first.

## Worth filing — live gaps with no issue

Found during the sweep; not filed anywhere.

- **Dockstore web URLs are rejected misleadingly.** `dockstore.org/workflows/...:version` — the
  form a user copies from the address bar — fails with "try linting with planemo workflow_lint",
  and `_resolve_trs_url` builds a garbage URL instead of erroring. Root cause is two divergent
  TRS predicates: inline in `runnable_resolve.py` vs. exported `is_trs_identifier()` at
  `workflows.py:844`; only the inline copy sanity-checks the id. Consolidating on
  `is_trs_identifier` and moving service-segment validation into `parse_trs_id` fixes the
  duplication and the latent bug together. Detail: [[planemo_1508_verification_trs_dockstore_id]].
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
  click discards a callback's return value, so every failure exited 0. It was the only command
  doing this, but nothing would catch the next one. planemo. Unfiled.

## Build-next shortlist

XS/S: 588 667 286 577 904 1515 1413 1077 258
S–M: 1516 · M: 807 1139 1613 1449 96(+706) · admin: 1342
Newly actionable: 1672 (galaxy#23229 merged 2026-09-22)

## Needs a human decision

- CWL: still a hard dependency and two live engines. Supported or not? Gates 315 486 728 1484 + docs.
- 580 blocked on agreeing a `.shed.yml` key order (IUC standards don't define one).
- 1411 was never a regression; ask for the exact command.
- NEEDS-REPRO: 1078 746 1194 1423 1584
