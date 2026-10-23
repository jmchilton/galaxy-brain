Using small, atomic, obviously correct and very concise PRs, our goal is to recover the core functionality and tests from: https://github.com/galaxyproject/galaxy/pull/21199 but dropping the Jupyter notebook stuff - agents have come very far.

Two long-running tasks (2026-10-09):
- Break `galaxy_ui_driver` down and land its Galaxy fixes in dev, preferring PRs that grow E2E coverage of the fixed or new abstractions - see GALAXY_UI_DRIVER_UPSTREAM.md.
- Get the gxui CLI and its skill polished and done - see GXUI_POLISH.md.
