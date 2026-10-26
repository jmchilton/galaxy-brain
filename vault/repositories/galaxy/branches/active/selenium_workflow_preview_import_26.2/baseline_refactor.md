Moved existing TRS version-ID run-form coverage into the first baseline commit; the final tracked tree is unchanged.

The compatibility case uses `trs_version_id`, which already works on the release base. Its initial placement after the fixes violated the baseline-first rule. The rewritten first commit contains a standalone test using existing navigation/API methods: open the launch URL, wait for `/workflows/run`, match the route ID to the imported workflow, and assert its stored version provenance. It does not depend on the implementation's new helper argument or client fixes. The implementation commit then consolidates that test onto the shared launch helper.

Final local history:

- `8512991d4d35` — Baseline tests for public workflows and TRS version launch.
- `42d7af7114b9` — Restore TRS launch imports and reuse workflow preview navigation.
- `0501935d4c4e` — Harden TRS redirect assertions and wizard import waits.

The original head `ed03730b7ff` and its ancestors are preserved by `refs/backup/selenium_workflow_preview_import_26.2-before-baseline-refactor-ed03730b7ff`. These commits were unpublished; no force-push was performed.

Validation: primary proved the compatibility test passes with both Vue fixes reversed (one pass in 11.39 seconds, `/tmp/workflow-faq-compat-baseline.log`). The public-workflow baseline file previously passed both tests under both browser backends. The relocated standalone body uses the same successful route/ID/provenance assertions and existing APIs; its syntax, pinned Black configuration, and isort checks pass. No browser run was started during this history-only step.

`git diff ed03730b7ff HEAD --exit-code` is empty, the worktree remains clean, and both heads have tree `769b79c22662ae2eec5aff2fb0754a0d11f24b82`. Running browser tests were not touched. No further pre-feature refactor was justified: the small tab-aware helper and inline query alias belong with the implementation rather than an unrelated base cleanup.
