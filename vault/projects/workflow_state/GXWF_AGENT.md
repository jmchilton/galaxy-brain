
You're a senior software engineer in charge to producing interoperable Galaxy workflow abstractions across Python and TypeScript - across CLI and Web Operations - and in VS Code.

We are developing two parallel CLI's called gxwf - one Python and one TypeScript. They won't be identical but over time let's converge them. If user asks for ideas - this is a route to explore.

The Python backend is described in /Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/CURRENT_STATE.md and places in a Galaxy fork at /Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state. There is also important context in gxformat2 which powers a lot of lower-level functionality in the Python backend: /Users/jxc755/projects/worktrees/gxformat2/branch/abstraction_applications.

The TypeScript backend is in /Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models.

The CLI tooling for both backends produce comparable report models (in Pydantic and Effect respectively) and then pass the models through Jinja/Nunjucks templates to produce Markdown (and hopefully HTML in the future).

The Python docs are in doc/source/dev/wf_tooling.md and the TS CLI docs are in docs/packages/cli.md. If user asks for ideas - converging these docs is a route to explore.

There are server components with a shared Open API schema between Python and TypeScript. To sync the OpenAPI spec from Python to TS: run `make docs-openapi` in the Python gxwf-web repo, then `make sync-openapi` in the TS monorepo, then `pnpm codegen` in packages/gxwf-web to regenerate api-types.ts. Commit openapi.json and api-types.ts together.

The Python FastAPI project is a standalone repo at /Users/jxc755/projects/repositories/gxwf-web — it depends on the Galaxy Python package from the wf_tool_state worktree (installed into its venv). The TypeScript server is in packages/gxwf-web/ inside the galaxy-tool-util monorepo. Both backends should share an API — the contract lives at packages/gxwf-web/openapi.json. Changing API shapes (new params, new response fields) requires updating that file and regenerating packages/gxwf-web/src/generated/api-types.ts.

Report models live in two places and must be kept in sync:
- Python: lib/galaxy/tool_util/workflow_state/_report_models.py (plus roundtrip.py for SingleRoundTripReport)
- TypeScript: packages/schema/src/workflow/report-models.ts

 The Python FastAPI server (gxwf-web) serves the gxwf-ui Vue SPA in production mode. Both backends (Python and TypeScript) can serve the same built UI artifact from packages/gxwf-ui/dist/.

The shared SPA is packages/gxwf-ui/ (Vue 3 + PrimeVue). It consumes the typed OpenAPI client generated from openapi.json. The report display components (ValidationReport, LintReport, CleanReport, RoundtripReport, and their tree variants) live in packages/gxwf-report-shell/.

Report display components live in packages/gxwf-report-shell/ and are used by the web UI (gxwf-ui). CLI HTML output is planned via Nunjucks templates that consume the same report model JSON shapes; these are not yet implemented.

The declarative YAML-driven fixture tests are the source of truth and high value — the TS side has Makefile targets for syncing expectations and fixtures from the Galaxy Python code. Hand-written unit tests for individual internal functions are low-value and expendable. Don't confuse the two.

The TypeScript is meant in large part to feed into a VS Code Plugin we're developing in /Users/jxc755/projects/worktrees/galaxy-workflows-vscode/branch/wf_tool_state.

The clean operation intentionally exposes no key-level policy knobs (no allow/deny/preserve/strip lists). Users always get "clean everything." The Python clean.py has more machinery but the API and CLI surface should stay simple.






We're working /Users/jxc755/projects/repositories/galaxy-brain/vault/projects/workflow_state/VS_CODE_MONACO_FIRST_PASS_PLAN.md. We just did phase 0 but it seems wrong like more shim/mocking than I was expecting. We implemented https://github.com/jmchilton/galaxy-tool-util-ts/pull/52 in galaxy-tool-util and merged it into main (though still not published) - can you use that work to simplify what we have implemented here?