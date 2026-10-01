Replace PlantUML with Mermaid in dev docs

Galaxy's three PlantUML diagrams, which show how tool state moves through job submission, were committed as SVGs, but no page embedded them. Regenerating them needed Java and a jar that `image.Makefile` downloaded from SourceForge.

This PR moves them into a new page, `doc/source/dev/tool_state.md`, added to the dev docs index, as Mermaid blocks rendered by `sphinxcontrib-mermaid`. That removes the Java dependency and the committed SVGs.

- **State representations:** the old class diagram had fallen behind `galaxy.tool_util.parameters.state`.
  - Three `state_representation` values were wrong: `relaxed_request`, `request_internal_dereferenced` and `test_case_xml`.
  - Four classes were missing: `LandingRequest*`, `JobRuntime` and `TestCaseJson`.

  - It also showed a `workflow_step → workflow_step_linked` "preprocess" conversion that doesn't exist.

  It's now a flowchart grouped by where each state is used: tool requests, jobs, tool tests, workflows and landing requests. Each arrow is labelled with the function that does the conversion: `strictify`, `decode`, `dereference`, `expand_meta_parameters_async`, `runtimeify`, `encode_test`, `to_workflow_step_state` and `landing_decode`. A short prose summary of each group follows. A class diagram with 12 subclasses of `ToolState` couldn't be read at page width.
- **Theme:** `conf.py` sets a `base` Mermaid theme with the client's brand colours (`blue.scss`). It also sets `fontFamily`, because otherwise labels inherit the theme's monospace `<pre>` font and get clipped. `mermaid_height = "auto"` sizes each diagram to its content rather than a fixed 500px box.
- **Job submission:** the jobs API and `queue_jobs` sequence diagrams are converted as they were. I checked their function and class names against the current code.
- **Removed:**
  - The PlantUML sources and SVGs, `image.Makefile`, `plantuml_options.txt`, `plantuml_style.txt`, and the `plantuml.jar` entry in `.gitignore`.
  - The `docs-slides-ready` / `docs-slides-export` Makefile targets, their variables and `scripts/slideshow/`. They built from `doc/source/slideshow`, which was removed in 2019.
- **Dependencies:** `sphinxcontrib-mermaid` is added to the `dev` group. Only its line was added to `dev-requirements.txt`, and all of its dependencies were already pinned there. The docs workflow already installs that file.

## Testing

I built the docs locally with Sphinx 9.1 and `GALAXY_DOCS_SKIP_SOURCE=1`. The new page produced no warnings and is linked from the dev index. I also checked in a browser that all three diagrams render without syntax errors, using Mermaid 11.12 from the extension's default CDN.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
