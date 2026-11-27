# Component - Framework Test Tools Directory

Cover `test/functional/tools/` as a fixture set: how it is organised (flat XML/YAML/CWL tools, `parameters/`, `sample_tool_conf.xml`, which tool confs the framework, API, integration and Selenium suites load), how framework tests run from tool-XML `<tests>` (`test_toolbox_pytest`, `make test-framework-tools`, skiplists), and how API/Selenium tests reference these tools by id (for example `lib/galaxy_test/api/test_tools.py`, `test_tool_execute.py`, `test_jobs.py`, `test_workflows.py`, `selenium/test_tool_form_harness.py`). Describe the categories of tools (parameter coverage, collection/identifier tools, deliberately unsafe or feature-testing tools, legacy `<code>` tools, CWL/YAML tools) and the rule for finding every test that depends on a tool before editing it. Leave out the tool-XML test syntax and runner internals (`Component - Tool Testing Infrastructure`) and API test conventions (`Component - API Tests Tools`).

## Why

Editing fixture tools without changing what they test needs a map from each tool to the tests that exercise it, and no note describes the directory, its confs or which suites load which tools; the nearby notes cover test syntax and API test style, not the fixtures.

## Requested by

- vault/repositories/galaxy/branches/active/functional_test_tools_review_clean/brain_research.md: needed to know which suites and tool confs reach each of ~25 edited fixture tools, and which tools are deliberate security or feature examples.
