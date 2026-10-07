# Planemo #1735 — Recognize YAML GalaxyTool definitions as runnable tools

[PR](https://github.com/galaxyproject/planemo/pull/1735), [branch](https://github.com/jmchilton/planemo/tree/recognize-yaml-galaxy-tools), head `a8258d6e`, based on master `515e928e` at creation. Created and reviewed 2026-10-06.

Extracts only `planemo/runnable.py`'s two-line `GalaxyTool` recognition and the existing 15-line `tests/test_runnable.py` regression from #1701. Reuses the YAML class detection helper already used for Galaxy workflows. Adds no runtime dependency or engine selection. XML and CWL precedence are preserved.

No review findings. The focused runnable regression passed; Flake8, Black, Isort, and `git diff --check` passed for the two changed files.

CI verified 2026-10-07 at the same head: 14 successful checks and the expected skipped release upload. GitHub reports mergeable and the PR is now out of draft; awaiting merge.

Merge this prerequisite before #1701. The installed-runtime branch already contains the prerequisite as an ancestor via a normal merge, so the [runtime-only comparison](https://github.com/jmchilton/planemo/compare/recognize-yaml-galaxy-tools...package-installed-galaxy-gravity) excludes both files. No history was rewritten. If the prerequisite is squash-merged, merge updated master into #1701 afterward so the displayed three-dot diff also uses the new upstream ancestor.
