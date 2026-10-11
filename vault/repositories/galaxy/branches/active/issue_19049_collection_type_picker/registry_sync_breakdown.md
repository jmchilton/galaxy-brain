# Sharing `knownCollectionTypes.yml` with the collection wizards

**Built in `b250cc31a5c` (2026-10-11).** John's calls:
- Roll it into this PR.
- Use the wizard labels, with "Nested List of Dataset Pairs" becoming "Nested List of Paired Datasets". The agent also renamed `sample_sheet:paired` to "Sample Sheet of Paired Datasets" to match.

Differences from the sketch:
- Notes live under `notes: {workflow_input, builder}`.
- The prop is `context`, and wizards pass `hide-type`.
- An unknown type in `types` throws.

The original sketch follows.

## Today: three copies of the same cards

- `Workflow/Editor/Forms/FormCollectionType.vue` → `CollectionTypeCards.vue`: 12 types from the registry.
- `Collections/ListWizard/WhichBuilder.vue`: hand-written cards for `list`, `list:paired`, a "Rule Builder" card, and an advanced row with `list:paired_or_unpaired`, `list:list` and `list:list:paired`.
- `Collections/wizard/WhichWorkbookCollectionType.vue`: the same five types, hand-written again.

The three disagree on labels and wording:

| type          | registry              | wizards                 |
| ------------- | --------------------- | ----------------------- |
| `list`        | List of Datasets      | Flat List               |
| `list:paired` | List of Dataset Pairs | List of Paired Datasets |

## Split the backbone from each surface's text

The shared backbone is the type, its canonical label, its group and its order, plus a description of the structure itself. Each surface keeps its own sentence about what choosing the type means there.

```yaml
- group: Lists
  types:
    - collection_type: list:paired_or_unpaired
      label: Mixed List of Paired and Unpaired Datasets
      description: A list where each element is either a single dataset or a forward and reverse pair.
      workflow_input: A list of datasets or a list of dataset pairs can also be connected to this input.
      builder: For studies with a mix of paired and unpaired data. Existing tools and workflows may need updating.
```

- `CollectionTypeCards` gets a `types` prop (which types, in what order) and a `context` prop (`workflow_input` | `builder`) that appends that surface's sentence. The editor keeps passing nothing, which means all types.
- The wizards pass their five types. "Rule Builder" isn't a collection type, so it stays a local card beside the component, or goes in through a slot.
- Keep the `data-which-builder` attribute on wizard cards, or move the E2E selectors to `data-collection-type` in the same PR.
- This removes the triplicated card CSS (`wizard-selection-card`).
- Size: one PR after this one lands, roughly −150 lines across the two wizard files, plus updated vitest coverage.

## Other places that could use the backbone

- Display labels:
  - `Collections/common/buildCollectionModal.ts` `COLLECTION_TYPE_TO_LABEL`, the tool form's "Create a new list of pairs".
  - `History/Content/Collection/CollectionDescription.vue` `labels`, the history item's "a list with 4 pairs".
  - Both want a short lowercase noun, so they'd need a `short_label` field.
- Glossary: `Help/terms.yml` `flatList`.
- Not the YAML: `Form/Elements/FormData/collections.ts`, which picks the builders offered for a type, and `Collections/wizard/SelectCollection.vue`, which picks the sample sheet sources. These encode which types connect to which. They should derive from `collectionTypeDescription.ts` `accepts`, not from descriptive YAML.
- Server: `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` is the formal spec. Python already reads one client YAML, `navigation.yml`, so the registry could feed tool and workflow docs later. That isn't worth doing yet.

## Decisions for John

1. Which labels win, "List of Datasets" or "Flat List", and "List of Dataset Pairs" or "List of Paired Datasets"? Recommendation: the registry's, which match "Dataset Pair" and "Nested List of Dataset Pairs".
2. Should the wizard cards move in this PR or a follow-up? Recommendation: a follow-up, since this PR is already two features.
