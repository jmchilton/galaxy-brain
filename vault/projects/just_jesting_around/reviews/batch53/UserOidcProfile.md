# Batch 53 — UserOidcProfile

Originator: `client/src/components/User/UserOidcProfile.test.ts`.
Base: `f3ffc6aaa4572195229049ce2b3e7ac7a203c191`.
Author commit: `c0f2658a7a5` (driver integration may produce a different SHA).

The rewrite keeps both original scenarios and all four assertions: the GButton exists; its href equals the configured provider profile URL; the first definition detail equals the user's email; the second equals the user's username. The real GButton remains mounted. Required href access uses `getComponent`; presence retains `findComponent().exists()`. Indexed details use the existing guarded `nth` helper instead of non-null assertions, preserving their original order.

The shared ref-backed configuration mock replaces the bespoke implementation. Each scenario resets and seeds the provider configuration. Typed factory overrides remain visible in the username/email scenario. `withPlugins` installs the explicitly created Pinia and router while preserving common setup; native `global` replaces compatibility options. Auto-unmount executes before configuration reset, and `onTestFinished` disposes the owned Pinia after hooks. The mount helper awaits `nextTick` instead of exposing `wrapper.vm`.

## Validation

Both baseline and final shuffled runs passed 2 cases, using Node 22.20.0, one worker, and seed 530101:

```
VITE_CONFIG_NATIVE_IGNORE_WARNING=true npm_config_use_node_version=$(cat .node_version) pnpm exec vitest run src/components/User/UserOidcProfile.test.ts --maxWorkers=1 --sequence.shuffle --sequence.seed=530101 --coverage --coverage.reporter=json --coverage.reportsDirectory=/private/tmp/readability53-oidc-before
```

The final invocation substitutes `readability53-oidc-after`. Baseline completed before edits. Logs: `/private/tmp/readability53-oidc-before.log`, `/private/tmp/readability53-oidc-after.log`. Artifacts: `/private/tmp/readability53-oidc-before/coverage-final.json`, `/private/tmp/readability53-oidc-after/coverage-final.json`.

Coverage comparison normalizes each source path from `/client/` and compares covered statement locations, function locations, and individual branch-arm locations. Before and after have 144 files and the exact same 426 covered locations: zero lost, zero added. UserOidcProfile.vue retains 37 covered statements, 8 functions, and 14 branch arms. The default source coverage excludes external shared UI package files reached through the existing node_modules symlink; the real child and its assertions are unchanged.

Full client `pnpm run type-check` passed (`/private/tmp/readability53-oidc-types.log`). Targeted ESLint and Prettier passed (`/private/tmp/readability53-oidc-lint.log`, `/private/tmp/readability53-oidc-format.log`). Explicit repository pre-commit gates passed (`/private/tmp/readability53-oidc-hooks.log`) using `/Users/jxc755/.local/share/uv/tools/pre-commit/bin/python -m pre_commit run --config /Users/jxc755/projects/repositories/galaxy/.pre-commit-config.yaml.sample --files client/src/components/User/UserOidcProfile.test.ts` with the same pinned Node environment. The committed worktree is clean.

No production code, helpers, inventory, dependencies, or later-lane tests changed. Existing README advice covers the concrete issues; no additional guidance is proposed. Driver independent review remains separate.
