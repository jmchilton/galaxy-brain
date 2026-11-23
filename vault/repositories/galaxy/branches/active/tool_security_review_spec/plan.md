# Plan: declarative spec, codes and docs for the tool security review

Stacked on `mvdbeek/tool-security-review-on-load` at `37ae008d5db`.

## Shape

- `lib/galaxy/tool_util/security/spec/` (package data, shipped in galaxy-tool-util for Planemo and the Tool Shed):
  - `tools/*.xml`: small real tool XML files, one behaviour each.
  - `cases.yml`: cases keyed by id. Each has a `code`, a `tool`, optional static `review` expectations, and `red` / `green` job cases.
  - `__init__.py`: pydantic models of the spec and a loader (`importlib.resources`), plus a static runner that checks `review` expectations with `review_tool_source` alone (no app).
- A job case's context follows the `SourceRef` accessors: `inputs` (tool state; data inputs name datasets or collections), `datasets` (name, info, ext, content, metadata, tags), `collections` (type, name, elements), `user` (email, username, preferences), `config` (`mode`, `strict_when_unsure`), `evaluator` (`full` / `partial`), and `fault` (inject a failing review or check, for the codes only a bug can reach).
- Job runner in `lib/galaxy/app_unittest_utils/security_review_spec.py`: builds a real `Tool`, persists the model objects in MockApp's sqlite, runs the real `ToolEvaluator.set_compute_environment` + `build()`. With `harm: marker`, red cases also run the command built with the check off and assert the marker file appears; green cases with `harm` assert it doesn't.
- Codes in `lib/galaxy/tool_util/security/codes.py`: a `RefusalCode` enum with one-line docs. Value violations reuse the finding rule ids (`shell-injection`, `nested-interpreter`, `configfile-injection`, `stray-quote`). The free-text strict and refuse-all reasons get codes. `Violation` and `ToolInputRejected` carry them.
- Docs: `doc/source/admin/tool_security_review.md`, with a codes section generated from `codes.py` + `cases.yml`. A test keeps it current.

## Phases

1. Baseline tests: the spec package, runners and cases pinning current behaviour (rejected or not, message fragments, static findings). Passes on the base branch.
2. Codes: the enum, codes on `Violation` / `ToolInputRejected` / log lines, `code` expectations in every case, and a completeness test (every code has red and green cases).
3. Docs page, generated codes section, freshness test; packaging (`MANIFEST.in`).

## Tests

The spec cases are the tests. Unit runners: static (`test/unit/tool_util/security/test_spec.py`) and job (`test/unit/app/tools/test_security_review_spec.py`). Integration subset left for later.
