# PR 427 — Add typing for managers

PR: https://github.com/galaxyproject/pulsar/pull/427

Reviewed rebased head: `30b9a8c`

## Recommendation

The PR head has been updated and is ready to merge once CI completes. I found
no remaining blocker in the rebased branch.

This is a large first typing pass over `pulsar/managers/`. It adds manager,
staging, status, lock, and job-directory annotations; introduces reusable status
and DRMAA state aliases; and makes several internal manager bases explicitly
abstract. The diff also contains substantial formatting churn, but an
ignore-whitespace review did not reveal an unintended behavior change in the
final branch.

## Rebase corrections

The rebase needed semantic work rather than mechanical conflict selection. The
final branch addresses the issues found during review:

- `ExternalBaseManager._get_status_external` was initially made abstract, which
  made `CondorQueueManager` uninstantiable because Condor owns its complete
  `get_status` implementation. The shared hook now raises `NotImplementedError`
  without imposing that incompatible abstract contract, and a regression test
  asserts that the Condor manager remains concrete.
- The original annotations repeatedly used the singular, legacy
  `DependencyDescription`. The values reconstructed and passed through the
  manager API are actually
  `galaxy.tool_util.deps.dependencies.DependenciesDescription`; all affected
  annotations now share that canonical aggregate type.
- `return_code()` now includes `str` in its return contract. The normal file
  value is bytes and successful codes become integers, but the existing
  `PULSAR_UNKNOWN_RETURN_CODE` sentinel is a string.
- Postprocessing now types `was_cancelled` as the callback it really is, rather
  than as a boolean. `StatefulManagerProxy` passes a `partial`, and the output
  collector invokes it.
- The compatibility imports for `DependenciesDescription` and
  `new_clean_env` were preserved. They remain meaningful to
  `PULSAR_GALAXY_LIB` installations, where `setup.py` removes standalone
  `galaxy-*` requirements and Pulsar may run against an older Galaxy.
- Current `master` state-machine and retry-policy changes were retained through
  the conflict resolutions.
- The two old commits that disabled and then immediately restored the wheel
  test were dropped. The substantive commit still has Matthias Bernt as its
  author; John is only the rebasing committer.

## Reuse and structure

The new runtime imports are at module scope. Imports used only for annotations
are correctly guarded by module-level `TYPE_CHECKING` blocks, avoiding runtime
cycles and optional-dependency failures. No new function-local imports were
introduced.

The status vocabulary is centralized in `pulsar.managers.status.StateLiteral`,
and manager methods consistently reuse it. The dependency description fix also
avoids inventing a parallel type for an existing Galaxy abstraction.

The ABC changes are a real runtime tightening, not merely annotation metadata.
All first-party concrete implementations satisfy the final contracts, including
the special Condor status path. Earlier failure is now covered directly.

## Tests and verification

No tests were removed or weakened. The updated branch adds manager discovery
smoke coverage and the direct Condor concreteness regression.

- Full unit suite: **311 passed, 63 skipped**
- MyPy: **success, 190 source files checked**
- Flake8: pass
- isort: pass
- `git diff --check`: pass
- Rebase relationship: **0 behind, 2 commits ahead of `origin/master`**

## Non-blocking observations

- The original discovery tests asserted exact module/manager counts. The
  follow-up update now checks stable expected-name subsets and the Condor class
  identity instead, so adding a legitimate backend will not break them.
- This is an incremental typing pass, not a strict typing boundary.
  `ManagerInterface` still carries the old Python-2-style `__metaclass__ =
  ABCMeta`, and several launch/configuration shapes remain broad `Dict`/`Any`
  contracts. Tightening those with protocols or typed mappings can happen
  separately; it is not a regression or a reason to hold this PR.
- Formatting accounts for a meaningful portion of the 42-file diff and made
  the rebase unusually conflict-heavy. Separating formatter-only changes would
  make future typing work easier to review, but the final resolved diff is
  semantically sound.
