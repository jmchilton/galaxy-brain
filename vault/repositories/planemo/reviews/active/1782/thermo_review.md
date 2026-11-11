# Thermo-nuclear code quality review: planemo #1782

- Profile: thermo_review (`_shared/reviewers/thermo_review.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `2ffe63c3c57f39bf649ec4ac29b3ec1c334c20c7`
- Scope: structure, reuse and maintainability of `planemo/linters/security.py` (1023 lines, new) and its integration. The code was not run. Bugs noted below came up while reading; I did not go looking for them.

Not relitigated (from the PR's "Known, not fixed" list): the eight `Linter` subclasses with the same dispatch shape (#4), the deferred check families (#1), and the naming choices (#2, #3).

## Summary

The integration with planemo (option, `tool_lint.py`, the skip list in `lint.py`) is small and follows the existing pattern for extra modules. That part is fine. The module is the problem. It is one 1023-line file that does five jobs: a hand-written Cheetah/shell lexer, a loop-binding tracker, a copy of Galaxy's sanitizer model, a regex character-class analyser, and the checks themselves. The lexer makes three separate passes over the same text, and each pass re-derives the same comment, directive and word-boundary rules. Template references are resolved in two different ways depending on the check. The sanitizer logic copies Galaxy code instead of running it. A single region tokenizer plus a single reference list would remove most of the moving parts and bring the file well under 1k lines.

## Findings

### P2 1 — Three lexer passes over the command re-derive the same Cheetah/shell rules; collapse them into one region tokenizer

`_cheetah_comment_spans`, `_quoted_positions` and `_scan_command` each walk the command text character by character. Each one handles `##` line comments and `#* … *#` block comments again, with slightly different side effects: one records spans, one skips them without touching quote state, one marks two arrays. The word-boundary set `" \t\n;|&("` is written out three times (lines 384, 397, 443). `_DIRECTIVE.match` runs in both `_quoted_positions` and `_scan_command`, and `_apply_hash` runs it a third time on a position the caller has already matched. The output is three parallel per-character structures: `quoted: List[bool]`, `raw_flow: List[bool]`, and `unquoted: List[bool]` (plus `cleaning` spans). `_mark` exists only to keep the two boolean arrays in sync. The passes have an order dependency that the code only enforces through call order in `_command_checks`: quoted, then cleaning (which needs quoted), then scan (which needs both), with loops built on yet another comment model.

The many regression tests about comment and quote interactions (`..._cheetah_comments_inside_quotes_do_not_flip_quote_state`, `..._comment_apostrophe_keeps_shlex_quote_untrusted`, `..._directive_line_inside_quotes_does_not_flip_quote_state`, `..._midword_cheetah_comment_silences_its_line`, …) show the cost. Each one pins a case where the passes disagreed about what a `#` or a quote means.

Suggested reframing: one tokenizer pass that yields `Region(start, end, kind)` with a small enum. The kinds would be `CHEETAH_COMMENT`, `CONDITION_DIRECTIVE`, `OTHER_DIRECTIVE`, `BASH_COMMENT`, `QUOTED`, `UNQUOTED` and `CLEANED`, with cleaning-call spans folded in as the tokenizer meets them. `raw_flow(pos)` and `unquoted(pos)` become predicates on the kind of the region at `pos`. That deletes `_cheetah_comment_spans`, `_apply_hash`, `_mark`, the three boolean arrays and the duplicated comment and boundary logic. The rules for comments, directives and quotes then live in one place, so they can no longer disagree.

### P2 2 — Template references are resolved two different ways; extract placeholders once and make each check a filter

`_raw_flow_checks` works placeholder-first. It uses three near-identical regexes (`_RAW_IDENTIFIER`, `_COLLECTION_NAME`, `_COLLECTION_KEYS`, all built on the same `\$(?:\(|\{)?\s*\$?\s*([A-Za-z_][\w.]*)\s*\.\s*` prefix) and three copy-pasted loops, each doing "type check → `raw_flow` / `_in_spans(cleaning)` guard → emit". Its loop variables are resolved with `_loops_at` + `_resolve_loop_expr`.

`_param_usage_checks` works parameter-first. For every parameter, `_reference_patterns` builds two to four regexes per loop binding. `_find_reference` then runs each of them over the whole text once per loop scope, and filters the matches with `_scope_at(...) is scope`, a linear scan run for every match. That is the same question ("what does `$x.y` at this position refer to?") answered by a second mechanism. Applying the cleaning-span guard `_in_spans(match.start(), cleaning)` in five places is also redundant, because `_scan_command` already sets `raw_flow` and `unquoted` to False inside cleaning spans.

Suggested reframing: one pass that extracts every Cheetah placeholder as `Reference(pos, resolved_expr, attribute, region_kind)`, resolving loop variables once with the bindings in effect at `pos`. Each check then becomes a short filter over that list. For example, `raw_identifier` is `attribute == "element_identifier" and raw`, and `group_tag`/`data_column` is "the resolved parameter's type is in `_RAW_VALUE_PARAM_TYPES` and the reference is raw". That deletes `_reference_patterns`, `_find_reference`, the three attribute regexes and the per-scope re-scan, and both families of checks end up resolving references the same way.

### P2 3 — The sanitizer model copies `ToolParameterSanitizer` instead of reusing or upstreaming it, and has already drifted

`DEFAULT_VALID_CHARS`, `STRING_PRESET_ALIASES`, `MAPPING_PRESET`, `_preset_chars`, `_allowed_chars` and `_mapped_chars` reimplement `ToolParameterSanitizer.from_element` / `get_valid_by_name` / `get_mapping_by_name` from `lib/galaxy/tools/parameters/sanitize.py`. The "surviving characters" set comprehension then hand-simulates `ToolParameterSanitizer.sanitize_text`. Some of these already have canonical sources in planemo's dependencies: `DEFAULT_VALID_CHARS` is `galaxy.util.valid_chars`, and `_bool_value` stands in for `galaxy.util.string_as_bool`, which is what Galaxy uses for both `<sanitizer sanitize>` and `<options sanitize>`. The copy has drifted from Galaxy in small ways:

- `_preset_chars` only accepts `default` and `none` as the entire name. Galaxy splits on commas for those too, so `initial="default,string.digits"` resolves differently.
- `MAPPING_PRESET.get(name)` does not split comma-joined mapping presets, unlike `get_mapping_by_name`.
- `_bool_value` falls back to the default for an unrecognised value. `string_as_bool` treats anything that isn't true-ish as False, so for example `sanitize="disabled"` turns sanitization off in Galaxy but is read as on here. (XSD lint would also catch that value. I'm noting it only as evidence of drift.)

