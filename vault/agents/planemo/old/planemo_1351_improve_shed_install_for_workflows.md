# planemo #1351 — Improve shed install for workflows

`galaxyproject/planemo#1351`, mvdbeek, draft since Feb 2023. Rebased onto current master
(`716a87a8`) as `shed-install-rebased`, head `6377348e`, +79/-8 across 2 files
(`planemo/galaxy/workflows.py`, `tests/test_galaxy_workflow_utils.py`).

Checks on the rebased branch: `flake8`, `black`, `isort` clean. `mypy planemo/galaxy/workflows.py`
reports 6 errors, all pre-existing in `api.py` / `tools.py` / `runnable.py` / `cli.py`, none in
`workflows.py`. `PLANEMO_SKIP_GALAXY_TESTS=1 pytest tests/test_galaxy_workflow_utils.py -q` →
8 passed.

## What it does

Three things, all inside `_install_shed_repos_from_tools_info`:

1. Introduces `InstalledShedRepos(NamedTuple)` with `installed_repositories` /
   `updated_repositories`, replacing the `Tuple[Optional[List[Any]], Optional[List[Any]]]`
   return annotation on `_install_shed_repos_from_tools_info`, `install_shed_repos` and
   `install_shed_repos_for_workflow_id`.
2. Returns `[]` instead of `None` for both the no-tools early exit and the
   no-`install_most_recent_revision` case.
3. Appends `yaml.safe_dump(install_results.errored_repositories)` to
   `FAILED_REPOSITORIES_MESSAGE` so the warning/exception names the repositories that failed.

Plus four new tests.

## Supersession

The original PR had two commits. `f860b8b6` "Install repos for all tested artifacts" hoisted
`with self.ensure_runnables_served(runnables)` out of the per-runnable loop in
`GalaxyEngine._run`. **Master already does this** — it landed independently, and master's version
goes further (hoists the verbose log, adds `output_collectors` and `test_timeout`). That commit is
fully superseded and was correctly dropped from the rebase.

What survived is `fd410512` "Print list of errored repo installs". Since 2023 master refactored the
install path into `_install_shed_repos_from_tools_info`, shared by both `install_shed_repos` and
`install_shed_repos_for_workflow_id`, so the surviving change lands in one place and now benefits
the TRS path too — strictly better placement than the original.

The `typing_extensions.NamedTuple` import in the original was changed to `typing.NamedTuple`,
matching planemo's existing idiom (`Runnable`, `Rerunnable`, `ShedContext`, `RealizedFiles`,
`TestId`). Right call.

## Blocking

None. I went looking and there is nothing broken here:

- **`None` → `[]` cannot break a truthiness test.** Both call sites tuple-unpack positionally
  (`planemo/galaxy/config.py:996`, `:1011`) into `self.installed_repos[...]` /
  `self.updated_repos[...]`. A repo-wide grep for `installed_repos` / `updated_repos` outside
  `.venv` returns only the two writes, the `{}` initialisers at `planemo/galaxy/config.py:912-913`,
  and the new tests. Nothing reads them, so nothing can be sensitive to `None` vs `[]`.
  `install_shed_repos` / `install_shed_repos_for_workflow_id` have no other callers.
- **No format-string hazard.** `warn(message, *args)` (`planemo/io.py:125-129`) only applies
  `message % args` when `args` is non-empty; the call site passes the message alone. A `%` in a
  repository name is inert. Confirmed by reading, not assumed.
- **`yaml.safe_dump` cannot blow up on real content.** Two kinds of dict reach
  `errored_repositories`. Post-completion failures append the output of
  `complete_repo_information` (`ephemeris/shed_tools_methods.py:23-51`), which constructs a fresh
  dict of `str` / `bool` / `None` only. Pre-completion failures (`ephemeris/shed_tools.py:211`)
  append the raw input dict, which in planemo's case comes either from `load_shed_repos` (parsed
  out of workflow-step JSON) or from ephemeris's generated tool-list YAML — both plain scalars and
  lists of strings. No representer error is reachable.

