# Reproduce the audit validation

The production branch has no Storybook dependencies. Validation reused the frozen prototype at `vitest_story_a11y@f43e9950dca7c322cfbb66def9961b301e854345` in a detached worktree, independent of the running migration lanes. Its own dependencies were installed from cache using Node 22.20.0.

The saved `sync-harness.py` overlays dev production differences and repairs into `/private/tmp/galaxy-a11y-validation`, preserves the source story fixtures/helpers, and changes every `todo` to `error`. Copy the dev vue-multiselect patch into the scratch client and run `pnpm install --offline` there. Apply `story-selector-adaptations.patch` to a fresh strict harness; it changes queries to the corrected input combobox, named selection button, scroll region and tooltip description semantics while preserving all behavior assertions.

From the scratch client, run:

```sh
VITE_CONFIG_NATIVE_IGNORE_WARNING=true npm_config_use_node_version=22.20.0 pnpm exec vitest run --project storybook
VITE_CONFIG_NATIVE_IGNORE_WARNING=true npm_config_use_node_version=22.20.0 pnpm exec storybook dev -p 6027 --no-open
```

With the server running, run the saved `keyboard-probes.cjs` using Node 22. Set `STORYBOOK_CLIENT_DIR` if the scratch client is elsewhere and `STORYBOOK_PROBE_URL` for another port. The probes count real component event handlers while forwarding each call, then inspect actual resulting UI state; they do not replace selection/open/removal behavior. The JSON output records the eight independently reviewed passing scenarios.

`strict-story-summary.json` records 236 passing stories and zero failures. After the final heading ARIA-string correction, its five affected installation stories also passed. The dev and scratch compiled multiselect dependency files were confirmed byte-identical despite the scratch lock hash reflecting an earlier whitespace-only patch revision.

Full logs stay under `/tmp/fix_story_a11y-*`; permanent unit regressions are in the production branch. These standalone browser probes are validation evidence, not a new CI integration.
