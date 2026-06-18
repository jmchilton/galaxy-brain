# Galaxy Reuse Opportunities Beyond Tool Loading

Date: 2026-06-15

## Thesis

The strongest direction is not "delete every local abstraction." It is to put Galaxy semantics in Galaxy or `galaxy-tool-util`, and put editor/codemod-specific precision behind reusable APIs that Galaxy-adjacent projects can share.

`galaxy-tool-refactor` already demonstrates both halves: it correctly binds Galaxy for hard semantic boundaries like macro expansion and test-validation linters, but it also builds useful codemod/editor abstractions that Galaxy, Planemo, and the Galaxy Language Server could benefit from.

## 1. Profile Upgrade Advice

Current project code:

- `galaxy-tool-codemod/src/galaxy_tool_codemod/profile_semantics.py`
- Galaxy source mirrored from `galaxy/tool_util/upgrade/__init__.py` and `upgrade_codes.json`

The project vendors Galaxy's profile-upgrade catalogue and ports the advisor detectors locally. That creates obvious drift risk because this is runtime behavior policy, not merely XML syntax.

This is also where the project found value that belongs upstream. Its notes call out Galaxy advisor bugs or rough edges:

- `17_09` checks an attribute name with backticks.
- `21_09` adds an empty advice code instead of `21_09_fix_from_work_dir_whitespace`.
- `23_0` scans the wrong path for text parameters.
- `20_09_consider_set_e` over-flags single simple commands that are unaffected by `set -e`.
- Raw-tree detection missed or over-reported macro-supplied behavior; the project measured roughly 984 raw-tree over-flags for `16_04_exit_code` and roughly 317 under-reports for other codes.

Best shape:

- Galaxy exposes a public upgrade-advice API over `ToolSource` or an lxml root.
- The project consumes that API instead of mirroring the catalogue.
- The project's bug fixes, macro-expanded detection policy, and `set -e` tightening are proposed upstream.

Benefit:

- Project: no vendored behavior catalogue, less drift.
- Galaxy/Planemo: more accurate profile-upgrade advice for every tool author.

## 2. Test-Case Validation

Current project code:

- `galaxy-tool-codemod/src/galaxy_tool_codemod/test_case_check.py`
- `galaxy-tool-lint/src/galaxy_tool_lint/checks/test_validation.py`
- Galaxy source: `galaxy.tool_util.parameters.case.validate_test_cases_for_tool_source` and `galaxy.tool_util.linters.tests`

This is a good example of the right boundary. The full test-validation linters are bound to Galaxy's own linters behind an optional extra, because the pydantic parameter/assertion models are richer than the XSD and not soundly reimplementable.

The local one-directional checker is still valuable: it proves when tests are clean without running the full Galaxy model-generation path. The project documents a large payoff: among 6,648 test-shipping tools, 4,517 were clean and needlessly stopped by a coarse "has tests" blocker, 1,972 were true blockers, and 159 crashed Galaxy's own parser.

Best shape:

- Keep full validation in Galaxy.
- Upstream a fast "provably clean" preflight or advisory helper, clearly one-directional.
- Let project codemods use that helper and fall back to Galaxy's full validator for certification.

Benefit:

- Project: less local model logic and stronger certification.
- Galaxy/Planemo: faster, more precise profile-upgrade advice and test linting.

## 3. Planemo/Galaxy Linters

Current project code:

- `galaxy-tool-lint/src/galaxy_tool_lint/checks/*`
- `galaxy-tool-lint/src/galaxy_tool_lint/detect.py`
- Galaxy source: `galaxy.tool_util.lint` and `galaxy.tool_util.linters.*`

The project has reimplemented or wrapped a large portion of Planemo/Galaxy lint behavior and mapped rules back to Planemo linter names. That mapping is valuable, but message-level lint APIs are the wrong long-term integration surface.

Best shape:

- Galaxy linters return structured diagnostics: stable code, severity, source element, message, and optional fix metadata.
- Planemo and `galaxy-tool-refactor` consume the same structured diagnostics.
- Project codemods declare which Galaxy diagnostic they fix.

Benefit:

- Project: fewer local duplicate checks.
- Galaxy/Planemo: access to the project's rule metadata, fixability mapping, and codemod pathways.

## 4. Datatype Registry Checks

Current project code:

- `galaxy-tool-lint/src/galaxy_tool_lint/checks/datatypes.py`
- `galaxy-tool-codemod/src/galaxy_tool_codemod/datatype_format.py`
- Galaxy source: `galaxy.tool_util.linters.datatypes`

The project vendors Galaxy's bundled `datatypes_conf.xml.sample` because Galaxy's linter checks against that bundled sample, not against a live registry. That is a defensible snapshot, but it is still a snapshot.

Best shape:

- Galaxy exposes a small helper for "the datatype extension set used by the bundled linter."
- The project consumes that helper when Galaxy is available and keeps a drift-guarded snapshot only for dependency-light installs.
- The datatype normalization rules for profile upgrades live close to the schema/profile transition that introduced them.

Benefit:

- Project: fewer vendored data files and clearer dependency story.
- Galaxy/Planemo: reusable, explicit datatype-linter semantics instead of private helper logic.

## 5. Cheetah References and Rename

Current project code:

- `galaxy-tool-source/src/galaxy_tool_source/cheetah_cdm.py`
- `galaxy-tool-source/src/galaxy_tool_source/cheetah_refs.py`
- `galaxy-tool-source/src/galaxy_tool_source/cheetah_rename.py`
- `docs/upgrade_research/lsp_rename_integration.md`

This is one of the strongest "vice versa" cases. Galaxy owns Cheetah execution semantics through CT3, but it does not expose a general source-span reference model for Galaxy tool XML.

