# Plan: findings documentation backed by the spec

Acceptance criterion (John): human-readable documentation for the findings, treating the analyser as a black box, backed by declarative tests that feed into that documentation.

Branch `tool_security_findings_docs` off branch 1 (`tool_security_static_findings` at `590a784bd04`). The coordinator merges it into branch 1, and the commits are ported back to `tool_security_review_spec`.

## Design

- **`spec/finding_docs.yml`** holds one entry per finding code. The codes are the 36 rules (vulnerabilities and capabilities) and the 5 uncheckable codes. Each entry has:
  - prose: what the code means, the severity and why, and how a tool author fixes it;
  - `flagged`: case ids whose review reports the code;
  - `not_flagged`: case ids whose review does not;
  - `fixes`: pairs of a flagged `before` case and a clean `after` case, each with a short note.
- **It is a separate file, not new fields on `cases.yml`.** `cases.yml` keeps the verdicts and stays untouched apart from appended cases. The spec branch's `SpecCase` (red/green jobs, refusal codes) differs from branch 1's, and its `cases.yml` is being edited during phase 2. A separate file ports as a new file with no conflicts.
- **New synthetic spec tools and cases** cover the codes that have no case yet: most capabilities, `template-import`, `template-network`, `template-env`, `template-compile-exec`, `template-macro`, `tool-*` and `output-path`. They also add the clean `after` halves of the fix pairs.
  - They are appended as one block at the end of `cases.yml`.
  - They use only fields common to both branches (`findings`, `serious_rules`, `patterns`, `unchecked_locations`), and no `codes`.
- **`spec/finding_docs.py`** loads and validates the YAML. It then reviews each referenced case's tool through `review_tool_source` and `classify()`, using the analyser as a black box, and:
  - `doc_problems()` lists every claim the review does not bear out: a flagged case without the code, a not-flagged case with it, a fix whose before is clean or whose after is flagged, an unknown case id, and catalog codes with no entry or entries with no code;
  - `findings_markdown()` renders the page `doc/source/admin/tool_security_findings.md`. Each code gets its prose, the severities its flagged examples get, and its examples, each with the tool XML, the review's output (CLI-style lines) and, for a fix, a unified diff from before to after.
  - Only two functions depend on the branch's analyser API: the catalog (codes and their one-line descriptions) and the codes a report gives. They are kept together so the spec branch can swap them for its `codes.py`.
- **`test/unit/tool_util/security/test_finding_docs.py`** checks that `doc_problems()` is empty, that the committed page equals the generated one, and that the YAML is packaged.
- **Docs.** The new page goes into the admin toctree, and `tool_security_review.md` links to it from its hand-written Findings section. The generated spec section and `docs.py` are left unchanged, for the port.

## Out of scope

- Access patterns, which are already documented with their cases in the generated section.
- `uncheckable-review-failed` is documented in prose without an example, because a spec case always reviews.

## Commits

1. Spec tools and cases for the codes without one, plus the fix halves (cases.yml append, tools, MANIFEST.in).
2. The findings docs: `finding_docs.yml`, `finding_docs.py`, the test, the generated page, the toctree entry, the link and MANIFEST.in.
