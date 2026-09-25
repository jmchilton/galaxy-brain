# csv_col_assertions_delimiter — design and verification notes

PR: https://github.com/galaxyproject/galaxy/pull/23593 (draft). Rescues closed
https://github.com/galaxyproject/galaxy/pull/21391 by d-callan.

Worktree is at `~/projects/worktrees/galaxy/pr/21391`, not the `branch/<name>` location this
directory's convention expects — it was created while the work was still a review of 21391.

## Design

21391 inferred the assertion separator from the `ftype` declared in the test (`ftype="csv"` → comma).
This reads `metadata_delimiter` off the dataset instead: `BaseCSV.set_meta` already writes
`dataset.metadata.delimiter = self.dialect.delimiter`, so the value comes from what the datatype
actually found rather than what the test claimed. It also works when the test declares no `ftype`,
and follows subclasses instead of special-casing the string `csv`.

The delimiter is a *parsing* parameter — it tells the assertion how to tokenise the file. Assertions
still test file contents and never compare against metadata.

Profile gate is 26.2, not 21391's 26.0: dev is 26.2.dev0, and `abstract_tool.py:312`,
`parser/util.py:64` and `parameters/convert.py:497` already gate there.

## Commits

- `9a50e4c2d57` — d-callan's eight commits squashed onto fresh `origin/dev`, her authorship
  preserved; every conflict came from dev's PEP 604 (`Optional[str]` → `str | None`) migration.
- `c1dcce81430` — ours: `_assertion_separator()` in `verify/__init__.py`, `_dataset_delimiter()` in
  `interactor.py`, tests, xsd profile changelog entry.

`delimiter` is `optional=True, no_value=[]`, so an unset element returns `[]` rather than a string;
that falls back to tab, as does an absent lookup. An explicitly declared `sep` always wins. The
lookup is lazy — it costs an API call, so it only fires for gated tests that have assertions.

## Scope decision

Workflow (`test_framework_workflows.py`) and Selenium (`selenium/framework.py`) verification paths
are deliberately not plumbed. Neither has a tool profile to gate on — workflows have no profile
concept at all — so plumbing them would change their behaviour unconditionally. Both keep today's tab
default; the `get_delimiter` parameter is the seam if that changes.

## The dead profile gate

The first CI run was red on `column_assertion_delimiter/0.1.0-0` — the csv output read as one
column. The gate never fired: `adapt_tool_source_dict` in `interactor.py` builds the
`ToolTestDescriptionDict` that `ToolTestDescription` is constructed from, and d-callan's commit
added `profile` to `ValidToolTestDict`, `InvalidToolTestDict`, `ToolTestDescriptionDict`, `parse.py`,
`__init__` and `to_dict` — but not to that bridge. So `ToolTestDescription.profile` was always
`None`, `_assertion_separator` returned before consulting the dataset, and `sep=None` fell through
to whitespace splitting. Her original 26.0 gate was equally dead.

Confirmed from the CI log before touching anything: no `GET /api/histories/<id>/contents/<hda>` for
the delimiter appears at all, only the two `display?raw=true` fetches. `4eb5ba819dd` copies
`profile` across in `adapt_tool_source_dict`; `test_profile_reaches_test_dict` in
`test/unit/tool_util/test_test_definition_parsing.py` was red (`[None, None] != ['26.2', '26.2']`)
before it.

Only `assert_has_n_columns` accepts `sep`, and its own default is `"\t"` — the same value
`DEFAULT_ASSERTION_SEPARATOR` supplies — so waking the gate up changes nothing for any other
assertion or for datasets with no delimiter metadata.

## Verification

- 275 verify-related unit tests pass. The six new ones were confirmed red before the implementation.
- Full `test/unit/tool_util` had 38 failures, all environmental in the borrowed 23517 tox env: cwl
  (schema_salad), conda/mulled (network and **disk full — 3.5 GB free**), docker, watcher.
- The two new framework tools all pass: `3 passed` for
  `./run_tests.sh --skip-common-startup -framework -id column_assertion_delimiter`. Running them
  needed a live Galaxy on a full disk, so the worktree's `.venv` is an APFS copy-on-write clone
  (`cp -Rc`) of `branch/metadata_lazy_imports/.venv` with its absolute paths rewritten — near-zero
  extra disk. `column_assertion_delimiter.xml` (profile 26.2) is the red-to-green case;
  `column_assertion_delimiter_legacy.xml` (profile 26.1) pins the old tab behaviour.
- No existing use of `has_n_columns` anywhere in `test/functional/tools` or the workflow framework
  tests, so the in-repo blast radius is zero; the gate exists for the tool ecosystem.
