---
type: research
subtype: component
tags:
  - research/component
  - galaxy/tools
  - galaxy/api
  - galaxy/client
  - galaxy/admin
component: "Tool Citations and External Metadata Fetch"
status: draft
created: 2026-10-30
revised: 2026-10-30
revision: 1
ai_generated: true
sources:
  - "vault/agents/gx_research/archive/tool_citations_and_external_metadata_fetch.md"
summary: "Tool citations from XML parse to DOI-resolved BibTeX display, the bio.tools EDAM lookup, their beaker caches, config, consumers and tests"
related_notes:
  - "[[Component - User-Defined Tool Source Validation]]"
  - "[[Component - User-Defined Tools]]"
  - "[[Component - Data Fetch]]"
  - "[[Component - DRS Support]]"
  - "[[Component - Agents Backend]]"
  - "[[PR 22615 - UserToolSource Pydantic Semantic Validation]]"
  - "[[PR 18524 - Add Tool-Centric APIs to Tool Shed 2.0]]"
related_prs:
  - 22029
  - 20408
  - 19770
  - 15998
  - 14876
  - 9757
---

# Tool Citations and External Metadata Fetch

This note follows a tool's citations from the tool source to what the user sees: parsing, the `Citation` model, the runtime citation objects, lazy DOI-to-BibTeX resolution through a beaker cache, the API and UI consumers, and the Tool Shed. It also covers the bio.tools metadata source, Galaxy's other outbound metadata lookup at tool load, and its cache. It closes with the config surface, the existing tests, and how the data-import paths bound outbound URLs, for comparison.

- **Galaxy SHA**: `origin/dev` `65e6daff2334c8cfd4971682eecfb87f38a224be`. All `file:line` citations are anchored there. The request asked for `release_26.1`/`dev`. Only `dev` was read; the citation-related code on `release_26.1` differs only where the in-flight changes listed below apply.
- **In scope**: XML citation parsing and its profile rule, the `Citation` model, `Tool._parse_citations`, `managers/citations.py`, the citation endpoints and UI, agent/MCP and Tool Shed readers, `tool_util/biotools` and `tools/biotools.py`, `citation_cache_*` / `biotools_service_cache_*` config, tests.
- **Out of scope**: the YAML authoring models apart from `Citation` (see [[Component - User-Defined Tool Source Validation]]). The data-import fetch pipeline is summarized here only for comparison (see [[Component - Data Fetch]] and [[Component - DRS Support]]).

## 1. Pipeline at a glance

```
tool XML <citations>  ──XmlToolSource.parse_citations──►  list[Citation]  (pydantic, shape-validated)
                                                              │
                         Tool.__init__ → Tool._parse_citations │ (CitationsManager.parse_citation)
                                                              ▼
                                       tool.citations: [BibtexCitation | DoiCitation]   (no network)
                                                              │
   GET /api/tools/{id}/citations ─┐                           │
   GET /api/histories/{id}/citations ─► CitationsManager.citations_for_tool_ids → CitationCollection.add
                                                              │
                                    citation.to_dict("bibtex") → to_bibtex()
                                                              │  DoiCitation only, lazy, memoized per object
                                                              ▼
                                  DoiCache.get_bibtex(doi) → beaker cache "doi" → GET https://doi.org/{doi}
                                                              │
                     client getCitations() → citation-js Cite → CitationItem (v-sanitize-html)
```

Separately, while the tool is constructed: `expand_ontology_data` → `biotools_metadata_source.get_biotools_metadata(ref)` → git content dir and/or `GET https://bio.tools/api/tool/{ref}?format=json` (beaker cache), used only to backfill missing EDAM operations and topics.

## 2. Sources and the `Citation` model

### XML (`tool_util/parser/xml.py`)