## Reuse / abstraction

**1. The one field that motivates a two-field tuple is neither read nor exercised —
`planemo/galaxy/workflows.py:58-62`**

Three facts that only bite together:

- Both production call sites destructure **positionally**
  (`self.installed_repos[runnable.uri], self.updated_repos[runnable.uri] = workflow_repos`,
  `planemo/galaxy/config.py:996` and `:1011`). The named fields are never accessed by name anywhere
  outside the new tests.
- The dicts written to are write-only dead state — nothing in planemo reads
  `installed_repos` / `updated_repos`.
- `updated_repositories` is non-empty only when `install_most_recent_revision=True`, and the test
  double (`tests/test_galaxy_workflow_utils.py:61-69`) has no `update_repositories` method, so that
  branch is never exercised.

So the field that justifies a *named* pair over a bare pair is neither read in production nor
covered by a test. The NamedTuple is not wrong — it is a real improvement over
`Tuple[Optional[List[Any]], Optional[List[Any]]]`, and typing the elements as
`List["InstallRepoDict"]` genuinely reuses ephemeris's vocabulary rather than reinventing it — but
on its own it is typing polish over a value nobody consumes. The honest maintainer move is either
to delete `installed_repos` / `updated_repos` from `BaseGalaxyConfig` (`planemo/galaxy/config.py:895`) in this PR and have
the functions return nothing, or to land the NamedTuple as scaffolding with a stated consumer in
mind. Landing it as-is is defensible but should be understood as preparation, not a fix.

**2. `skipped_repositories` is discarded without comment —
`planemo/galaxy/workflows.py:408-432`**

`ephemeris.shed_tools.InstallResults` (`shed_tools.py:117-120`) is already a `NamedTuple` with
`installed_repositories` / `skipped_repositories` / `errored_repositories`. I am *not* recommending
re-exporting it: the shapes genuinely differ, because `updated_repositories` maps to
`update_results.installed_repositories`, which is not an `InstallResults` field at all. But
`skipped_repositories` is free to carry, is meaningful (repos already installed at the requested
revision), and ephemeris's own CLI consumes it — `shed_tools.py:725` extends the to-be-tested set
with it. Dropping it silently is the kind of information loss that is annoying to reverse later.
Either add a third field or say in the docstring why skips are uninteresting to planemo.

**3. File is now internally inconsistent on named tuples — `planemo/galaxy/workflows.py:568`**

`WorkflowOutput = namedtuple("WorkflowOutput", ["order_index", "output_name", "label", "optional"])`
is the untyped `collections.namedtuple` form, and the `from collections import namedtuple` at
line 6 now sits alongside `typing.NamedTuple` at line 13. Converting `WorkflowOutput` to a
`typing.NamedTuple` and dropping the `collections` import would be a clean follow-up — explicitly
out of scope for a two-commit PR, but worth a note so the inconsistency doesn't calcify.

## Worth landing?

The user-visible win is the error message, and it is narrower than it first looks.

`log_repository_install_error` (`ephemeris/shed_tools.py:592-604`) already emits, per failed
repository, a `log.error` carrying name, owner, changeset_revision **and the underlying cause**.
Planemo's root logger sits at `WARNING` when not `--verbose`
(`planemo/context.py:214-219`), so `ERROR` records do reach the user. `update_repositories`
delegates straight back to `install_repositories` (`ephemeris/shed_tools.py:280`), so the
autoupdate path logs identically — there is no branch where the yaml dump is the sole surfacing of
a failure.

What the yaml dump adds is a single consolidated list attached to the exception (or warning),
adjacent to the message that says installation failed, rather than scattered upstream in the log
stream. That is a genuine ergonomic improvement, especially under `--ignore_dependency_problems`
where the warning is easy to lose.

What it *omits* is the one thing the reader actually wants: the failure reason. And it adds noise —
`install_repository_dependencies`, `install_resolver_dependencies`, `install_tool_dependencies`
booleans and a `tool_panel_section_id: null` line for every errored repo.

