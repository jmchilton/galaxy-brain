# issue_23897_xml_collection_output — implementation debrief

Implements [Galaxy #23897](https://github.com/galaxyproject/galaxy/issues/23897).
Commit `79355838ae1` is pushed to `jmchilton/issue_23897_xml_collection_output`.
Targets `dev`, based on `origin/dev` at `253a4cb0b9c`. The related #23890 already merged into `release_26.1`, and its changes are present in this base, so this is an independent fix rather than an addition to that PR.
Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/issue_23897_xml_collection_output`.

## Implementation

The shared XML collection parser accepts the names of its collection-type and type-source attributes. Ordinary `<collection>` keeps reading `type`/`type_source`; generic `<output type="collection">` reads `collection_type`/`collection_type_source` directly. The source element is never rewritten. Removed the unused `unicodify` import. Existing mutually exclusive attribute and dynamic-structure validation still applies.

Added parsing parity tests for explicit type, type source, and structured_like, with discovery and static dataset children, plus repeated parsing and source-XML preservation. Static-child cases assert element membership, inherited format, and from_work_dir. Both spellings reject simultaneous type and type source, and structured_like plus discovery.

Added `collection_output_type_source.xml` to the framework toolbox. It exercises generic collection outputs with discovery and inherited format for both list and paired input collections and verifies each output element's contents.

## Validation

- Red first: the new parser tests produced nine failures with the reported lxml NoneType error, with the two mutually exclusive attribute checks passing.
- `PYTHONPATH=lib .venv/bin/python -m pytest test/unit/tool_util/test_parsing.py -q --tb=short`: **104 passed**, including all 11 new cases; rerun after review assertions and formatting.
- `./run_tests.sh -framework -id collection_output_type_source --skip-common-startup`, with the galaxy-backend-tests skill's default environment overrides: **2 passed** (list and paired). Report: `run_framework_tests.html` in the worktree. Uses the main Galaxy repository's existing virtualenv through a worktree `.venv` symlink; no shared dependencies changed.
- The framework fixture validates against `lib/galaxy/tool_util/xsd/galaxy.xsd` using lxml XMLSchema.
- Black and isort checks, `git diff --check`, and commit hooks passed (including Ruff and flake8).
- Fork CI remains for the branch manager to assess. No PR opened.

## Review

Independent subagent review used `vault/agents/_shared/REVIEW_FOCUS.md` and found no blocking implementation issues. Its suggested static-child assertions were implemented and the parser suite passed again. No requested fixes remain unaddressed.

Review also observed an existing limitation: the XSD's generic Output child group permits discovery but does not permit static `<data>` children, although the parser supports them. No schema expansion was made for this parser bug fix; static-child unit cases verify parser parity, while the framework fixture uses schema-supported discovery.
