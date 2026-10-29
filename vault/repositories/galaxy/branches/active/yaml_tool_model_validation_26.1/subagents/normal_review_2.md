# Normal review 2 — re-scope commits

Run via Opus 5.5 (general-purpose subagent) at default effort, on `aed21454479`/`263d10a3cf1`.

Acted on both bugs, each red→green, amended into `70c84ac2398`:
1. **Collection `hidden` stopped at the parser.** I fixed it at runtime (option a) rather than removing the field. `create_collection` (`tools/actions/__init__.py`) now sets `hdca.visible = False` for a hidden output. API test `test_hidden_collection_output_is_hidden` (`test_unprivileged_tools_labels.py`) runs a hidden and a shown collection; it failed with `{'hidden': True} != {'hidden': False}` before the fix. Why not remove it: `hidden` is documented on the authoring model that user tools and LLM authoring already use, and taking it off collections only would mean restructuring the shared output base model.
2. **Class-less YAML lost the soft-fail on bad citations.** XML's per-profile loop (skip with a warning before 26.1, raise from 26.1) moved to `ToolSource._parse_citation_list` and is used by both parsers. YAML parses each citation with `Citation.model_validate` (the nit). Two class-less YAML unit tests mirror the XML ones and were red first.

Not acted on:
- **Removing `ContainerRequirement` breaks a public import** in `galaxy-tool-util-models` (shipped in 25.1/26.0). There are no known consumers: none in Galaxy or planemo, and galaxy-tool-util-ts only has it in a generated schema that a regen drops. Needs a PR/changelog line.
- **User-supplied DOIs now cause server-side doi.org fetches** when user-tool citations are shown. Already true for XML tools. Needs a PR body line.
- **Tests:** a `doi:`-prefix case and an end-to-end citations API test. The prefix normalization is model behavior that XML tests already cover. Left to the test challenges.
- **Implicit (mapped-over) collections** don't apply the output's `hidden`. That's a different code path, and XML has no collection `hidden` at all.

<details><summary>Full review</summary>

Verdict: the container-requirement removal (aed21454479) is clean. The citations/hidden commit (263d10a3cf1) has two real problems.

1. Collection `hidden` stops at the parser: `yaml.py` sets `ToolOutputCollection.hidden`, but nothing at runtime reads it. The HDCA is built in `tools/actions/__init__.py` (~1255) with no visibility argument, and `output.hidden` is only read for datasets (~636). XML has no collection `hidden` (XSD `OutputCollection`, `xml.py:527`). The model still accepts a field Galaxy drops, and the unit test only checks the parsed attribute. Fix: (a) `hdca.visible = False` plus an API test, or (b) remove `hidden` from the incoming collection models. Reviewer preferred (b).
2. Class-less YAML now fails to load on a malformed citation. `Citation(**c)` raises; previously citations were ignored. This breaks the XML rule (skip+warn below 26.1, fail at 26.1+; `xml.py:750-763`, tested at `test_parsing.py:1176-1190`). Fix: a shared helper keyed on `parse_profile()`, plus class-less YAML tests.

Checked OK: stored user tools are lifted and validated before parsing; GalaxyTool citations are validated in `__init__`; user-tool citations flow end to end and render through `v-sanitize-html`; there are no `ContainerRequirement` consumers besides galaxy-tool-util-ts's generated schema; the `schema.ts` regen matches. Caveat: the class is a public import in the 25.1/26.0 releases.

Nits: `Citation.model_validate` over `Citation(**c)`; `test_citations_load` could cover the `doi:` prefix and an end-to-end API path; removing the `UserToolSourceAuthoringView.requirements` override is a good simplification.

</details>
