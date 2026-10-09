# issue_19049_collection_type_picker: implementation debrief

Branch `issue_19049_collection_type_picker` (`d2430ae96e9`, one commit on dev `4fe00d9e7ab`), fixes [#19049](https://github.com/galaxyproject/galaxy/issues/19049).

## Was #19049 already done?

No. The sample sheet work (`d26605517e0`) only added the `sample_sheet*` entries to the `datalist` of the free-text field in `FormCollectionType.vue`. #20403 only allowed any type to be typed.

## What changed

The design follows John's 2025-07-14 comment on the issue: a select for the known types, a custom mode, and a dialog that describes the types.

- `client/src/components/Collections/common/knownCollectionTypes.ts`: a new registry. Each entry has the type, label, description and group, for 12 types: the list, pair, record, nested list and sample sheet families.
- `client/src/components/Collections/common/CollectionTypeCards.vue`: a grid of cards grouped by family. Each card shows the label, the type string and the description, and emits `select`. Cards respond to Enter and Space.
- `client/src/components/Workflow/Editor/Forms/FormCollectionType.vue`:
  - The free-text field is now a select. Its options are "Any collection type" (null), the known types (labelled `Label (type)`), and "Custom collection type...".
  - Custom mode shows a validated text field.
  - A saved type the select doesn't list opens in custom mode.
  - Typing through a known prefix (`list` → `list:list`) stays in custom mode.
  - The selected type's description shows as help text.
  - The link "Not sure which collection type to use?" opens a `GModal` with the cards.
- Selenium (`test_workflow_editor.py`, `test_workflow_run.py`) uses `select_set_value` on the new `collection_type_select` selector. It replaces `collection_type_input`.
- The unused `:optional` prop on `FormCollectionType` in `FormInputCollection.vue` is dropped.

## Verification

- New `FormCollectionType.test.ts`: 11 tests. Three were red-first after review: "any" emits null, a legacy `""` value shows as "any", and clearing the custom field doesn't emit.
- All 325 workflow editor vitest tests pass. `vue-tsc` and eslint are clean.
- Playwright E2E `test_collection_input_sample_sheet_chipseq_example` passes locally. It ran headless against Vite on 5185 → Galaxy on 8081, because port 8080 was held by another session. The test asserts the saved type is `sample_sheet:paired`, so the select did not pick `sample_sheet:paired_or_unpaired`.
- I checked it manually in a browser:
  - The select, the dialog and the custom-mode error all render.
  - Picking "Any" and saving gives `"collection_type": null` in the downloaded workflow.

## Review (subagent) — acted on

1. **Real bug, fixed.** "Any" emitted `undefined`. axios then drops the key, and `InputDataCollectionModule._parse_state_into_dict` falls back to `"list"`. The component now emits `null`, and a comment there explains why.
2. A legacy `""` value rendered a blank select. It now normalises to null.
3. Clearing the custom field emitted while also showing an error. It is now silent.
4. The custom help text wrongly suggested `sample_sheet` can nest. It now lists list/paired/paired_or_unpaired/record only, matching `collectionTypeRegex`.
5. The `record` description no longer claims fields declare datatypes, since they aren't validated.
6. Added connection notes from `collection_semantics.yml`:
   - a `list:paired_or_unpaired` input also accepts `list:paired`;
   - a sample sheet input rejects a plain list, but a sample sheet satisfies a list input.
7. Cards respond to Space. Removed the no-op `display: 'simple'` and a redundant test assertion.

## Review — not acted on (and why)

- **Wizard card duplication.** `ListWizard/WhichBuilder.vue` and `wizard/WhichWorkbookCollectionType.vue` repeat the same BCard + `borderVariant` + `.wizard-selection-card` pattern and near-identical descriptions, and their titles have drifted ("Flat List" vs "List of Datasets"). Migrating them onto `knownCollectionTypes.ts` and `CollectionTypeCards`, or onto a generic selection-card grid, is follow-up scope:
  - their copy is about *creating* collections, not accepting them;
  - WhichBuilder has a non-type "rules" card and an advanced toggle.

  The PR description should mention the registry as the intended single source.
- **Card style is copied a third time.** The 3px border and hover rule now live in `GenericWizard.vue`, `HistoryExportWizard.vue` and `CollectionTypeCards.vue`. This belongs to the same follow-up.
- **`FormInputCollection.isRecordType`** still hard-codes the three record types. A registry helper would be optional and unrelated to the issue.
- **Tests coupled to `data-selected-value`.** The tests read FormSelect's rendered `data-selected-value`, including its label fallback for a null option. That checks what the user actually sees, so I kept it.
- **Cards as `role="radio"`/real buttons.** I kept `role="button"` with Enter/Space. A radiogroup would suit a "pick one" dialog better if accessibility review asks for it.

## Follow-ups / open

- Small tree diagrams per type, as the issue comment floated (gx-collection-graphviz). Not done.
- Migrate the wizard pickers onto the registry and cards (see above).
- Whether "Any collection type" should stay in the list or move behind custom mode. It is kept for parity with the old empty field and still shows the existing warning.
