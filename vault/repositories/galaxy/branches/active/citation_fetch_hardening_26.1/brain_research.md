```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/yaml_tool_model_validation_26.1/scope_evaluation.md
    why: Traces the user-tool citation path (ToolForm -> ToolFooter -> api/tools.py citations -> CitationsManager._get_tool) and the history citations path; defines the Scope 2 lookup fix (uuid + user, tool_for_job) this branch unblocks.
    load_when: Deciding how user-tool citation resolution ties into the fetch hardening, and writing API tests for user-tool citations.
  - path: vault/repositories/galaxy/branches/active/yaml_tool_model_validation_26.1/implementation_debrief.md
    why: States the citation behavior that branch added (YAML citations load for both classes, XML profile rule shared via ToolSource._parse_citation_list) and the open scope decision.
    load_when: Coordinating commit order or rebases against that branch.
  - path: vault/repositories/galaxy/branches/active/yaml_tool_model_validation_26.1/baseline_refactor.md
    why: Records the ToolSource._parse_citation_list helper extraction; that helper is not on release_26.1, so a per-tool cap must be placed where both branches can merge.
    load_when: Choosing where the uniform citation count cap lives.
  - path: vault/research/Component - User-Defined Tool Source Validation.md
    why: Citation model (extra=forbid, shape validator) as part of the authoring contract; where a size/count limit could be enforced at model level.
    load_when: Adding a per-tool citation count or content size cap on the Citation/tool source models.
  - path: vault/research/PR 22615 - UserToolSource Pydantic Semantic Validation.md
    why: Section 3.5 documents the Citation shape validator (DOI_RE, BIBTEX_RE, error codes) added in the PR; any new limit should reuse its error-code pattern.
    load_when: Adding validation errors for over-cap or oversized citations.
  - path: vault/research/Component - Data Fetch.md
    why: How Galaxy validates outbound URLs today (fetch_url_allowlist_ips, validate_non_local) for the data import pipeline; reference for redirect handling and allowlist config.
    load_when: Wiring validate_non_local per redirect hop and reading the allowlist from config.
  - path: vault/research/Component - DRS Support.md
    why: Shows stream_url_to_file and the file-source fetch loop that already bound and validate downloads; candidate prior art for the shared cached-fetch helper.
    load_when: Designing the reusable bounded-fetch helper.
  - path: vault/research/Component - User-Defined Tools.md
    why: Trust split between admin GalaxyTool and unprivileged GalaxyUserTool and how dynamic tools load; explains why user-authored citations make fetch bounds matter.
    load_when: Reasoning about which tool sources reach CitationsManager.
  - path: vault/repositories/galaxy/branches/active/issue_24530_atomic_embedded_tool_import_26.1/brain_research.md
    why: Lists callers that create dynamic tools (embedded workflow tools, agents, API); each can carry citations through the same parse path.
    load_when: Auditing which entry points need the citation cap tests.
research_requests:
  - vault/agents/gx_research/todo/tool_citations_and_external_metadata_fetch.md
```

## Code observations (not in any note; verified at worktree HEAD f7f8c6935a2, release_26.1)