- `XmlToolSource.parse_citations` (`xml.py:741-768`) iterates the children of `<citations>`. Each one goes through `parse_citation_elem` (`xml.py:1683-1695`), which ignores non-`citation` tags, asserts the element has text, strips it, and builds `Citation(type=<type attr>, content=<text>)`.
- **Profile rule**: an exception while parsing one citation (including pydantic validation errors from the model) is handled by profile. For `Version(profile) < Version("26.1")` it logs `"Tool '%s' has an invalid citation that will be skipped"` and drops that citation. For profile `>= 26.1` it re-raises, so the tool fails to load (`xml.py:752-764`).
- The linter applies the same split: `CitationsInvalid` reports an error at `CITATION_FATAL_PROFILE = parse_version("26.1")` and above, and a warning below it (`tool_util/linters/citations.py:17, 68-113`). Other citation linters: `CitationsMissing`, `CitationsNoText`, `CitationsFound`, `CitationsNoValid`.

### YAML (gap on `dev`)

- `ToolSource.parse_citations` defaults to `[]` (`parser/interface.py:421-423`). On `dev` only `XmlToolSource` overrides it. **`YamlToolSource` (`parser/yaml.py:79`) has no `parse_citations`**, so YAML tools, admin or user-defined, load with no citations.
- The YAML models still accept and validate them: `_DynamicToolSourceBase.citations: list[Citation] | None` (`tool_util_models/_models.py:159, 225-228`) is inherited by `UserToolSource` and the admin `YamlToolSource` model. Tracked in `vault/agents/gx_research/research_issues/yaml-tool-citations-dropped-at-load.md`.

### `Citation` (`tool_util_models/tool_source.py:223-278`)

