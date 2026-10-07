# Planemo PR #1736 — Remove python_template_version from template

- PR: https://github.com/galaxyproject/planemo/pull/1736
- Reviewed: 2026-10-07
- Head: `05fea90146a89dbb0b5c18412be7996408287222` (verified against GitHub and the review worktree)
- Base: `15004ce79f5de578a12e12a6e36e7b435e4cadbf`
- Worktree: `/Users/jxc755/projects/worktrees/planemo/pr/1736`

## Conclusion

No actionable findings. The one-line change in `planemo/tool_builder.py:30` removes the redundant Python template attribute and updates the generated Galaxy tool profile from `21.05` to `25.0`.

Reviewed the shared Galaxy template, ordinary and macro generation paths, CLI option handling, and existing build/lint integration tests. Galaxy already defaults tools with profiles at least `19.05` to Python 3 templates, so dropping the explicit `python_template_version="3.5"` preserves the template interpreter behavior. Ordinary and macro-based tool generation both use the same root template; CWL generation uses its own unchanged template.

The profile bump makes newly generated wrappers require Galaxy 25.0 or newer: Galaxy rejects tools whose declared profile is newer than the server. This is the effect of adopting the new default profile, and should be understood when using `tool_init` for an older deployment. It does not alter existing wrappers.

## Validation

- `PYTHONDONTWRITEBYTECODE=1 /Users/jxc755/projects/repositories/planemo/.venv/bin/python -m pytest -q -p no:cacheprovider tests/test_build_and_lint.py -k 'not cwl'`: **5 passed**, 3 deselected; dependency deprecation warnings only.
- Additional CLI generation smoke check with and without `--macros`: parsed the resulting XML and confirmed `profile="25.0"` and absence of `python_template_version` in both variants.
- GitHub checks at the reviewed head: all executed checks successful, release upload skipped.

No live Galaxy server execution was needed for this template-only change. The local checks exercise generated XML and linting; the profile compatibility statement also follows the Galaxy tool loader's explicit version guard.
