# jmchilton/planemo #5 / galaxyproject/planemo #1733

Reviewed 2026-10-11. Recommendation: **MERGE #5 into `publish-planemo-cli`**, then preserve the remaining release/product decisions below. This recommendation covers the one-line Makefile change, not automatic merge/release of upstream #1733.

- Fork PR: https://github.com/jmchilton/planemo/pull/5
- Fork head: `40732c6d9532e4a55c31a33a9d36d6c2ba8319ac`
- Fork base / upstream reviewed head: `2401396b00e4f7b5a4ddf6d05ef90985a601f504`
- Upstream PR / branch: https://github.com/galaxyproject/planemo/pull/1733 / `publish-planemo-cli`

## Finding and validation

Marius is right: `setup-venv` runs `uv sync --locked`, and `uv.lock` contains the editable `planemo` project and `requests` but no `pip` package. `scripts/bootstrap_history.py` imports only the standard library, `requests`, and source-tree `planemo`; it prepends the project root before the `planemo` import. `planemo/__init__.py` supplies the needed version and project constants without needing installation metadata or external imports. Removing `pip install . --no-deps` removes an unnecessary command that can fail or select pip outside the environment.

Validation at the fork head passed:

- `git diff --check HEAD^ HEAD`.
- `make -n add-history`, also with `VENV=SKIP` and a custom `VENV`, emits only environment activation and `python3 scripts/bootstrap_history.py --acknowledgements`.
- Read-only Python AST/source probe checked path setup precedes the package import, resolved `planemo.__file__` to this checkout, verified expected project constants, and checked the lock entries above.
- No source/worktree edits or full history target execution; the latter would call GitHub and rewrite HISTORY.rst. No installation or extra tests needed for this one-line removal.
- The supplied upstream snapshot reports all substantive CI jobs successful (PyPI upload skipped, as expected on this PR). The fork snapshot has no checks; rely on the targeted validation above and refreshed merge state before merge.

## Follow-ups for John's ledger

1. **Before first release: PyPI trusted publisher for the chosen new distribution.** Marius's review notes that `planemo-cli` had no PyPI project at review time, and publishing sorted artifacts could publish `planemo` before `planemo-cli` fails. `docs/developing.rst` already tells maintainers to configure a trusted publisher using `deploy.yaml` before the first tag. Verify the publisher is actually provisioned for `galaxyproject/planemo` / `.github/workflows/deploy.yaml` and the final chosen name; this is a release prerequisite, not a code blocker for #5. `skip-existing: true` allows reruns but does not make two uploads atomic. Current PyPI state and account-side publisher configuration were not checked in this review.
2. **Distribution naming decision.** Marius and Nicola prefer keeping `planemo` as the pinned CLI distribution and introducing `planemo-lib` for library consumers, rather than `planemo-cli` alongside today's library name. This affects migration, installation docs, consumers, and the new publisher. Keep the decision explicit before releasing #1733; #5 is independent of either choice. Discussion: https://github.com/galaxyproject/planemo/pull/1733#issuecomment-6062330732 and https://github.com/galaxyproject/planemo/pull/1733#issuecomment-6064091756.
3. **Pinned CLI interpreter guidance.** Marius suggests documenting a known tested interpreter, e.g. `uv tool install --python 3.13 planemo-cli`, since future Python versions may lack wheels for pinned native dependencies and trigger source builds. Current docs say Python >=3.10; current artifact CI tests CLI Python 3.10 and 3.14 on Ubuntu and 3.13 on macOS. Decide whether to add a stable interpreter example and explain that future interpreter compatibility depends on refreshed pins. This is optional documentation guidance, not evidence of an existing failure.

Review context: https://github.com/galaxyproject/planemo/pull/1733 (Marius review submitted 2026-10-10 12:27 UTC).

## Coordinator outcome

Companion #5 merged into publish-planemo-cli as bc6e1a7bbe19dbd06c1d14aa89d518303274b62d. Source import, lock checks and default/SKIP/custom-VENV Makefile dryruns passed.
