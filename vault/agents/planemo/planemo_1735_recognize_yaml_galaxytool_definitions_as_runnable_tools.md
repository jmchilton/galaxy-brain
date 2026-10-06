# Planemo #1735 — Recognize YAML GalaxyTool definitions as runnable tools

[Draft PR](https://github.com/galaxyproject/planemo/pull/1735), [branch](https://github.com/jmchilton/planemo/tree/recognize-yaml-galaxy-tools), head `a8258d6e`, based on current master `515e928e`. Created and reviewed 2026-10-06.

Extracts only `planemo/runnable.py`'s two-line `GalaxyTool` recognition and the existing 15-line `tests/test_runnable.py` regression from #1701. Reuses the YAML class detection helper already used for Galaxy workflows. Adds no runtime dependency or engine selection. XML and CWL precedence are preserved.

No review findings. The focused runnable regression passed; Flake8, Black, Isort, and `git diff --check` passed for the two changed files. Remote CI is pending after creation.

Merge this prerequisite before #1701. The installed-runtime branch already contains the prerequisite as an ancestor via a normal merge, so the [runtime-only comparison](https://github.com/jmchilton/planemo/compare/recognize-yaml-galaxy-tools...package-installed-galaxy-gravity) excludes both files. No history was rewritten. If the prerequisite is squash-merged, merge updated master into #1701 afterward so the displayed three-dot diff also uses the new upstream ancestor.
