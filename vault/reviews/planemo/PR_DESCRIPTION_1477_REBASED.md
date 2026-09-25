# Description

Allow Planemo commands to access public resources on external Galaxy instances without requiring an API key.

This supersedes and rebases #1477 on current `master`, preserving @mvdbeek's original implementation and adding the tests and compatibility updates needed to make the intended authentication boundary explicit.

Planemo's `gi()` helper previously replaced a missing key with its managed-Galaxy test admin key. That is useful for Galaxy instances started by Planemo, but remote Galaxy servers reject the fabricated key even when the requested resource is publicly accessible. Anonymous BioBlend requests work when the key remains unset.

This change:

- leaves the API key unset when callers do not provide one;
- stops external Galaxy configuration from inventing the managed-instance admin key;
- preserves explicitly supplied admin and user keys;
- keeps the existing default admin key for Galaxy instances managed by Planemo; and
- updates local serve tests to request their known admin key explicitly.

The new unit tests cover anonymous clients, explicit API keys, anonymous external configuration, explicit external credentials, and the unchanged managed-Galaxy default.

Closes #1476.

# Validation

- 41 relevant unit/configuration tests passed; 12 managed-Galaxy integration tests skipped as configured.
- The public invocation from #1476 was retrieved anonymously from `usegalaxy.org`, with the BioBlend client key confirmed as `None`.
- The pre-rebase red CI job was unrelated: three training tests failed when Zenodo returned HTTP 504 responses; all other checks passed.
- Targeted Flake8, Black, isort, Ruff, and mypy checks passed after rebasing.
