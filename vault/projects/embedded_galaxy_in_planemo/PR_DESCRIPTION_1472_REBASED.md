## Modernize Planemo-specific tool linters

This rebases and continues #1472, preserving Matthias Bernt's original commits and authorship.

Planemo's optional DOI, URL, Conda requirement, and BioContainer checks predate Galaxy's class-based linter interface. This updates those checks to use standard `Linter` classes, which gives their messages stable linter names, source XML nodes, and normal class/module skip behavior.

### Differences from the original draft

- Result-specific linter classes share a weak per-tool analysis cache. A DOI, URL, Conda requirement, or BioContainer requirement set is therefore queried exactly once even though multiple result classes consume the answer.
- The implementation uses the current Galaxy `ToolSource` API and preserves the existing warnings for tools with no package requirements.
- The missing-Conda-recipe condition is corrected and unexpected DOI responses no longer overlap with invalid (`404`) responses.
- DOI requests now have a timeout and report request failures as lint warnings rather than crashing the command.
- Tool URL linters reuse Planemo's existing hardened URL validation, including the timeout, Crossref DOI handling, rate-limit handling, and Cloudflare handling. Tool dependency URL linting continues to use the same implementation.
- Repository linters remain on `LintContext.lint` with `RealizedRepository` targets. Galaxy's `Linter` abstraction is intentionally tool-source-specific, so forcing repository checks through it would make the abstraction less accurate. Their names are instead registered as valid skip targets.
- Shared command options remove duplicated Click declarations and expose the optional tool checks consistently from `lint` and `shed_lint` (the latter applies tool checks when `--tools` is used).

### Testing

- Added isolated tests for DOI, URL, Conda, and BioContainer messages, skip behavior, missing requirements, and one-lookup-per-target behavior.
- Added coverage that tool dependency URL linting uses the shared hardened validator and that repository linter names are valid skip targets.
- `20 passed, 5 skipped` across the new tests and `tests/test_lint.py` with slow/live-network tests disabled.
- flake8, Ruff, Black, isort, and mypy pass for all touched Python files.

The existing `tests/test_shed_lint.py` live Tool Shed failure reproduces unchanged on `upstream/master` in this environment and is unrelated to this branch.
