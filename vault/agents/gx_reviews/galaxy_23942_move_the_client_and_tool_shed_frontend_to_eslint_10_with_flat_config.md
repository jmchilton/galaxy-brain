# galaxy#23942 — Move the client and tool shed frontend to ESLint 10 with flat config

- PR: https://github.com/galaxyproject/galaxy/pull/23942 (dannon, not draft, base `dev`; mvdbeek requested, no reviews yet)
- Head reviewed: `aaed58e7b28` (8 commits, +1603/-1518, 56 files)
- Worktree: `~/projects/worktrees/galaxy/pr/23942` (detached at head; PR merge-base `68d72aefd48`)
- Status: reviewed locally, review **unposted**.

## Verdict

Comment, leaning approve once rebased. The client migration holds up rule for rule, and the CI warning diff matches the PR's claim exactly. The two bug fixes are real and tested red-to-green. Things to fix first: the PR **conflicts with dev**, because #23925 rewrote the shed after this branched, so the shed result is stale. The shed config also isn't the "as-is" carry-over the description says it is.

## Summary

- Client: `.eslintrc.js` → `eslint.config.mjs`. eslint 8→10, `eslint-plugin-import` → `eslint-plugin-import-x`, `@typescript-eslint/*` v6 → `typescript-eslint` v8, eslint-plugin-vue 9→10, compat 4→7, simple-import-sort 10→14, plus `globals` and `@eslint/js`.
- Shed: `.eslintrc.js` + `.eslintignore` → `eslint.config.mjs`. Drops `@vue/eslint-config-typescript` and moves typescript-eslint from v5 to v8. `pnpm dedupe` removed a stale vuejs-accessibility copy.
- `.ci/eslint_wrapper.sh` drops `-c` and `NODE_PATH` and adds `--no-warn-ignored`. ESLint 10 looks up the config from each file.
- Cleanup commit `e5a58b87d26`: dead initializers, optional catch bindings and `{ cause }`. All behavior-neutral (checked each hunk).
- Bug fixes with tests first: `useConfigurationTesting.ts` edit/upgrade (`const pluginStatus` shadowed the outer `let`, so a `not_ok` test never blocked the save), and `PageEditorView.vue` title (`` `History: ${x}` || fallback `` was always truthy).

## Findings (ranked)

1. **Conflicts with dev; the shed lint result is stale.** `mergeable: CONFLICTING`. `git merge-tree origin/dev HEAD` conflicts in `client/pnpm-lock.yaml`, `lib/tool_shed/webapp/frontend/package.json` and `.../pnpm-lock.yaml`. #23925 (merged after the merge-base) moved the shed onto galaxy-ui (`"@galaxyproject/galaxy-ui": "file:../../../../client/packages/ui"`) and touched ~100 shed files. The "0 errors, 2 warnings" shed result only covers the old shed source. After rebasing, the new config has to be run against the new components. Finding 2 means it now applies Vue 3 rules the old config never ran, so expect new hits.

2. **The shed preset silently switches from Vue 2 to Vue 3** (`lib/tool_shed/webapp/frontend/eslint.config.mjs:17`). The old `plugin:vue/strongly-recommended` under eslint-plugin-vue 9 is the **Vue 2** preset. v9's `index.js` maps `'strongly-recommended'` to `./configs/vue2-strongly-recommended`. The new `flat/strongly-recommended` is the Vue 3 one. This is the right preset for a Vue 3 app, but it isn't "carrying the rules over as-is". The two `vue/v-on-event-hyphenation` warnings come from this switch. Two follow-ups:
   - `vue/no-multiple-template-root: "off"` (`:30`, "not needed for vue 3") is now dead config. That rule is Vue 2 only. Drop it.
   - Fix the two warnings now. Both are `MetadataInspectorPage.vue:97` `@goToRevision` and `:103` `@resetComplete`. Vue 3 normalizes event names, so `--fix` to `@go-to-revision`/`@reset-complete` is behavior-safe.

3. **The shed silently loses some rules, and only one was restored.**
   - `@vue/eslint-config-typescript/recommended` (11.0.2) turned on `no-var`, `prefer-const`, `prefer-rest-params` and `prefer-spread` **globally**. Its own comment says this was so `<script lang="ts">` in `.vue` got them. In v8, typescript-eslint's `eslint-recommended` enables those only for `*.ts/*.tsx/*.mts/*.cts`, so shed `.vue` files lose all four.
   - typescript-eslint v5 → v8 recommended drops `adjacent-overload-signatures`, `no-empty-function` and `no-inferrable-types` (moved to stylistic), plus `no-non-null-assertion` (moved to strict). `no-empty-interface` becomes `no-empty-object-type`.
   - The PR re-adds only `no-non-null-assertion` (`:36`, with the comment "In typescript-eslint's recommended set before v8; kept so these still show up").
   - Pick one policy: restore the rest (four to seven lines) or state in the PR body that they're dropped.
   - In the other direction, `no-explicit-any` goes from warn to error in the shed. Every current `any` is disable-commented, so this is harmless but stricter.

