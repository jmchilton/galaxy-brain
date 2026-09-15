## Overview

This is a fresh rebase and replacement for #1490, originally authored by @bernt-matthias. The original commits and their authorship are preserved.

Planemo currently uses the unqualified `python3` executable when it creates a Galaxy virtualenv by default. As reported in #1489, that can silently select a Python release that Galaxy's dependency pinnings do not yet support.

This replacement carries forward #1490's explicit-version approach, updated for the current compatibility window:

- default Galaxy virtualenv creation to Python 3.14 instead of the ambiguous `python3`;
- expose only explicit `3.8` through `3.14` values for `--galaxy_python_version`;
- retain `PLANEMO_DEFAULT_PYTHON_VERSION` as an environment override; and
- define the default and CLI choices together so they cannot drift independently.

The original PR used Python 3.12 because that was the newest version supported by Galaxy's pinnings in January 2025. Galaxy `master` now tests first startup on Python 3.14, so the replacement advances the pin accordingly: https://github.com/galaxyproject/galaxy/blob/master/.github/workflows/first_startup.yaml

The generated command documentation and the existing explicit-Python Galaxy serve test have also been updated. Focused unit tests cover the supported-version list, environment-aware default, virtualenv command construction, and CLI metadata.

## Testing

- `pytest -q tests/test_virtualenv.py tests/test_cli_metadata.py` (12 passed)
- focused `flake8`, `isort`, `ruff`, and `black --check`
- focused `mypy` for `planemo/options.py` and `planemo/virtualenv.py`
- collected the renamed `serveclientcmd` test target successfully
- verified generated `planemo test --help` exposes `[3.8|3.9|3.10|3.11|3.12|3.13|3.14]`

Fixes #1489. Supersedes #1490.
