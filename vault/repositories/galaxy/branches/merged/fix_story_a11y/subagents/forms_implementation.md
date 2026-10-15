# Form accessibility repair batch

Implemented on the dev-based `fix_story_a11y` worktree only. Original migration and `vitest_story_a11y` worktrees were read-only. No staging or commits performed by this agent.

Underlying fixes:

- `client/patches/vue-multiselect@3.5.0.patch`: searchable input owns the combobox role, expanded state and current listbox/option references. The surrounding container is a group, allowing native tag buttons without an interactive ancestor. Non-searchable comboboxes retain their root role and current controls reference. Avoid stale or nonexistent active descendants when closed or empty. Selected-item removal uses a named native `type=button`, normal tab order, disabled state and native keyboard activation.
- `client/pnpm-lock.yaml`: exactly three dependency patch-hash replacements; no package/version upgrades.
- `client/src/style/scss/multiselect.scss`: placeholder contrast uses Galaxy's text token; selected tags and removal buttons have a minimum 24 CSS pixel target; preserve tag appearance, normalize native button typography/border/background.
- `client/src/components/Form/Elements/FormSelect.vue`: remove obsolete caller-owned expanded state because the dependency now sets it on the focused combobox.
- `client/src/components/Form/Elements/FormSelection.vue`: forward a generated or explicit ID to the real picker input; the surrounding container uses the ID with `-container`. This allows tool form and admin labels to target the actual input.
- `client/src/components/Form/Elements/FormOptionalText.vue`: provide a stable generated input ID and screenreader label for standalone optional values. Explicit caller IDs keep their existing external labels.
- `client/src/components/Form/Elements/FormSelectionPreference.vue`: minimum 24 CSS pixel switch and dropdown targets.
- `client/src/components/Form/FormElementLabel.vue`: optional `labelFor` emits a real label; other callers keep their current layout.
- `client/src/components/Login/ChangePassword.vue`: unique per-instance IDs associate the current/new/confirm password fields with their visible labels.
- `client/src/components/SelectionField/SelectionField.vue`: per-instance picker ID associates the visible title and avoids cross-instance duplicate IDs.
- `client/src/components/admin/QuotaForm.vue` and `RoleForm.vue`: associate visible field titles with their actual text inputs and pickers.

FormData and PermissionsInputField need no direct production edits: their observed chip/tabindex/target/placeholder/combobox findings are addressed by the shared dependency and stylesheet repairs. The collections agent owns FormSelectMany structural/target repairs and was coordinated with directly.

Validation:

- `npm_config_use_node_version=22.20.0 VITE_CONFIG_NATIVE_IGNORE_WARNING=true pnpm exec vitest run` on nine affected files: **9 files, 71 tests passed**. Log `/tmp/fix_story_a11y-forms-tests.log`. Files: FormSelect.test.js, FormOptionalText.test.js, MultiselectAccessibility.test.ts, FormData/FormData.test.ts, ChangePassword.test.ts, QuotaForm.test.ts, RoleForm.test.ts, SelectionField.test.js, PermissionsInputField.test.ts.
- New regression cases cover actual mounted combobox state and listbox/option references through open/navigation/close; named native tag removal buttons in the normal tab order and disabled state; stable optional input naming across toggles; visible labels associated with every password/admin input.
- Two existing admin test selectors changed from FormSelection root `attributes("id")` to the explicit component `props("id")`, preserving their behavior assertions while reflecting corrected input ownership.
- ESLint on all owned Vue/JS/TS changes passed: `/tmp/fix_story_a11y-forms-eslint.log`.
- Prettier ran on owned changes; git diff --check passed.
- Offline dependency installation successfully applies the patch: `/tmp/fix_story_a11y-patch-install.log`.
- Existing Vue compatibility warnings occur in the component test imports; no new test failures.

Scratch Storybook adaptation (validation only, no source-branch edits): `/private/tmp/galaxy-a11y-validation/client/src/components/admin/QuotaForm.stories.ts`, `admin/RoleForm.stories.ts`, `SelectionField/SelectionField.stories.ts`. Corrected combobox role now belongs to the input, so selected text and popup notes are inspected in the surrounding `.multiselect` group, while focusing/searching still uses the real combobox. The previously named textbox assertion is now a named combobox assertion. Same selected-text, visibility, order and behavior checks remain. Exact diff `/tmp/fix_story_a11y-scratch-selector-adaptations.diff`; reusable script `/tmp/adapt-a11y-scratch-selectors.py`.

Integration browser audit is owned by root and pending at this handoff. Root plans a real keyboard Space activation check on native selected-tag removal during screenshot review. Automated checks do not replace a complete keyboard/screenreader accessibility assessment.
