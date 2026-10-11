# Fork CI during polishing

Checked 2026-10-10 for `0d7e194649453a63c6f18f54feb8549ce4e6b4c3`. Fork head matches the clean worktree. Live upstream `dev` remains `b406ead2e4eb55b94d1ba437af8f60ebe4983947`, the branch base; no rebase is needed. No PR exists.

Client linting ([run](https://github.com/jmchilton/galaxy/actions/runs/38099560903)), Client Unit Testing ([run](https://github.com/jmchilton/galaxy/actions/runs/38099560947)), and Tool form harness tests ([run](https://github.com/jmchilton/galaxy/actions/runs/38099561157)) are queued. Other suites are queued/running. Six completed suites pass; CWL conformance and package tests for Pulsar are skipped. This is pending CI, not a greenish result.

## Unrelated release-script failure

[Test Galaxy release script](https://github.com/jmchilton/galaxy/actions/runs/38099560940) fails after the synthetic release succeeds, when checking untouched `master`: `VERSION_MAJOR = "19.05"`, `VERSION_MINOR = None`. `test/release.sh:173` expects a quoted minor string. The branch changes only client files, leaving the release script and master/version files untouched. This is unrelated to the accessibility changes. Polishing posts nothing to GitHub, so this run was not rerun.