**This is the change that would make the PR clearly worth landing:** trim the dump to
`name` / `owner` / `changeset_revision` (mirroring ephemeris's own compact
`[(t["name"], t.get("changeset_revision", "")) for t in errored_repositories]` summary at
`shed_tools.py:257-258`), or better, thread the error message through so the consolidated list
carries the cause. As written, the message restates in verbose YAML what the logs already said in
one line each, minus the part that explains why.

## Tests

**4. The monkeypatch target is correct — `tests/test_galaxy_workflow_utils.py:61-69`**

I checked this specifically. `planemo/galaxy/workflows.py` does `from ephemeris import shed_tools`
(`workflows.py:31-34`) and then `shed_tools.InstallRepositoryManager(admin_gi)` at `workflows.py:407` — an attribute
lookup on the module object at call time. The test imports the same module object, so
`monkeypatch.setattr(shed_tools, "InstallRepositoryManager", FakeManager)` is seen by the code
under test. `monkeypatch` undoes the attribute at teardown, so there is **no leak between tests**;
`test_install_shed_repos_without_tools_returns_empty_lists` deliberately takes no `monkeypatch`
fixture and still passes, which is consistent with that. Patching
`planemo.galaxy.workflows.shed_tools` instead would be marginally more hermetic (it would not
perturb the shared `ephemeris` module for any concurrently-importing code during the test), but
functionally these are the same object and the current form is fine.

**5. Testing the private helper is the right seam, but the public entry points are now untested —
`tests/test_galaxy_workflow_utils.py:75-107`**

`_install_shed_repos_from_tools_info` is the shared implementation; both public functions are thin
adapters over it, so exercising it is the high-value target and avoids constructing a `Runnable` or
stubbing `export_workflow_dict`. Reasonable. But the tests assert on a leading-underscore function,
which means the public contract — that `install_shed_repos(runnable, ...)` returns an
`InstalledShedRepos` — is asserted nowhere. One cheap test calling `install_shed_repos` with a
runnable that has no shed repos would pin the public signature at negligible cost.

**6. Coverage gaps**

- `install_most_recent_revision=True` is never tested. `FakeManager` has no `update_repositories`,
  so both the `updated_repos = update_results.installed_repositories` assignment and the
  `install_results.errored_repositories.extend(update_results.errored_repositories)` merge are
  uncovered. That merge is the only path by which `errored_repositories` can contain an *update*
  failure, and it is the only path that makes `updated_repositories` non-empty — i.e. the entire
  justification for the second tuple field.
- `FakeManager.install_repositories` ignores its arguments entirely, so nothing asserts that
  `tools_info` and the four `default_install_*` flags are forwarded correctly. Recording the kwargs
  and asserting on them would turn a smoke test into a contract test for free.
- `_install_shed_repos_from_tools_info([], None, False)` passes `None` where the signature says
  `"GalaxyInstance"`. Harmless (early return) and tests aren't type-checked, but a
  `cast`/`# type: ignore`-free alternative would be to pass a sentinel object.

**7. `capsys.readouterr().err` is correct but incidental —
`tests/test_galaxy_workflow_utils.py:108`**

`warn` goes through `click.echo(..., err=True)` (`planemo/io.py:129`), so stderr is right and the
trailing comment says so. Fine as is.

## Import hygiene

Clean. `NamedTuple` added to the existing `typing` import block; `InstallRepoDict` added under the
existing `TYPE_CHECKING` guard with quoted forward references in the field annotations; `pytest`
and `from ephemeris import shed_tools` at the top of the test module. No function-local imports
introduced. `Tuple` and `Any` remain used elsewhere in the file
(`workflows.py:754`, `:395`, `:547`, …), so removing the old return annotation creates no F401 —
confirmed by flake8.

One runtime subtlety, not a defect: because the `List["InstallRepoDict"]` annotations reference a
`TYPE_CHECKING`-only name, `typing.get_type_hints(InstalledShedRepos)` would raise `NameError`.
Nothing in planemo does that to this class, and the `NamedTuple` machinery itself does not evaluate
the forward reference, so this is only worth knowing if the type ever gets fed to something
introspective (pydantic, a click parameter type).