The project built that model: faithful Cheetah spans, parameter references across command/config/output/test sections, atomic rename, minimal edit plans, macro-file rename support, and shared-macro safety gates. The Galaxy Language Server integration design already shows this is useful upstream.

Best shape:

- Host a reusable Cheetah reference/index API in `galaxy-tool-util` or a small Galaxy-adjacent package.
- Reuse Galaxy's CT3 dependency and tool-loading/macro graph.
- Let GLS, Planemo, and codemods share reference lookup, rename, and prepare-rename safety logic.

Benefit:

- Project: less burden maintaining the complete list of templated sections and cross-reference attributes.
- Galaxy/GLS/Planemo: real find-references and rename semantics instead of XML-only heuristics.

## 6. Command/Shell Static Analysis

Current project code:

- `galaxy-tool-source/src/galaxy_tool_source/command_text.py`
- `galaxy-tool-source/src/galaxy_tool_source/shell_oracle.py`
- `galaxy-tool-codemod/src/galaxy_tool_codemod/codemods/single_quote_command_vars.py`
- Galaxy source: `XmlToolSource.parse_command()`, `parse_strict_shell()`, and command/stdout/stderr parsing in `galaxy.tool_util.parser.xml`

Galaxy knows how a command will be executed, but the project adds static source analysis for whether a Cheetah variable is an actual unquoted shell argument and whether quoting it is behavior-preserving.

The same logic improved profile advice: the project measured that 1,915 command-bearing tools, about 20.6% of the no-`strict` population, were single simple commands where `set -e` cannot change behavior.

Best shape:

- Galaxy exposes command policy helpers: strict-shell default by profile, command text extraction, and error-handling defaults.
- The project contributes static classifiers for unquoted Cheetah variables, safe quoting, and conservative `set -e` risk.
- Optional shell parsers stay optional because of licensing/dependency weight.

Benefit:

- Project: less duplicated runtime-command policy.
- Galaxy/Planemo/IUC: better lint and upgrade advice for command safety.

## 7. RST Help Repair and Markdown Conversion

Current project code:

- `galaxy-tool-source/src/galaxy_tool_source/rst.py`
- `galaxy-tool-source/src/galaxy_tool_source/rst_markdown.py`
- `galaxy-tool-codemod/src/galaxy_tool_codemod/codemods/repair_help_rst.py`
- Galaxy source: `galaxy.util.rst_to_html` and `galaxy.tool_util.linters.help`

The project correctly treats Galaxy's renderer as the semantic authority: RST validity mirrors `galaxy.util.rst_to_html(error=True)`.

The useful local abstraction is the repair/conversion gate: surgical line edits for known RST errors, doctree-preserving repair checks, and RST-to-CommonMark conversion accepted only when Galaxy-style RST rendering and client-style Markdown rendering are semantically equivalent.

Best shape:

- Galaxy/Planemo expose invalid-RST diagnostics with line and error class.
- The project contributes safe repair recipes and render-equivalence gates.
- GLS can surface those as quick fixes.

Benefit:

- Project: fewer private renderer mirrors.
- Galaxy/Planemo/GLS: actionable help repairs instead of only lint failures.

## 8. Formatting, CDATA, and Lossless Edits

Current project code:

- `galaxy-tool-fmt/src/galaxy_tool_fmt/*`
- `galaxy-tool-codemod/src/galaxy_tool_codemod/cursor.py`
- `galaxy-tool-fmt/src/galaxy_tool_fmt/serializer.py`
- Galaxy source: `galaxy.tool_util.format.format_xml`

Galaxy's formatter is intentionally simple: parse with lxml, indent, serialize. That is useful, but it is not enough for semantic codemods where CDATA, mixed content, comments, macro placement, and attribute ordering matter.

The project has more of the right machinery: cursor-level mutations, CDATA-aware text setting, mixed-content guards, safe tail/text handling, and rule metadata.

Best shape:

- Galaxy's formatter grows hooks for lossless-preserving parse/serialize policy and rule metadata.
- The project upstreams CDATA/mixed-content safety lessons.
- `galaxy-tool-refactor` uses Galaxy's formatting substrate once it can preserve codemod invariants.

Benefit:

- Project: less custom XML mutation framework over time.
- Galaxy/Planemo/GLS: a formatter that can support quick fixes and codemods, not only indentation.

## 9. Macro Import Graph and Shared-Macro Ownership

Current project code:

- `galaxy-tool-source/src/galaxy_tool_source/macros.py`
- `galaxy-tool-source/src/galaxy_tool_source/bundle.py`
- Registry and CLI macro-profile/rename paths
- Galaxy source: `galaxy.util.xml_macros`

Tool loading already covered macro expansion, but the import graph itself deserves separate treatment. The project needs transitive imports, token ownership, top-level expansion classification, macro bundles, and shared-macro gates.

Best shape:

- Galaxy exposes import graph and macro ownership primitives alongside macro expansion.
- Project-specific policy remains local: whether to refuse, widen, or prompt for shared-macro edits.
- GLS can cache a reverse-import map for rename and diagnostics.

Benefit:

- Project: less local macro graph walking.
- Galaxy/GLS/Planemo: safer macro-aware refactors and diagnostics.

## Recommendation

The best near-term upstream targets are:

1. Lossless raw loader and macro import graph.
2. Structured profile-upgrade advice API.
3. Structured linter diagnostics with stable codes and optional fix metadata.
4. Cheetah reference/rename model for GLS and Planemo.
5. Fast provably-clean test-case helper backed by Galaxy's full validator.

The principle is the same as the loading benchmark: when the abstraction encodes Galaxy runtime behavior, it should live upstream; when this project proves a codemod/editor abstraction that Galaxy lacks, upstreaming it makes the ecosystem stronger and lets this project delete local semantic copies.