4. **Edit flow still saves when the test request itself fails** (pre-existing, next to the fix). `useConfigurationTesting.ts:206-209`: on `testRequestError`, edit sets `error` and the force button but doesn't `return`, so it goes on to the PUT. If the PUT succeeds, `onUpdate` navigates away. Create (`:61-64`) and upgrade (`:327-331`) both return. One `return` plus a third test case, using the new test file's `mockFailedTestAndTrackUpdates` pattern, would align them. More broadly, create/edit/upgrade are three hand-copied test-then-save sequences. A shared `runConfigurationTest(payload)` helper would have prevented both the shadowing bug and this divergence. That's a follow-up, not a blocker.

5. **Config duplication between client and shed** (abstraction question). The configs repeat the same wiring: pinning `vue-eslint-parser`, `tseslint.parser` inside vue blocks, the vuejs-accessibility recommended preset, browser globals and `vue/v-slot-style`. The rule philosophies differ by design: the shed runs prettier inside eslint on strongly-recommended, while the client uses recommended plus a large custom set and a separate prettier check. A fully shared config is a bigger change than this PR should make. But after #23925 the shed already pulls workspace code from `client/packages/ui` via `file:`. A `client/packages/eslint-config` (shared base, plus the galaxy-ui `.native` exemption) could be consumed the same way. Worth a follow-up issue; not blocking.

6. **29 `vue/no-required-prop-with-default` warnings (client).** Real but low-value. All are `withDefaults(defineProps<Props>(), {...})` where the interface declares the prop as non-optional, so callers must pass it and the default is dead. A rough scan finds about 27 props in 16 files, e.g. `ToolsListCard.vue` (6), `CollectionCreator.vue`, `DatasetActions.vue`, `HistoryScrollList.vue`, `SaveChangesModal.vue`, `SelectorModal.vue` and the three `Collections/wizard/SourceFrom*.vue`. The rule's autofix adds `?`, which relaxes the parents' type obligations and drops the runtime `required: true` dev warning. Vue applies the default either way, so this is safe. Fine as a follow-up, or one `eslint --fix --rule` commit here.

7. **`projectService: true` without `tsconfigRootDir`** (`client/eslint.config.mjs:197`). The pre-commit wrapper now runs from the repo root, not `client/`. typescript-eslint's docs recommend `tsconfigRootDir: import.meta.dirname` with the project service, which removes any cwd dependence. CI doesn't cover the wrapper path, and the PR's manual-test step 2 isn't confirmed. Low; set it, or confirm the hook works on a `.ts` file.

8. Nits (optional):
   - `client/src/entry/analysis/modules/Analysis.vue:107`: the new disable comment calls the `<transition name="slide">` "vestigial and a no-op". If so, delete the transition instead of suppressing the rule.
   - `client/src/stores/collectionElementsStore.test.ts:22-23`: dropping `?? 0`/`?? 10` keeps behavior (`Number(null) === 0`, so they were dead), but the intended default limit of 10 is lost. `Number(query.get("limit") ?? 10)` would restore the intent.

## Rule parity: client (checked rule by rule)

- `baseRules` is carried over verbatim. The only rename is `import/{first,newline-after-import,no-duplicates}` → `import-x/...`.
- Presets:
  - `eslint:recommended` → `js.configs.recommended`.
  - `plugin:compat/recommended` → `compat.configs["flat/recommended"]`.
  - `plugin:vue/vue3-recommended` → `vue.configs["flat/recommended"]`. Both are Vue 3. Diffing v9.33 and v10.11.1 vue3 presets, v10 adds `no-deprecated-delete-set`, `no-deprecated-model-definition`, `valid-define-options` (essential), `no-required-prop-with-default` (recommended) and `block-order` (rename of `component-tags-order`).
  - The vuejs-accessibility preset is kept.
