# 02 - Content Freshness Audit

Audited 2026-09-26 against `galaxyproject/galaxy` `origin/dev` @ `8cecbebdf98` (26.2.dev0). Local clone working tree is on `merge_26.1_into_dev`; path checks use `git ls-tree origin/dev`. Word counts exclude `notes/` and `plan/`.

## TL;DR
- **2026-researched topics are fresh**: file-sources, markdown, tests, and the new async/aiocop section of frameworks. Almost no broken paths.
- **GTN-migrated topics are stale**: startup is a 2016 Python 2.7 log dump. client/files/dependencies/principles still describe webpack, yarn, jest/qunit, symlinked `packages/`. frameworks and project-management keep 2021-era claims ("FastAPI required likely 21.09", `tox -e lint`, `tox -e mypy`).
- **Major changes the docs miss**:
  - Client: Vite+vitest (webpack removed 2025-12-02), pnpm (2026-01-12), `client/packages/api-client` (openapi-typescript), prebuilt `galaxy-web-client` wheel (`make install-client`).
  - **Namespace packages** (`dbfcdb8bc93`, Apr 2026): `lib/galaxy/app.py` → `app/__init__.py`, same for `structured_app`, `di`; `packages/*` pyproject/src layout, no `setup.cfg`/`galaxy/__init__.py`.
  - FastAPI routers live in `lib/galaxy/webapps/galaxy/api/` (74 files); `controllers/api/` gone.
  - Viz are npm packages (`@galaxyproject/*` via `client/visualizations.yml`), not Mako.
  - New subsystems: **AI agents/chat** (`lib/galaxy/agents`, pydantic-ai), **MCP server** mounted in `fast_app.py`, TUS routers, slowapi rate limiting, `ty` (`ty.toml`), markdown directive codegen (`make client-gen-markdown-directives`).
- **Overlap with existing Galaxy docs**: `doc/source/dev/` has writing_tests.md (source of the tests topic), api_guidelines, database_session_management, build_a_job_runner, collection_semantics, data_types. Absorb/link, don't duplicate. `doc/source/dev/index.rst` still links GTN architecture slides.
- **Biggest gap: no core execution-path topic.** Jobs, tool execution, workflow scheduling, object stores, data model only appear in image-only slides.

## Per-topic table
Staleness 1 = current, 5 = obsolete. Effort: S < 2h, M = half-day to 1 day, L = multi-day.

