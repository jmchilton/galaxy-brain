## Overview

Remove Planemo's duplicate `wait_on` implementation and use `galaxy.util.wait.wait_on` directly.

Closes #1680.

## Changes

- Raise the `galaxy-util` floor from 24.1 to 26.0, the first release series that provides `galaxy.util.wait`.
- Import `wait_on` from `galaxy.util.wait` at Planemo's sole remaining caller.
- Delete `planemo.io.wait_on` and its duplicated polling implementation.

The Galaxy implementation preserves the existing call's behavior while providing a typed `TimeoutAssertionError`, an injectable sleep function, configurable polling delta, and type annotations.

No compatibility fallback is included: the dependency floor guarantees the import is available, keeping this a direct deduplication rather than maintaining two implementations.

## Validation

- Resolved the complete Planemo requirements with `galaxy-util 26.1.1` and the existing `<26.2` Galaxy package bounds.
- `uv pip check`: all 105 installed packages compatible.
- `tests/test_io.py`: 11 passed.
- Non-environment-dependent `tests/test_galaxy_config.py` cases: 32 passed.
- isort 9.0.1, Black 26.5.1, Ruff 0.16.7, flake8, and `git diff --check` pass.