- Env: `browser`/`node` → `globals.browser`/`globals.node`. `es6` is implicit (flat config defaults to ecmaVersion latest).
- Test globals: the hand list → `globals.vitest` (globals@17 has the key; it's a superset that adds `assert`, `chai`, `suite`, `expectTypeOf`...). Globs are unchanged.
- Ignores: the `ignorePatterns` entries → `globalIgnores([... "/**"])`. One subtle change: eslintrc's bare `dist` matched any depth, while `dist/**` is anchored to `client/`. The lint targets are `src` and `packages/ui/src`, so this has no practical effect.
- File set: `--ext .js,.vue,.ts` → `**/*.{js,mjs,cjs,ts,tsx,vue}`. There are no `.tsx/.mjs/.cjs/.jsx` files under the targets, so coverage is effectively unchanged.
- `.vue` parsing:
  - Old: `vue-eslint-parser` with `{js: espree, ts: @typescript-eslint/parser}`. New: `vueParser` pinned, with `tseslint.parser` for every script block. JS-only script blocks now go through the TS parser, which is fine.
  - No project or type info for `.vue`, same as before.
  - `.vue` doesn't get `tseslint.configs.recommended`, same as before (the old override was `*.ts/*.tsx` only). So `no-explicit-any` in `.vue` was always off, which is why the stale disable in `ToolLinkPopover.vue` was safely removed.
- TS block:
  - v6 recommended → v8 recommended. `ban-types` splits into `no-empty-object-type`/`no-unsafe-function-type`/`no-wrapper-object-types`, `no-var-requires` becomes `no-require-imports`, and `no-unused-expressions` is added.
  - `project: true` → `projectService: true`.
  - `@typescript-eslint/no-throw-literal` → `only-throw-error`, the v8 replacement with the same default options.
  - Base `no-unused-vars` now turned off for TS. The old config re-applied it on top via `...baseRules`, which was a quirk.
- Type-import rules no longer run on `.js`. The old eslintrc loaded override plugins globally, so they did run there, but they're meaningless for JS. This is a no-op.
- `packages/ui` `.native` exemption: kept.
- Source directives: no remaining `import/` references (one `import/order` disable removed from `mockServices.ts`; `PairedOrUnpairedListCollectionCreator.vue:894` was renamed to `import-x/first`). No `eslint-env` comments, and no disables naming removed TS rules (the shed's `ban-types` disable was renamed to `no-empty-object-type`). No "unused eslint-disable" reports in CI, even though flat config now reports them by default.

## Plumbing

- `.github/workflows/js_lint.yaml` → `pnpm run eslint` → `eslint src packages/ui/src`. `toolshed_frontend.yaml` → `pnpm lint` → `eslint src`. Both still match.
- `Makefile` `client-eslint`, `client-eslint-precommit` and `client-lint-autofix` all go through the pnpm scripts, so they're unaffected.
- `.pre-commit-config.yaml.sample`'s `eslint` hook (`files: ^client/`) → `.ci/eslint_wrapper.sh`. It's fine with ESLint 10's per-file config lookup; see finding 7. Files outside `tsconfig` `include` (e.g. `client/vite.config.ts`) fail project parsing as they did before.
- Docs: `client/docs/unused-variables.md` is updated. There are no other `.eslintrc` references in the repo.
- Node: eslint 10 needs `^20.19 || ^22.13 || >=24`. `.node_version` is 22.20.0 for both.
- Shed `typescript` resolves to 4.9.5, inside typescript-eslint 8's `>=4.8.4` floor.
- The lockfiles resolve the same eslint stack in both (eslint 10.12.0, vue 10.11.1, ts-eslint 8.71.1, vue-eslint-parser 10.4.1, vuejs-a11y 2.6.0).

## What I checked and how

- Static reading only. There were no `node_modules`, and per the disk limits I didn't install.
- Diffed the old and new configs by hand.
- Pulled the upstream preset sources from unpkg to confirm the semantics: `@vue/eslint-config-typescript@11.0.2` `index.js`/`recommended.js`, the eslint-plugin-vue 9.33.0 vs 10.11.1 preset rule lists, `@typescript-eslint/eslint-plugin@5` recommended, and `globals@17` (`vitest` key).
- Read every source hunk in all 8 commits.
- Checked mergeability with `git merge-tree`.
- CI (`gh pr checks`):
  - **Client linting** passes: `✖ 1158 problems (0 errors, 1158 warnings)`. Tallied by rule against dev's run at `9fd083720a7` (1133): +29 `vue/no-required-prop-with-default`, and the only other differences are small dev drift (`no-explicit-any` −2, `one-component-per-file` −2). That matches the PR's claim.
  - **Tool Shed frontend** passes: 0 errors, 12 warnings (10 existing `no-non-null-assertion`, 2 new hyphenation).
  - Client unit tests, client build and API tests pass.
  - **Test Galaxy packages (3.10/3.14) fail**, unrelated to this PR: `tests/seleniumtests/test_context.py` → `ModuleNotFoundError: No module named 'galaxy_test'`. That test file was added by #23947, which is in the CI merge base `8f0e4d1116e`.

## Draft GitHub review (UNPOSTED)

> _Posted by Claude (AI assistant) on behalf of jmchilton. Not written by them personally._
>
> Thanks, this is a careful migration. I diffed the old and new configs rule by rule, and the client side carries everything over: rules, test globals, ignores, the galaxy-ui `.native` exemption and the `import-x` renames, including the one directive in `PairedOrUnpairedListCollectionCreator.vue`. CI's warning tally against dev is exactly +29 `vue/no-required-prop-with-default`, as the description says. The cleanup commit is behavior-neutral, and both bug fixes with tests-first are nice catches.
>
> A few things, mostly on the shed side:
>
> - **Rebase needed.** This now conflicts with dev (both shed `package.json`/lockfile and the client lockfile) since #23925 rewrote the shed onto galaxy-ui. The shed lint result here predates that, so it's worth re-running on the new components. Because of the next point, I'd expect some new hits.
> - **The shed's Vue preset changes.** Under eslint-plugin-vue 9, `plugin:vue/strongly-recommended` was the *Vue 2* preset (`vue2-strongly-recommended`). `flat/strongly-recommended` in v10 is the Vue 3 one. That's the right preset for the shed, but it isn't as-is. It's where the two `v-on-event-hyphenation` warnings come from. It also makes `"vue/no-multiple-template-root": "off"` dead config, since that rule only exists in the Vue 2 preset. The two warnings (`MetadataInspectorPage.vue` `@goToRevision`/`@resetComplete`) are safe to `--fix` in Vue 3, so maybe just fix them here.
> - **Shed rules that quietly drop out.** `@vue/eslint-config-typescript/recommended` turned on `no-var`, `prefer-const`, `prefer-rest-params` and `prefer-spread` globally, so `<script lang="ts">` in `.vue` got them. typescript-eslint v8's `eslint-recommended` applies them only to `.ts`-family files. Going from v5 to v8 recommended also drops `adjacent-overload-signatures`, `no-empty-function` and `no-inferrable-types`. The config restores `no-non-null-assertion` for this reason but not the others. Could we either add those back or mention in the description that they're intentionally dropped?
> - **Edit flow, next to your fix.** In `useConfigurationTemplateEdit.onSubmit`, a failed *test request* (`testRequestError`) sets the error and force button but doesn't `return`, so it still goes on to the PUT. Create and upgrade both return there. One `return` plus a third case in the new test file would align them. Longer term, a shared test-then-save helper for create/edit/upgrade would stop these three copies drifting.
> - **`tsconfigRootDir`.** Since the pre-commit wrapper now runs from the repo root, consider `tsconfigRootDir: import.meta.dirname` next to `projectService: true`, as the typescript-eslint docs recommend. Or just confirm the hook on a `.ts` file, since CI doesn't exercise that path.
> - **Follow-up idea, not for this PR.** Now that the shed pulls `client/packages/ui` in via `file:`, a small shared ESLint base package in `client/packages/` could hold the common wiring (vue-eslint-parser pin, TS parser in SFCs, a11y preset, the galaxy-ui `.native` exemption), so the two configs don't drift.
> - The 29 `no-required-prop-with-default` hits are all `withDefaults` on props typed as required. The rule's autofix (adding `?`) is safe if you'd rather clear them now than later.
>
> Small nit: the `Analysis.vue` disable says the `<transition name="slide">` is vestigial and a no-op. If so, removing the transition reads better than suppressing the rule.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Dev tooling only. There is no runtime, API or artifact-format change outside the two small client bug fixes, which correct behavior (edit/upgrade now honor a failing config test; the notebook title falls back correctly).
- The edit/upgrade fix means saves that previously went through despite a `not_ok` connection test now stop with the error and the force button. That's intended, but users who used to get away with a broken config will see it.
- Shed lint coverage shifts (Vue 2 → Vue 3 preset; a few TS/ES rules dropped for `.vue`). If missed, this is a slow quality drift, not breakage.
- ESLint 10 raises the Node floor to 20.19/22.13. Contributors on older Node 20.x will see lint/pre-commit fail.
- simple-import-sort 14 and import-x reorder a few imports. In-flight branches may pick up lint churn after rebasing.

</details>

<details><summary>Risk Review Advice</summary>

The main thing for the merger is the rebase onto post-#23925 dev, then confirming that the shed lint still passes on the new components with the Vue 3 preset. Decide whether the dropped shed rules (`prefer-const` & co. in `.vue`, TS stylistic carry-overs) should come back before merge or be explicitly accepted.

</details>
