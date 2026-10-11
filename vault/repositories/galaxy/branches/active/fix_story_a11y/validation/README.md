# Reproduce the audit validation

The production branch adds no Storybook dependencies. Validation reuses the frozen prototype at `f43e9950dca7c322cfbb66def9961b301e854345` with production sources from `0d7e194649453a63c6f18f54feb8549ce4e6b4c3`, independent of the running migration lanes. Use Node 22.20.0 and pnpm 10.26.1; both commits must be available in the source repository. The source checkout must be clean and at the recorded production SHA.

## Create the separate harness

Set the first two paths to your production worktree and this validation directory. Everything generated below stays in a new temporary checkout. The overlay copies committed production source differences, removes deleted production files, preserves frozen story fixtures/helpers, and turns every audit `todo` declaration into `error`.

```sh
A11Y_SOURCE=/Users/jxc755/projects/worktrees/galaxy/branch/fix_story_a11y
A11Y_VALIDATION=/Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/fix_story_a11y/validation
A11Y_SCRATCH=$(mktemp -d /tmp/galaxy-a11y.XXXXXX)

git clone --shared --no-checkout "$A11Y_SOURCE" "$A11Y_SCRATCH"
git -C "$A11Y_SCRATCH" checkout --detach f43e9950dca7c322cfbb66def9961b301e854345
python3 "$A11Y_VALIDATION/sync-harness.py" --source "$A11Y_SOURCE" --target "$A11Y_SCRATCH"
cp "$A11Y_SOURCE/client/patches/vue-multiselect@3.5.0.patch" "$A11Y_SCRATCH/client/patches/"
git -C "$A11Y_SCRATCH" apply "$A11Y_VALIDATION/story-selector-adaptations.patch"

cd "$A11Y_SCRATCH/client"
npm_config_use_node_version=22.20.0 pnpm install --offline --no-frozen-lockfile
```

Offline installation requires the prototype and production dependency versions in the local pnpm cache. On a new machine, omit `--offline` and allow package downloads. `--no-frozen-lockfile` permits updating the scratch lockfile's dependency-patch hash; it does not modify the production branch. Chromium must be installed for Playwright; if absent, run `npm_config_use_node_version=22.20.0 pnpm exec playwright install chromium` in the scratch client.

`story-selector-adaptations.patch` changes queries to the corrected input combobox, named selection button, scroll region, and tooltip description semantics while preserving the original behavior assertions. Apply it once to a fresh checkout.

## Run the strict audit and keyboard probes

From the scratch client:

```sh
VITE_CONFIG_NATIVE_IGNORE_WARNING=true npm_config_use_node_version=22.20.0 pnpm exec vitest run --project storybook
VITE_CONFIG_NATIVE_IGNORE_WARNING=true npm_config_use_node_version=22.20.0 pnpm exec storybook dev -p 6027 --no-open
```

Leave the server running. In another terminal, set the same scratch and validation paths and run:

```sh
STORYBOOK_CLIENT_DIR="$A11Y_SCRATCH/client" STORYBOOK_PROBE_URL=http://localhost:6027 \
  npm_config_use_node_version=22.20.0 pnpm --dir "$A11Y_SCRATCH/client" exec node "$A11Y_VALIDATION/keyboard-probes.cjs"
```

Change the port in both commands if occupied. The probes count real component event handlers while forwarding each call, then inspect resulting UI state; they do not replace selection/open/removal behavior. The script writes `/tmp/fix_story_a11y-keyboard-results.json` and exits nonzero if a probe fails.

## Recorded results and limits

`strict-story-summary.json` records **236 passing stories and zero failures**, including all 121 previously excepted states. After the final heading ARIA-string correction, its five affected installation stories also passed. `keyboard-results.json` records eight independently reviewed passing browser scenarios. The dev and original scratch compiled multiselect files were byte-identical despite that original scratch lockfile retaining an earlier whitespace-only patch hash.

During polishing, the pinned recipe was smoke-checked in a new detached checkout: production overlays and deletions matched the recorded SHA, story assertions remained frozen except for strict mode and the saved selector patch, that patch applied cleanly, and offline installation succeeded. This setup check is separate from the implementation's full browser audit and keyboard runs.

Full implementation logs stay under `/tmp/fix_story_a11y-*`; permanent unit regressions are in the production branch. These standalone browser probes are reproducible evidence, not a new CI integration or a claim of complete accessibility.