- `extra="forbid"`, with fields `type: str` and `content: str`.
- `_check_citation_shape` (model validator, after):
  - Empty content raises `dynamic_tool.citation_empty`.
  - A leading `doi:` is stripped by `DOI_PREFIX_RE` (`^doi:\s*`, case-insensitive) and written back to `content`, so legacy tools still resolve (issue #22795, `test_legacy_doi_prefix_citation_is_normalized`).
  - `type == "doi"` must match `DOI_RE = ^10\.\d{4,9}/.+$`; otherwise it raises `dynamic_tool.citation_doi_invalid`.
  - `type == "bibtex"` must match `BIBTEX_RE = ^@[a-zA-Z]+\s*\{` (multiline); otherwise it raises `dynamic_tool.citation_bibtex_invalid`.
  - Any other type is accepted if the content looks like a DOI or BibTeX; otherwise it raises `dynamic_tool.citation_unrecognized`.
- `galaxy.util` separately defines `DOI_MAX_LENGTH = 200` (`util/__init__.py:198`) and `validate_doi` (`util/__init__.py:2298`). The `Citation` model uses neither.
- The same model feeds `ParsedTool.citations` (`_models.py:750-762`) through `parse_tool_custom` (`tool_util/model_factory.py:38, 64`). That is the Tool Shed 2.0 tool-centric API path; it never resolves DOIs.

## 3. Runtime objects (`managers/citations.py`)

- **Construction at tool load**: `Tool.__init__` sets `self.citations = self._parse_citations(tool_source)` (`tools/__init__.py:1695`). `_parse_citations` (`tools/__init__.py:1862-1871`) calls `tool_source.parse_citations()`. If `app.citations_manager` exists, it maps each model through `CitationsManager.parse_citation`. With no manager (some unit-test apps), the tool gets `[]`. No network access happens here.
- `parse_citation(model, manager)` (`citations.py:89-102`) looks the type up in `CITATION_CLASSES = {bibtex: BibtexCitation, doi: DoiCitation}` (`citations.py:183-186`). An unknown type logs a warning and returns `None`, so the citation is dropped. A constructor exception is re-raised as `Exception("Invalid citation of type ...")`. Lookup is by the raw `type` string. A citation the model accepted because its content looked right (for example `type="reference"`) is therefore dropped here.
- `BibtexCitation` (`citations.py:144-149`) stores `raw_bibtex = content`.
- `DoiCitation` (`citations.py:155-180`) stores the DOI and `doi_cache`, with `raw_bibtex = BIBTEX_UNSET`. **`to_bibtex()` is lazy.** The first call runs `doi_cache.get_bibtex(doi)` and memoizes the result on the object. On any exception it logs at debug level and returns a synthesized `@MISC{<doi>, DOI = {...}, note = {Failed to fetch BibTeX for DOI.}}` entry. A failure is not memoized, so the next call tries again.
- `BaseCitation.to_dict("bibtex")` returns `BibtexCitationResponse(content=self.to_bibtex())`. Any other format raises (`citations.py:126-131`).
- `CitationCollection.add` (`citations.py:105-123`) dedupes with `equals`. Two DOI citations are compared by `doi()` alone. Any other pair is compared by `to_bibtex()`, so a DOI citation compared against a BibTeX one resolves the DOI.
- `CitationsManager` (`citations.py:25-56`):
  - `__init__` builds `DoiCache(app.config)`.
  - `citations_for_tool_ids(tool_ids)` resolves each id with `_get_tool`. A missing tool appends a `CitationErrorResponse` (#22029 fixed the earlier `AttributeError`). Otherwise the tool's citations are added to one `CitationCollection`, and the method returns `(citations, errors)`.
  - `_get_tool` calls `app.toolbox.get_tool(tool_id)`, with no version, uuid or user, then `materialize_tool(tool, reason="serialization")`. It always resolves the default version of an id, and cannot find a user-defined tool that is only addressable by uuid and owner.

### `DoiCache`

- `DoiCache.__init__` (`citations.py:60-69`) builds beaker `CacheManager(**parse_cache_config_options({...}))` from the six `citation_cache_*` options, then `.get_cache("doi")`.
- `_raw_get_bibtex` (`citations.py:71-82`) calls `requests.get(f"https://doi.org/{doi}", headers={"Accept": "application/x-bibtex"}, timeout=DEFAULT_SOCKET_TIMEOUT)`. `DEFAULT_SOCKET_TIMEOUT` is 600 (`util/__init__.py:180`). It then runs `raise_for_status()`, forces `utf-8` when the response declares no encoding (#14876), and returns `res.text`. doi.org content negotiation returns BibTeX from the registrar.
- `get_bibtex` calls `self._cache.get(key=doi, createfunc=partial(_raw_get_bibtex, doi))`. Successful lookups persist in the beaker backend (file by default). Failures raise out of `createfunc` and are not stored.

## 4. Consumers

| Consumer | Location | What it does |
|---|---|---|
| Tool JSON for the form | `tools/__init__.py:3129` | `to_json` exposes only `"citations": bool(self.citations)`; content is fetched separately |
| Tool citations API (legacy route) | `webapps/galaxy/buildapp.py:279`; `api/tools.py:917-922` | `GET /api/tools/{id}/citations`, `@expose_api_anonymous_and_sessionless`. Returns `[BibtexCitationResponse...] + [CitationErrorResponse...]` as dicts. Resolves DOIs inside the request |
| History citations API (FastAPI) | `api/histories.py:451-460`; `services/histories.py:631-647` | `GET /api/histories/{history_id}/citations` → `list[CitationItem]`. Gathers distinct `job.tool_id` over `history.datasets` → `creating_job`, then `citations_for_tool_ids`. Ignores tool version. Resolves every DOI of every tool in the request |
| Response schema | `schema/citations.py` | `BibtexCitationResponse{format:"bibtex",content}`, `CitationErrorResponse{format:"error",error,tool_id}`, `CitationItem` discriminated on `format` |
| Tool form footer | `client/src/components/Tool/ToolCard.vue:280-287` → `ToolFooter.vue:161-170` | If `options.citations` is true, calls `getCitations("tools", id)` and renders `CitationItem`s under "References" (renamed in #19770) |
| History citations page | `client/src/entry/analysis/router.js:302-303` (`/histories/citations?id=`), linked from `History/HistoryOptions.vue:208` | `Citation/CitationsList.vue` (#20408). Prepends the instance `citation_bibtex` config entry; supports BibTeX download / copy |
| Client service | `client/src/components/Citation/services.ts` | `GET api/{source}/{id}/citations`. Collects `format=="error"` entries as warnings, parses the rest with citation-js `Cite` (`Citation/cite.js`, bibtex + csl plugins, no network) |
| Rendering | `Citation/CitationItem.vue:20-38` | Formats with citation-js, renders via `v-sanitize-html`, links `cite.data[0].URL` |
| Agent / MCP | `agents/operations.py:693-719`; `agents/history.py:107-109`; `webapps/galaxy/api/mcp.py:842-854` | `get_tool_citations(tool_id)` iterates `tool.citations` but reads attributes the objects don't have (`type`, `bibtex`, `url`; `doi` is a method). See `research_issues/agents-tool-citations-wrong-attributes.md`. Never calls `to_bibtex`, so no fetch |
| Tool Shed app | `tool_shed/webapp/app.py:89-90` | Registers `CitationsManager(self)` ("needed to load tools"). No shed code calls `to_bibtex`/`citations_for_tool_ids`; no fetch |
| Tool Shed 2.0 UI | `tool_shed/webapp/frontend/src/components/pages/ToolVersionPage.vue:50-52, 126-132` | Lists raw `ParsedTool.citations` `type`/`content` from the tool-centric API ([[PR 18524 - Add Tool-Centric APIs to Tool Shed 2.0]]); no DOI resolution |

The Markdown `instance_citation_link` / `instance_citation_bibtex` directives (`managers/markdown_util.py:213, 378, 828`) and the `citation_url` / `citation_bibtex` config keys cite Galaxy itself. They are not tool citations.

## 5. bio.tools metadata source

The Galaxy-agnostic layer is `tool_util/biotools/source.py`:

- `GitContentBiotoolsMetadataSource(content_directory)` (`source.py:18-31`) reads `<content_dir>/data/<ref>/<ref>.biotools.json` from a clone of `bio-tools/content` and returns `None` if the file is missing.
- `ApiBiotoolsMetadataSource(cache=None)` (`source.py:45-67`):
  - `_raw_get_metadata` calls `requests.get(f"https://bio.tools/api/tool/{ref}?format=json", timeout=DEFAULT_SOCKET_TIMEOUT)`, then `raise_for_status`, `encoding = apparent_encoding`, and returns `text`. On **any exception it returns `None`**.
  - `get_biotools_metadata` goes through `cache.get(key=ref, createfunc=...)` and JSON-parses the result into `BiotoolsEntry`.
- With no cache injected, it falls back to `InMemoryCache` (`source.py:34-42`), whose `backend` dict is a **class attribute**: process-wide and never evicted. It stores `None` results too, as the beaker cache does. A failed lookup is therefore cached, unlike `DoiCache`.
- `CascadingBiotoolsMetadataSource` (`source.py:70-86`) tries the git content first (if configured), then the API (if `use_api`). `get_biotools_metadata_source(config)` (`source.py:95-100`) builds it from a `BiotoolsMetadataSourceConfig` (`use_api`, `content_directory`, `cache`).

The Galaxy adapter is `tools/biotools.py:13-28`. `get_galaxy_biotools_metadata_source(config)` maps `biotools_content_directory`, `biotools_use_api`, and the six `biotools_service_cache_*` options into a beaker cache, and **reuses the namespace `"doi"`**. See `research_issues/biotools-cache-shares-doi-namespace.md`.

Wiring and use:

- The app builds it in `_configure_toolbox` (`app/__init__.py:416-417`) next to `citations_manager`.
- `Tool.__init__` calls `expand_ontology_data(tool_source, self.all_ids, app.biotools_metadata_source)` (`tools/__init__.py:1696-1705`).
- `expand_ontology_data` (`tool_util/ontologies/ontology_data.py:146-190`):
  1. Takes `xrefs`, injecting a legacy bio.tools xref from the bundled `biotools_mappings.tsv` if the tool has none.
  2. Applies the bundled EDAM operation and topic mappings.
  3. **Only when operations or topics are still empty**, calls `get_biotools_metadata(ref)` and fills them from `edam_info`.

  The API lookup is therefore **eager at tool load**, unlike the lazy DOI fetch, and only happens when `biotools_use_api: true` (default `false`).
- Other users:
  - The source-store populator (`tools/source_store/populator.py:980-991`) builds its own source for index entries.
  - The repository tool app passes `biotools_metadata_source` through (`tools/repositories.py:39-83`).
  - `remote_tool_eval` sets it to `None` (`tools/remote_tool_eval.py:71`).
  - The `BioToolsValid` linter constructs a fresh `ApiBiotoolsMetadataSource()` per xref (`tool_util/linters/general.py:257-267`), so linting calls bio.tools.
- API surface: tool JSON exposes `xrefs`, `edam_operations` and `edam_topics`. `test_legacy_biotools_xref_injection` (`lib/galaxy_test/api/test_tools.py:654`) covers the legacy xref.

## 6. Configuration

**Galaxy** (`config/schemas/config_schema.yml`):

- `biotools_content_directory` (1048), `biotools_use_api` (1055, default `false`), and `biotools_service_cache_{type,data_dir,lock_dir,url,table_name,schema_name}` (1063-1113). The defaults are `file`, `biotools/data` and `biotools/locks` (`path_resolves_to: cache_dir`), and `beaker_cache`.
- `citation_cache_{type,data_dir,lock_dir,url,table_name,schema_name}` (1115-1169). The defaults are `file`, `citations/data` and `citations/locks` under `cache_dir`, and `beaker_cache`.
- `DEPENDENT_CONFIG_DEFAULTS` (`config/__init__.py:166-170`) defaults both `citation_cache_url` and `biotools_service_cache_url` (and `mulled_resolution_cache_url`) to `database_connection`.
- So under `ext:database`, both caches land in the same table and the same `"doi"` namespace.

**Tool Shed**:

- `tool_shed_config_schema.yml:671-716` declares only the `citation_cache_*` set; there are no biotools options.
- `tool_shed/webapp/config.py:129-137` overrides data/lock dirs with `database/tool_shed_citations/{data,locks}`, which differs from the schema's `database/citations/{data,lock}`.
- `config.py:135` reads `citation_cache_url` from the **`citation_cache_lock_dir`** key. See `research_issues/tool-shed-citation-cache-url-reads-lock-dir.md`.

Adding an option means editing the schema(s), regenerating samples and docs (`config/sample/galaxy.yml.sample`, `tool_shed.yml.sample`, `doc/source/admin/galaxy_options.rst`), and, for the shed, handling the hand-written overrides in `config.py`.

## 7. Outbound URL bounding elsewhere (comparison)

The data-import and workflow-import paths share these helpers:

- `validate_non_local(uri, ip_allowlist)` (`files/uris.py:258`):
  - Ignores non-`http(s)` URIs.
  - Strips credentials and port, resolves the host with `getaddrinfo`, and rejects the URL if any resolved address is `is_private` and not in `ip_allowlist`.
  - Raises `RequestParameterInvalidException`.
- `validate_uri_access(uri, is_admin, ip_allowlist)` (`files/uris.py:235-244`) adds a `file://`-is-admin-only rule.
- `config.fetch_url_allowlist_ips = parse_allowlist_ips(listify(fetch_url_allowlist))` (`config/__init__.py:974`, `util/config_parsers.py:10`). `fetch_url_whitelist` is a deprecated alias (`config/__init__.py:710`). File sources receive it as `FileSourcePluginsConfig.fetch_url_allowlist` (`files/models.py:58-98`).
- Callers:
  - `/api/tools/fetch` URL sources: `services/_fetch_util.py:172`
  - Legacy upload paste: `tools/actions/upload_common.py:76`
  - History import from URI: `services/history_contents.py:619`
  - History archive import: `services/histories.py:294`
  - Workflow import by URL: `managers/workflows.py:2403`
  - Generic proxy: `api/proxy.py:200`
  - TRS: `TrsProxy.match_url` rejects `file://` and then calls `validate_non_local` (`workflow/trs_proxy.py:104-110`). `TrsTool._get` uses `requests.get(..., timeout=DEFAULT_SOCKET_TIMEOUT)` (`trs_proxy.py:159-161`).
- `stream_url_to_file` (`files/uris.py:81-107`) delegates to the matching file source's `realize_to`. For HTTP, `HTTPFilesSource._realize_to` (`files/sources/http.py:75-109`):
  - rejects unencoded characters,
  - streams with `stream=True` and `DEFAULT_SOCKET_TIMEOUT`,
  - **re-runs `validate_non_local` on the post-redirect URL**,
  - writes through `stream_to_path`.

  The CKAN and cBioPortal sources call `validate_non_local` per URL as well (`files/sources/ckan.py:244`, `cbioportal.py:241, 253`).

The citation and bio.tools lookups target fixed hosts (`doi.org`, `bio.tools`) with a plain `requests.get` and `DEFAULT_SOCKET_TIMEOUT`, and read the whole response. They don't go through the file-source layer. `galaxy.tool_util` is packaged separately from `galaxy.files` and doesn't import it, which is why the bio.tools source takes an injected cache. A shared fetch helper would have to live in `galaxy.util` or be injected.

## 8. Tests

| Test | Covers |
|---|---|
| `test/unit/app/managers/test_CitationsManager.py` | `DoiCache` with the file backend, `responses`-mocked `https://doi.org/{doi}`, non-ASCII body |
| `test/unit/app/managers/test_CitationsManager_db.py` | `MockDoiCache` with `ext:database` beaker; cache populated and cleared |
| `test/unit/app/tools/test_citations.py:20-41` | `parse_citation_elem` → `parse_citation` (BibTeX); `CitationCollection` dedupe |
| `test/unit/tool_util/test_parsing.py:1141-1167` | profile < 26.1 skips an invalid citation (`invalid_citation.xml`); 26.1 raises (`invalid_citation_26.1.xml`); `doi:` prefix normalized (`doi_prefixed_citation.xml`) |
| `test/unit/tool_util/test_tool_linters.py:1587-1647` | citation linters including the profile-dependent error/warn |
| `test/unit/tool_util/test_user_tool_source_validation.py` + `user_tool_source_validation_cases.yml:210-225` | `dynamic_tool.citation_doi_invalid` / `citation_bibtex_invalid` error codes and `loc` |
| `test/unit/tool_util/biotools/test_metadata_source.py` | git content source (offline); API and cascade sources against the live site (`skip_if_site_down`) |
| `test/unit/tool_util/test_ontologies.py:87`; `lib/galaxy_test/api/test_tools.py:654` | legacy bio.tools mapping / xref injection |
| `test/unit/tool_util/test_tool_linters.py:1835` | `BioToolsValid` linter against live bio.tools |
| `lib/galaxy_test/selenium/test_tool_form.py:436` (`test_bibtex_rendering`) | prefetches `GET tools/bibtex/citations`, asserts footer renders all references and that the DOI-resolved one contains the expected text (live doi.org) |
| `client/src/components/Citation/*.test.ts`, `Tool/ToolFooter.test.js` | client service / list / footer with mocked API |

Gaps: no API test calls `GET /api/tools/{id}/citations` or `GET /api/histories/{id}/citations` directly, apart from the Selenium prefetch. No test covers `get_tool_citations` (agent/MCP), DOI fetch failure (placeholder entry, no caching), or bio.tools caching behaviour.

## 9. In-flight changes (not on `dev` at this SHA)

The galaxy-brain branch records under `vault/repositories/galaxy/branches/active/` describe work against `release_26.1`:

- `yaml_tool_model_validation_26.1` adds a shared `ToolSource._parse_citation_list` (the XML profile rule, reused) and a YAML `parse_citations`, so YAML and user tools would load citations. That would make user-authored DOIs reach `DoiCache`.
- `citation_fetch_hardening_26.1` plans per-tool citation caps and a shared bounded-fetch helper for the DOI and bio.tools lookups.

Neither has merged to `dev` here. Sections 2-7 describe the current baseline.

## Related history

- #9757 Citations overhaul (2020). #15998 configurable citations export message. #14876 response encoding fix. #19770 "Citations" → "References" in the tool UI. #20408 citations page enhancements. #22029 `AttributeError` for missing tools → `CitationErrorResponse`. Commit `c1c09bcc84e` added the explicit `materialize_tool(..., reason="serialization")` in `_get_tool`.
