Implement 🎯 #19049 - pick a workflow collection input's type from a described select instead of a free-text field.

On `dev` the editor asks for a collection input's type in a text box. Its suggestions are a `datalist`, so they only show up once you start typing something that matches, and nothing on the form says what `list:paired_or_unpaired` or `sample_sheet:record` means or which one fits your data. This branch makes it a select of the known types, with each type's description under it, a custom mode for any other type, and a "Not sure which collection type to use?" dialog that explains them all.

| Pick a known type | Each choice is described |
| --- | --- |
| ![The collection type select, open](screenshots/02_select_open.png) | ![List of Dataset Pairs selected, with its description below](screenshots/03_select_list_paired.png) |

| "Not sure which collection type to use?" opens a dialog of cards; clicking one picks it |
| --- |
| ![The collection types dialog](screenshots/04_help_modal.png) |

| Custom mode for anything else, validated as you type | |
| --- | --- |
| ![An invalid custom type shows an error](screenshots/06_custom_invalid.png) | ![A valid custom type](screenshots/07_custom_valid.png) |

***This is for workflow authors editing a collection input in the editor. Tool XML, the run form, the collection builders and the upload wizards are untouched.***

***Existing workflows load and run as before, and what a collection input accepts is unchanged. Any type the old field took can still be entered in custom mode, and a saved type the select doesn't list (e.g. `list:list:list`) opens there. The only stored difference: choosing "Any" writes `collection_type: null` where clearing the old field wrote `""`; both mean any collection type.***

***The types, labels and descriptions live in a new registry, `knownCollectionTypes.ts`, meant to become the one place the client describes collection types. The upload wizards' own type cards aren't moved onto it here.***

This follows the design from the issue discussion: a normal select for the well-documented types, a custom mode that falls back to typing, and a dialog modelled on the existing wizard cards. `FormCollectionType` swaps between the select and the text field itself; it doesn't add the general select-or-text input floated in the issue.

<details><summary>Implementation</summary>

- `Collections/common/knownCollectionTypes.ts`: 12 types (the list, pair, record, nested list and sample sheet families), each with a label, a description and a group. Descriptions include the connection rules that surprise people (from `collection_semantics.yml` and `CollectionTypeDescription.accepts`): a `list:paired_or_unpaired` input also takes a plain `list` or a `list:paired`, and a sample sheet can connect to a list input but not the other way round.
- `Collections/common/CollectionTypeCards.vue`: the grouped card grid used in the dialog. Cards respond to click, Enter and Space, and the current type's card is highlighted.
- `Workflow/Editor/Forms/FormCollectionType.vue`: the select ("Any collection type", the known types as `Label (type)`, "Custom collection type..."), the validated custom text field and the `GModal` dialog. Typing through a known prefix (`list` on the way to `list:list`) keeps the text field open. An empty or invalid custom value shows an error and isn't saved.
- Selenium/Playwright tests that set a collection type use `select_set_value` on a new `collection_type_select` selector, replacing `collection_type_input`.

</details>

## Risks

The labels and descriptions become user-facing guidance that people will learn from and that later work should reuse; everything else is a two-way door.

<details><summary>Risk Details</summary>

- Choosing "Any collection type" now saves `collection_type: null` where clearing the old field saved `""`. The server (`validate_state`, `DataCollectionToolParameter`) and the editor's terminals treat both as "any". gxformat2 export omits a null key where it wrote `collection_type: ''`; both re-import as the default `list`, as on `dev`.
- The selected type's description shows as help text on every collection input, so wording mistakes are visible.
- "Any collection type" is a menu option but still shows the existing "Typically, a value for this collection type should be specified." warning.

</details>

<details><summary>Risk Review Advice</summary>

Read the descriptions in `knownCollectionTypes.ts` as user documentation: are they accurate, and are the connection rules they state the ones Galaxy enforces? Then check the custom-mode edges in `FormCollectionType.vue`: a saved unknown type, typing through a known prefix, and an empty or invalid custom value.

</details>

## Context

Builds on 🔀 #20403 (allow any collection type in this field) and 🔀 #19305 (sample sheets, which added the `sample_sheet*` suggestions).

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? An invalid or empty custom type shows an inline error and isn't saved; the step keeps the last valid type entered, which can be a prefix typed on the way (as on `dev`). A saved type the select doesn't list opens in custom mode.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They check what the select renders, what reaches the step's saved state (including "Any" as `null`), what the dialog picks, and that every listed type passes the collection type validator.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None. Saving "Any" now stores `null` instead of `""`; both mean any collection type.
- [x] Who hits this in practice and what is the evidence? Workflow authors defining collection inputs, who get a bare text box (#19049, and the #20403 and #19305 discussions).
- [x] Were simpler or existing approaches considered? Yes. A plain select would drop types it doesn't list, and keeping the text box with added help would still hide the options. There's no select-or-text component to reuse, and the wizard cards are tied to `GenericWizard`, so the dialog has its own card grid.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] Instructions for manual testing are as follows:

<details><summary>Tests and manual steps</summary>

- vitest: `FormCollectionType.test.ts` (known types, "Any", custom mode, unknown saved types, invalid and empty custom values, picking from the dialog), `FormInputCollection.test.ts` ("Any" survives to the saved state as `null`), `CollectionTypeCards.test.ts` and `knownCollectionTypes.test.ts`.
- `test_workflow_editor.py::test_collection_input_sample_sheet_chipseq_example` sets the type through the new select and asserts the saved type is `sample_sheet:paired`. The two chipseq tests in `test_workflow_run.py` set it the same way.

Manually: open the workflow editor, add an "Input Dataset Collection", and try the select, the "Not sure which collection type to use?" dialog and "Custom collection type...".

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