- Flow: `Tool._parse_citations` (`tools/__init__.py:1922`) builds `BibtexCitation`/`DoiCitation` objects at tool load via `app.citations_manager.parse_citation`; no fetch happens then. The DOI fetch is lazy in `DoiCitation.to_bibtex` (`managers/citations.py`), called from `to_dict("bibtex")` by `api/tools.py:812` (`GET /api/tools/{id}/citations`) and `services/histories.py:631-647` (history citations, loops every creating job's tool id). Also read in `agents/operations.py:648`. `Tool.to_json` only sets `"citations": bool(self.citations)` (line 3306).
- `DoiCache._raw_get_bibtex`: `requests.get("https://doi.org/{doi}", Accept bibtex, timeout=DEFAULT_SOCKET_TIMEOUT)` where `DEFAULT_SOCKET_TIMEOUT = 600` (`util/__init__.py:192`); DOI is interpolated unencoded, redirects followed by default, whole body read via `res.text`, no size cap; failures raise out of `beaker` `createfunc` so nothing is cached (every request retries); `DoiCitation.to_bibtex` catches and logs at debug, returns a placeholder entry. `CitationCollection.add` dedupes via `equals`, which for two DOI citations compares `doi()` (no fetch) but for mixed/bibtex compares `to_bibtex()` (a DOI citation vs a bibtex citation triggers a fetch just to dedupe).
- `ApiBiotoolsMetadataSource` (`tool_util/biotools/source.py`): same pattern, `requests.get(https://bio.tools/api/tool/{ref}?format=json, timeout=600)`, catches all exceptions and returns `None`; beaker cache `get(key, createfunc)` caches `None` too in-memory (`InMemoryCache`) but beaker file cache would pickle `None` as a value (verify in tests). `tools/biotools.py` builds its beaker cache with `get_cache("doi")`, the same namespace name as DoiCache (separate data_dir by default, so no collision unless configured to share).
- `tool_util` is Galaxy-agnostic and cannot import `galaxy.files` / config at module level (the biotools source takes an injected `cache`); the reusable fetch helper must live where both `galaxy.managers` and `galaxy.tool_util.biotools` can import it (`galaxy.util` is importable from `tool_util`; `validate_non_local` lives in `galaxy/files/uris.py`, so inject it as a callable or place the helper in `galaxy.util`).
- `validate_non_local(uri, ip_allowlist)` (`files/uris.py:107`): returns the URI unchanged for non-http(s), raises `RequestParameterInvalidException`; allowlist comes from `config.fetch_url_allowlist_ips` (`config/__init__.py:956`). Existing callers: `_fetch_util.py:167`, `upload_common.py:71`, `workflow/trs_proxy.py:100`. Nothing in the citations or biotools code uses it today.
- Tool Shed also constructs `CitationsManager(self)` (`tool_shed/webapp/app.py:91`) from `tool_shed/webapp/config.py`, which defines `citation_cache_*` by hand (lines 128-136) and has no `fetch_url_allowlist_ips`. New config options or a validate_non_local call must tolerate its absence (`getattr` default) or be added to `tool_shed_config_schema.yml` and the shed config class. Same file line 134 reads `citation_cache_url` from the `citation_cache_lock_dir` key (looks like an existing typo; not this branch's scope but worth mentioning to John).
- Config surface: `citation_cache_*` and `biotools_service_cache_*` in `config/schemas/config_schema.yml` (~989-1095), `config/__init__.py:169-170` (url defaults to `database_connection`), `tool_shed_config_schema.yml`, generated `config/sample/galaxy.yml.sample`, `tool_shed.yml.sample`, `doc/source/admin/galaxy_options.rst`. New options need schema + regenerated sample/docs (`make config-rebuild`) and a config-schema lint pass.
- XML citation rule on release_26.1 (`tool_util/parser/xml.py:740-767`): profile < 26.1 skips an invalid citation with a warning, >= 26.1 raises; `ToolSource._parse_citation_list` exists only on the yaml_tool_model_validation_26.1 branch. `Citation` model (`tool_util_models/tool_source.py:234`) has no length bound on `content`; `util.DOI_MAX_LENGTH = 200` and `validate_doi` exist (`util/__init__.py:210, 2231`) but `DOI_RE` in the model is `^10\.\d{4,9}/.+$` without a length cap.
- Existing tests: `test/unit/app/managers/test_CitationsManager.py` (`DoiCache` + `responses`), `test_CitationsManager_db.py` (ext:database beaker, `MockDoiCache`), `test/unit/app/tools/test_citations.py` (parse + `CitationCollection`), `test/unit/tool_util/biotools/test_metadata_source.py`, `test/unit/tool_util/test_parsing.py` (XML citation profile tests), `test/unit/tool_util/test_user_tool_source_validation.py`; Selenium `test_tool_form.py` and API citation tests in `lib/galaxy_test/api/test_tools.py` / `test_histories.py` (grep for "citation"). `responses` is the mocking library for outbound requests; it intercepts at `requests` level so a manual-redirect loop with `allow_redirects=False` is testable with `responses.add(..., status=302, headers={"Location": ...})`.
```
