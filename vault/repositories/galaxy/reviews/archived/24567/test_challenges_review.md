# Test challenges review: PR #24567

- Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md)
- Model: Claude Opus 5.5 (claude-opus-5-5); effort: low
- Reviewed commit: `19e40ed7800c`
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

The new checkbox test is at the right layer and in good shape (real inputs, label association, real OK click, emitted payload, shared `nth`/`emittedArg` helpers). No P1s. Vitest was not run (no `client/node_modules` in the worktree).

### P3 1: Dependency checkbox test can't detect swapped bindings

The mocked config starts all three dependency flags as `true` and the test toggles only "Install tool dependencies". Swapping the `v-model` of "Install resolvable dependencies" and "Install repository dependencies" would still pass. Seed distinct initial values (e.g. resolver `false`, others `true`) or toggle so the three emitted values are not symmetric, so each label is tied to its own request field.

### P3 2: Drop the `wrapper.vm.install*Dependencies` assertions in the "installer interface" test

Those three lines read component internals and are now covered by the new test's `checked` assertions on the rendered inputs. Removing them keeps the file testing behaviour rather than data fields.

### P3 3: Guard against reintroducing the un-patched bootstrap-vue form controls

With the `form-radio-check`/`form-select`/`form-tags` hunks gone, a future `BFormCheckbox`/`BFormRadio`/`BFormSelect`/`BFormTags` with `v-model` would silently hit the compat assigner bug again. A `no-restricted-imports` rule for those `bootstrap-vue` names in `client/eslint.config.mjs` would make that a lint error instead. Optional follow-up.
