Fixes #1536.

Pass `--test_data` to `GalaxyInteractorApi` so Galaxy tool XML tests can find input files and expected output fixtures in an explicitly supplied directory.

The interactor already asks Galaxy for each file and falls back to its local `test_data_directories` when the server cannot supply it. Planemo previously omitted this directory from the interactor arguments. This change supplies it as an additional client-side fallback, preserving server-first resolution and Galaxy's default test-data configuration. Runs without `--test_data` retain the existing behavior.

Adds `test_test_data_option`, a managed-Galaxy integration test that uploads an input, runs a copy tool, and compares its output with the expected fixture. The fixture has a unique filename and lives outside a `test-data/` directory, so existing discovery and stock Galaxy fixtures cannot make the test pass accidentally.
