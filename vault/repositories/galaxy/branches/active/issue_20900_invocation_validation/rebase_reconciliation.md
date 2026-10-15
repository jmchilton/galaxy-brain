# Reconciliation of main invocation validation branch

Main branch: issue_20900_invocation_validation
Original: 9b18c329c8f28d2063113f249438dc47e43254cf
Backup: backup/issue_20900_before_polished_rebase_20261015
Current: 07377e105318f426e30c1299e972baf10dc7c3db
Dev: 88127f42979
Polished integration base: 55a8da519040d02e69c14e8cf1576111a8a2ff89

All nine polished commits applied individually, then all thirteen original commits replayed individually; two reconciliation commits preserve current-dev normalization and current-dev test imports. Four source branch refs unchanged. No push performed.

Integration conflicts retained current dev's ProvidesHistoryContext annotations, helper imports/browser login support and workflow tests. Scheduler uses existing injected WorkflowSchedulingManager. Main preflight refactor replaces polished lookup helper but preserves its 404/encoded ID/step/source behavior and polished access/library input regressions. Polished ds_map-empty/null behavior and explicit-false flag regressions remain. Source unknown-scheduler duplicate test removed because polished parametrized test tests unknown plus omitted/empty/default cases. Source library test retained: it checks destination history content count in addition to polished copied_from/history association assertions.

Current-dev TextToolParameter (including integer/float subclasses) handles multiple value validation and normalization directly, while scalar source strict type checks remain. The redundant source per-element implementation was removed because dev already provides it; additional length-validator doctests retained. Source migration removed two imports needed by current-dev module tests; restored original imports.

Checks:
- compileall touched core API/validation files passed.
- git diff --check passed.
- installed commit hooks passed (Black, Ruff, flake8, prettier, whitespace, conflict/symlink checks).
- pytest test/unit/workflows lib/galaxy/tools/parameters/basic.py --doctest-modules: 201passed,1skipped,8failed. All eight failures were missing workflow_building_modes import caused by replayed source migration.
- after restoring base imports, pytest test/unit/workflows/test_modules.py:89passed. Combined distinct final tests209passed,1skipped.
- logs: /private/tmp/issue20900-rebase-unit.log, /private/tmp/issue20900-rebase-modules-green.log

Parent runs API and schema generator checks, reviews remaining diff, records handoff.