`ToolParameterSanitizer` lives in galaxy-app, which planemo does not depend on. It is pure, though: it imports only `string` and `galaxy.util`. The PR description's selling point ("Semantics aligned with Galaxy's `ToolParameterSanitizer`") is best met by moving that class into `galaxy.tool_util` (or `galaxy.util`) upstream and calling it. Then the whole permissive check reduces to:

```python
sanitizer = ToolParameterSanitizer.from_element(sanitizer_el)
surviving = set(sanitizer.sanitize_text(SHELL_DANGEROUS_CHARS)) & set(SHELL_DANGEROUS_CHARS)
```

Running the real sanitizer over the dangerous characters already covers valid characters, mapping targets and `invalid_char` in one step. That removes about 80 lines and the separate simulation comment. The `dangerous_invalid_char` message can stay if a distinct message is wanted. Until the upstream move lands, a local mirror class with `from_element` + `sanitize_text`, kept textually close to Galaxy's, is still better than the current set of free functions. Note that `galaxy.util.sanitize_text` is not a drop-in replacement: it drops its `invalid_character` argument before calling `_sanitize_text_helper`.

### P2 4 — 1023-line single module mixing five concerns; decompose into a package

This is a new file just over the 1k-line line, and it holds unrelated layers:

1. The Cheetah/shell lexer (`_quoted_positions`, `_scan_command`, `_apply_hash`, `_matching_paren`, `_matching_quote`, `_string_literals`, `_unescape_python`, the directive table).
2. The loop-binding tracker (`_LoopScope`, `_for_header`, `_loop_bindings`, `_scope_at`, `_loops_at`, `_resolve_loop_expr`).
3. The sanitizer model (see P2 3).
4. Regex character-class safety analysis (`_class_contents_safe`, `_range_safe`, `_escapes_only`, `_re_sub_whitelist`, `_has_safe_validator`).
5. The checks and the `Linter` classes.

