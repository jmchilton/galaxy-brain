# Marius companion PR #13 review — 2026-10-11

**Recommendation: approve and merge into John's #1704 branch.** No blocking finding in the companion change. This is a recommendation only; the review agent has not merged, pushed, or posted a GitHub review.

- Companion: https://github.com/jmchilton/planemo/pull/13
- Upstream: https://github.com/galaxyproject/planemo/pull/1704
- Reviewed companion head: `ca289c71d616d7d9c629944b81164a09f232400f`
- Reviewed base: `7ef7473a9205876381ce6cdb2a9bda45b800a5b3`
- Scope: complete companion diff plus `planemo/galaxy/run.py`, virtualenv consumers in `planemo/galaxy/config.py`, option/config defaults, and relevant tests.

## Why the fix is correct

`resolve_python()` centralizes the existing interpreter selection without changing its fallback policy. `create_command()` now warns when the requested interpreter is absent, and cached virtualenv paths use the resolved fallback's Python major/minor version. On this Python 3.12 installation, an unavailable requested 3.14 therefore selects `gx_venv_3.12` and creates it using Planemo's 3.12 executable. A found requested interpreter retains its requested-version cache path.

The branch suffix still isolates non-master Galaxy caches. `GALAXY_VIRTUAL_ENV`, an existing checkout `.venv`, `--no_cache_galaxy`, and `--skip_venv` retain their precedence. Installation and startup both use `setup_venv()`, so the corrected selection applies to both consumers. There are no weakened assertions in the patch.

## Validation

All commands used `/Users/jxc755/projects/repositories/planemo/.venv/bin/python`, with `PYTHONPATH=$PWD` in `/tmp/planemo-marius-oct11/pr-13` (Python 3.12.12).

- `python -m pytest -q tests/test_virtualenv.py tests/test_cli_metadata.py`: **15 passed**. The gxformat2 import failures mentioned in Marius's PR body did not occur in this environment.
- Seven additional review probes: **7 passed**. They execute the cache-selection shell command for present/missing interpreters and release-branch suffixes, and verify checkout, external, uncached, and skipped-venv precedence. Probe source: `/tmp/planemo-marius-oct11/test_pr13_cache_probe.py` (temporary review evidence, no source-tree changes).
- Broader `tests/test_galaxy_config.py tests/test_external_galaxy_commands.py`: **32 passed, 1 skipped, 7 environment failures**. Three fail cloning Galaxy because sandbox DNS cannot resolve github.com; four fail binding localhost sockets because sandbox networking is restricted. These failures do not reach the changed virtualenv selection. A complete Galaxy startup/client build was not validated.
- `git diff --check`: passed. Worktree remained clean.

## Followups for John

These do not block merging companion #13; they should remain associated with upstream #1704 until deliberately resolved.

1. **Galaxy release compatibility decision (medium).** If `python3.14` exists on PATH, an older Galaxy checkout/release now receives 3.14. This companion does not infer Galaxy's supported Python range. Decide whether #1704 should infer its default from the selected checkout or explicitly document `--galaxy_python_version` for older releases. Marius's reported incompatibility is plausible, but this review did not run an older Galaxy installation to establish which releases fail.
2. **Config/CLI validation consistency (low).** CLI choices reject `--galaxy_python_version 3`, whereas the config callback supplies defaults after Click's initial conversion and can retain `galaxy_python_version: '3'`. That legacy value still resolves `python3` and gives `gx_venv_3` when found. Decide on consistent rejection or an explicitly supported migration; avoid an isolated fix that overlooks other config-backed choices.
3. **Migration/release note (low).** Document the one-time rebuild and leftover `gx_venv_3` cache when adopting #1704. Also note that the companion does not inspect/repair caches already created under an incorrect version by the old branch; normal fresh caches receive the corrected name.
4. **Future interpreter test guard (low).** `tests/test_cmd_serve.py` builds `PYTHON_VERSION` from the running Python and only guards executable availability. On Python 3.15, a present `python3.15` passes that guard and the CLI rejects the unsupported choice. Add an explicit supported-version skip or update the list when support advances.
5. **Warning accuracy and coverage (low, optional polish).** The warning is built before the shell checks for an existing venv, and says a new venv "will be created" even when an existing checkout/external/cached venv is reused. Marius already acknowledges this in the PR body. Prefer wording about the fallback selected for creation, or emit the creation message only when creation happens. The committed tests cover the resolver/warning but not the modified cache consumer; retaining a small shell-level cache regression case would protect the substantive fix.

## Coordinator outcome

Companion #13 merged into pin-supported-galaxy-python-rebased as c38e6c179149baf424bd005f6fd400e96276c86d. Fifteen focused tests and seven cache/precedence probes passed; older-Galaxy default Python policy remains a decision.