## HISTORY.rst

**Not needed.** I checked the convention rather than assuming it: `git log -- HISTORY.rst` shows
the file is touched almost exclusively by release machinery — `Starting work on 0.75.NN`,
`Version 0.75.NN`, `Update history for 0.75.NN`. `make add-history`
(`Makefile:176-178`) regenerates entries from GitHub's API via
`build_scripts/bootstrap_history.py --acknowledgements`, which is where the
`(thanks to @mvdbeek)_ . Pull Request 1234_` lines come from. Exactly two feature commits have
hand-added an entry (`213fd873`, `95601fe8`), both jmchilton's own and both for behaviour changes
to user-facing flags.

A one-line improvement to an error message does not clear that bar, and the release script will
pick up the PR title regardless. If the yaml dump is reshaped into something users would notice, a
line under `0.75.48.dev0` would be reasonable but still optional.

## Recommendation

**Land with changes.** Nothing is broken, the rebase correctly dropped a superseded commit, and the
surviving change is now better placed than in the original PR (shared helper, so the TRS path
benefits too).

Before merging:

1. **Fix the error message content** (the actual point of the PR). Carry the failure reason, or
   trim the dump to `name` / `owner` / `changeset_revision`. As written it is verbose and omits the
   cause that `log_repository_install_error` already prints.
2. **Cover the `install_most_recent_revision=True` branch.** It is the only thing that makes
   `updated_repositories` non-empty and it is untested.
3. **Decide on `skipped_repositories`** — carry it or document why not.

Optional / follow-up:

- Assert the forwarded kwargs in `FakeManager` rather than ignoring them.
- One test against the public `install_shed_repos` entry point.
- Separate commit: convert `WorkflowOutput` (`workflows.py:568`) to `typing.NamedTuple` and drop
  `from collections import namedtuple`.
- Separate PR: delete `installed_repos` / `updated_repos` from
  `planemo/galaxy/config.py:912-913, 996, 1011`. They are write-only. Removing them is the change
  that would make the return-value typing question moot.

Be honest in the PR description about what this is: the NamedTuple is typing hygiene over a
currently-unread value, and the error message is the only user-visible win. That framing is fine —
just don't let the diff imply more.

---

## Status after review (2026-09-19)

Fixed on `shed-install-rebased` in `9198cf98`:

- **Message content.** Verified the review's central claim directly: both paths that append to
  `errored_repositories` (`ephemeris/shed_tools.py:211` and the two `return "error"` sites at
  `:526`/`:535`) call `log_repository_install_error`, which logs name, owner, changeset_revision
  *and* the cause. `install_repositories` defaults `log=log` to the module logger, so planemo gets
  that logging without passing anything. The yaml dump was therefore verbose repetition minus the
  cause. Replaced with `owner/name@changeset_revision`, sorted and comma-joined — the identifiers
  the propagating exception was actually missing. `yaml` stays imported; it is still used by
  `install_shed_repos_for_workflow_id`.
- **`install_most_recent_revision` coverage.** The test double had no `update_repositories`, so the
  branch that is the *only* way `updated_repositories` becomes non-empty was never exercised. Added
  two tests: one asserting the updated list is returned and that install runs before update, one
  asserting update-pass failures are not swallowed.
- Added a case for a repo dict with no `changeset_revision`, since `_repo_label` has to tolerate it.

Not done, deliberately:

- **`skipped_repositories` still discarded.** Adding it to `InstalledShedRepos` widens the PR past
  what #1351 proposed, and nothing in planemo would read it — same objection as the existing fields.
- **`WorkflowOutput` is still `collections.namedtuple`** (`workflows.py:568`). Converting it is
  unrelated churn in the same file.
- **The write-only `installed_repos`/`updated_repos` state** in `galaxy/config.py` is untouched;
  deleting it is the follow-up that would moot the typing question.

`tests/test_galaxy_workflow_utils.py`: 11 passed. flake8/black/isort clean; mypy reports nothing in
`workflows.py`.