Layers 1, 2 and 4 are generic "static Cheetah template" machinery that a later `<configfile>` check (deferred item #1) would want to reuse. Suggest `planemo/linters/security/` with `cheetah_scan.py` (lexer + loop bindings), `charsets.py` (regex-class safety), `sanitizer.py` (or nothing, after P2 3), and `__init__.py` holding the checks and linters. If P2 1–3 are adopted, the total shrinks a lot and a single file may become acceptable. Either way, the lexer should be its own module with its own focused tests, not tested only through end-to-end lint messages.

### P3 1 — Parameter indexing walks raw XML instead of the ToolSource input API

`_index_params` walks `inputs/param|repeat|conditional|section|when` by hand. `_parse_name_from_argument` copies `galaxy.tool_util.parser.util._parse_name`. `_param_is_sanitized` re-derives "is this a dynamic select" from `param_el.find("options")` / `dynamic_options`. `_has_safe_validator` reads `type`, `negate`, `expression` and the text off raw validator XML. The tool source already exposes all of this: `parse_input_pages().page_sources` → `parse_input_sources()` → `parse_name()`, `parse_input_type()`, `parse_sanitizer_elem()`, `parse_dynamic_options()`, `parse_validators()` (typed `RegexParameterValidatorModel` with `expression` / `negate`), and `parse_nested_inputs_source()` / `parse_when_input_sources()` for nesting. `_tool_sanitize_off` could use `tool_source.parse_sanitize()`, which also uses Galaxy's semantics: only the first `<options>` carrying the attribute counts. With the API, name derivation and nesting follow Galaxy by construction, and the `Any`-typed XML nodes give way to typed models.

### P3 2 — `_CHEETAH_DIRECTIVE_NAMES` is a hand copy of `Cheetah.Parser.directiveNamesAndParsers`

The comment on line 76 says the list comes from Cheetah's parser. It is a manual transcription, and it already contains `"call"` twice. Cheetah is already a dependency (`galaxy-util[template]`), and `Cheetah.Parser.directiveNamesAndParsers` is a module-level dict. Build `_DIRECTIVE` from its keys so the list cannot go stale. The longest-first ordering in the copy is also unnecessary, because the `(?![A-Za-z0-9_@-])` lookahead already prevents prefix matches.

### P3 3 — String-typed finding kinds form an untyped second naming layer

`emit("raw_collection_keys", …)` → `SecurityCheck.linter` (a `str`) → string comparison in `SecurityRawCollectionName.lint`. The nine internal kind strings and the eight class names are two parallel vocabularies, linked only by literals scattered across the file, and the `Emit = Callable[[str, str, str, Any], None]` alias hides which argument is the kind and which is the dedup key. This is separate from Known #4, which is about the repeated `lint` body. The suggestion here concerns the key, not the shape. Emit the owning `Linter` class (or its `name()`) directly, or at least type the kind as a `Literal[...]`. Then a typo or a renamed class fails type checking instead of silently dropping findings.

## Not raised

- The changes to `tool_lint.py`, `options.py` and `lint.py` follow the existing pattern for extra modules exactly. They add no new branching.
- Tests: the 40-odd inline-XML tests in `tests/test_planemo_linters.py` are mostly regression pins for lexer edge cases. P2 4 suggests moving them to direct tests of the lexer. I'm not filing that separately.