| Topic | Words | Last | Stale | Top issues (evidence) | Effort |
|---|---|---|---|---|---|
| startup | 2196 | 2026-02 (content ~2016) | **5** | 2016 log: `checkout master`, cp27 wheels, `lib/galaxy/model/migrate` (sqlalchemy-migrate, gone since 22.05), `lib/tool_shed/galaxy_install/migrate`, Paste :8080, `migrated_tools_conf.xml`, Trackster/Circster, `requests_common` controllers. 26 broken-path hits. | L rewrite (gravity/gunicorn/uvicorn, alembic, `app/__init__.py` init order, toolbox/search index, celery) |
| client | 2184 | 2026-02 | **4** | webpack slides/`config/webpack.config.js` (removed 2025-12); yarn targets (now pnpm; `client-watch` gone; `client-dev-server` = Vite HMR); jest/qunit paths missing (now `vitest.config.mts`, `client/tests/vitest/`); vuejs.org/v2 link; "Future components" GAlert/GCollapse/GTabs **already exist**; nothing on api-client/openapi-typescript or Vue 2.7 (`vue ^2.7.16`, `@vitejs/plugin-vue2`). Component-library half fine. | M |
| files | 1075 | 2025-11 | **4** | `client/src/bundleEntries.js`, `client/webpack.config.js`, `client/tests/jest` missing; `packages/tool_util/{setup.cfg,galaxy/__init__.py,galaxy/tool_util}` missing; "directory symlinks" outdated; `CITATION` → `CITATION.cff`; tox.ini described as lint entry point. Mindmap SVGs generated from these fragments, so also stale. | M |
| dependencies | 313 | 2026-02 | **4** | `script/common_startup.sh` (typo → `scripts/`); describes virtualenv+pip; script now prefers `uv venv`, conda fallback, `pinned-*.txt`, `GALAXY_WHEELS_INDEX_URL`. No pnpm. Too thin to stand alone. | S (merge) |
| principles | 667 | 2025-11 | 3 | "Built with webpack"; MySQL "sort of". Ideas timeless. | S |
| production | 587 | 2026-02 | 3 | Admin content; "gunicorn production-grade ASGI"; old usegalaxy.org diagrams; no TPV/Pulsar/celery. | S-M |
| frameworks | 3842 | 2026-05 | 3 (split) | Async/aiocop current. Old half: `webapps/galaxy/controllers/api/` (dead → `api/`); roles example uses pydantic v1 `__root__`/`RoleManager`/`List[]` (current uses `RolesService`, `RoleListResponse`); "WSGI API controllers until 21.09"; "favor uWSGI"; fast_factory/initialize_fast_app snippets pre-MCP/TUS/limiter/a2wsgi; fastapi-utils link. | M |
| dependency-injection | 2715 | 2026-02 | 2 | Concepts accurate (`DatasetCollectionManager` injected, `depends()` in `api/__init__.py`). Metadata `app.py`/`structured_app.py` broken. Celery slide shows `magic_bind_to_container` in tasks.py, replaced by magic partial in 2022 (`98019394223`). "Python 2" diagram framing. | S |
| tasks | 1333 | 2025-11 | 3 | `galaxy_task` + pydantic serialization valid. "Future Work" cites 2021 #11721 (tool requests/celery submission since landed). 2022 gravity output, external cloudfront image. PR stories read like release notes. No beat, queues (`galaxy.internal`/`external`), pebble pool. | M |
| application-components | 1492 | 2026-01 | 2 | Alembic text correct. Mostly image-only slides (models/HDA/workflow/libraries), diagrams unaudited. Services slide thin (`webapps/galaxy/services/` exists). | M (diagrams) |
| plugins | 1044 | 2026-02 | **4** | Viz = XML+Mako, `config/plugins/visualizations` examples (now npm); "DrammaJobRunner" typo; no TPV/job-conf YAML; `bit.ly/gcc21files`; Py2-style container-resolver code; jobs/objectstore coverage image-only. | M |
| markdown | 3298 | 2026-02 | 2 | Well researched. "Adding a Directive" likely stale (dev has `make client-gen-markdown-directives` generating reference/requirements/validator registry from directives.yml). Recheck "History Markdown (planned)". `NewDirective.vue` placeholder. | S |
| file-sources | 1890 | 2026-02 | 1 | 16/16 code paths valid; `mycloud.py` placeholder. | S |
| tests | 11365 | 2026-02 | 1-2 | Current (Playwright, vitest, populators). Metadata `client/tests/vitest/helpers.ts` → `.js`. **Duplicates `doc/source/dev/writing_tests.md`**. Far larger than any other topic. | S (dedupe decision) |
| project-management | 1046 | 2025-11 | **4** | `tox -e lint`/`tox -e mypy` gone (tox.ini only mako_count, check_indexes…; Makefile `mypy:`; `ty.toml`); `SECURITY_POLICY.md` → `SECURITY.md`; Gitpod; 21.01 types history; 25.1 release issue example. | S / drop |
| ecosystem | 1782 | 2025-11 | 3 | Link directory of external repos (starforge, cargo-port, tiaas2… some likely archived). Not Galaxy-repo architecture. | Drop / keep in GTN |

## Broken paths (origin/dev)
(P) = placeholder.
- **dependency-injection** (metadata): `lib/galaxy/app.py` → `app/__init__.py`; `lib/galaxy/structured_app.py` → `structured_app/__init__.py`.
- **frameworks**: `lib/galaxy/webapps/galaxy/controllers/api/`, `.../controllers/api/roles.py` → `webapps/galaxy/api/roles.py` (also in agent-context); `test/specs/main.html` (GTN leftover).
- **client**: `client/src/jest/jest.config.js`, `client/test/qunit/tests`, `client/test/jest/standalone/`, `config/webpack.config.js`, `client/docs/src/component-design/unit-testing`.
- **files**: `client/src/bundleEntries.js`, `client/webpack.config.js`, `client/tests/jest`, `packages/tool_util/setup.cfg`, `packages/tool_util/galaxy/__init__.py`, `packages/tool_util/galaxy/tool_util`, `CITATION`.
- **dependencies**: `script/common_startup.sh`.
- **project-management**: `SECURITY_POLICY.md`.
- **startup**: `config/{migrated_tools_conf,shed_tool_conf,shed_tool_data_table_conf,shed_data_manager_conf}.xml`, `lib/galaxy/model/migrate/**`, `lib/tool_shed/galaxy_install/migrate/**`, 5 cp27 wheels.
- **tests**: `client/tests/vitest/helpers.ts` (→ `.js`), `test/helpers` (P), `test/functional/tools/some_tool.xml` (P).
- **markdown**: `Elements/NewDirective.vue` (P).
- **file-sources**: `lib/galaxy/files/sources/mycloud.py` (P).
- **ecosystem/plugins**: `test/main`, `test/dev/data_types.html` (GTN Jekyll links).
- Not checked: paths inside `images/*.plantuml`/mermaid sources and PNG screenshots. Needs separate diagram audit; many slides are image-only.

