# Component - Tool Command Templating and Parameter Sanitizers

Cover how a tool's `<command>` and configfiles become a shell string: Cheetah use (`galaxy.util.template`, `fill_template`, what CT3/`galaxy-util[template]` provide and which packages may import it), `ToolEvaluator.build_param_dict` / `wrap_values` / `__sanitize_param_dict` in `lib/galaxy/tools/evaluation.py`, the input wrappers and `safe_string` wrapping (`tools/wrappers.py`), and the sanitizer model (`ToolParameterSanitizer` parse from XML, valid characters, `<mapping>` and its token restore, `sanitize="false"`, per-parameter vs tool-level `<options sanitize>`, which values are never sanitized such as the user object and dataset names/metadata). Include where the sanitizer lives after the `tool_util.parser` move (or not) and which linters/validators read it. Leave out collection wrapper semantics (`Component - Collection Tool Execution Semantics`) and compute-environment path hooks (`tool_evaluation_compute_environment` request).

## Why

A static security analyser models exactly this pipeline (what characters a value can still hold when it reaches the command) and no note describes it; the only mentions are YAML-tool specific or about collection wrappers.

## Requested by

- vault/repositories/galaxy/branches/active/tool_security_static_findings/brain_research.md: needs the Cheetah, sanitizer and `build_param_dict` contract the static review mirrors, and the dependency boundaries for importing it from `galaxy.tool_util`.
- vault/repositories/galaxy/branches/active/stock_tools_review_clean/brain_research.md: needs to know which Cheetah namespace names and wrappers a stock tool command may use (output dataset wrappers, `varExists`/`getVar`, `__tool_directory__`) so the static review sees through them, and the sanitizer defaults it assumes.
- vault/repositories/galaxy/branches/active/stock_tools_review_clean/subagents/brain_research_functional_test_tools.md: needs to know what `$texttest.strip()` and similar method calls do to a sanitized value (`cheetah_casting`), which wrapper values (element identifiers, collection names, `directory_uri`) are never sanitized, and whether `shlex.quote` is available in the Cheetah namespace.