## Missing topics (prioritized for new devs)
1. **Jobs & tool execution**: ToolAction → Job → handler/JobWrapper → runners → job_execution → metadata → finish; job conf YAML, TPV, Pulsar, job cache, tool requests. Link `build_a_job_runner`.
2. **Data model & DB access**: SQLAlchemy 2.0 models, `galaxy_scoped_session`, HDA/HDCA/Dataset/LDDA, alembic. Link `database_session_management`.
3. **API layer & schema**: `webapps/galaxy/api` + services + `galaxy.schema` → OpenAPI → `client/packages/api-client` (`make update-client-api-schema`). Link api_guidelines. Could absorb old half of frameworks.
4. **Workflows**: modules, scheduling manager/invocations, refactor, gxformat2, subworkflows.
5. **Object stores & storage**: hierarchical/distributed/S3/irods, user-selectable storage, quotas, short_term_storage, cleanup.
6. **Tools & tool-state models**: `tool_util`, `tool_util_models`, parameter models, toolbox/search, user-defined tools.
7. **Datatypes & collections**: registry, sniffing, converters, metadata, collection semantics (doc exists).
8. **Auth/users/security**: sessions/API keys, OIDC/PSA, roles/permissions, id encoding, vault.
9. **AI agents / MCP** (beta): `lib/galaxy/agents`, `/api/ai`, `/api/chat`, MCP mount.
10. **Tool Shed & installs.**
11. **Client app architecture**: router, Pinia, api-client usage, composables, Vue 2.7 → 3 plan.
12. Lower: notifications, interactive tools, viz framework (npm), model stores/RO-Crate export, config schema pipeline, carbon emissions, webhooks/tours.

## Merge / drop
- **Drop from Galaxy dev docs**: ecosystem (keep in GTN/hub), production (admin docs cover it), project-management (CONTRIBUTING/`doc/source/project` cover it).
- **Merge**: dependencies + files + client-build half + lint → "Repository layout & dev environment" (uv/pnpm/Vite/namespace packages).
- **Split**: frameworks → request path + async rules; API/pydantic part → new API topic.
- **Dedupe**: tests vs `doc/source/dev/writing_tests.md`.
- **Rewrite**: startup as narrative "what happens at boot".

## Suggested refresh order
1. Quick path fixes (≤1h): DI metadata, frameworks controller path, tests helpers.js, SECURITY.md, CITATION.cff, `scripts/` typo, DRMAA, remove client "Future components".
2. client + files + dependencies → dev-environment topic.
3. frameworks old half + new API-layer topic.
4. plugins (viz npm, TPV), then new jobs/tool-execution topic.
5. startup rewrite.
6. tasks refresh, then DI celery slide.
7. New topics: data model → workflows → object stores → tools → datatypes/collections.
8. Diagram audit (`images/`).
9. Decide ecosystem/production/project-management + tests dedupe before migration.

## Method / limits
- Paths checked with `git ls-tree origin/dev`. Claims spot-checked in Makefile, client/package.json, vitest.config.mts, fast_app.py, api/roles.py, celery/tasks.py, common_startup.sh, pinned-requirements.txt, tox.ini.
- Tmp volume filled (ENOSPC) partway through; later checks were working-tree only (`merge_26.1_into_dev`). Recheck against dev: History Markdown status; which WSGI API routes remain in buildapp.py; which old viz dirs remain in `config/plugins/visualizations`; whether ecosystem repos are archived.
