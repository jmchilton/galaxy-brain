# planemo #1782 — initial review (default profile)

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `2ffe63c3c57f39bf649ec4ac29b3ec1c334c20c7`
- PR: https://github.com/galaxyproject/planemo/pull/1782 (rplanel, base `master`)

## Summary

The CLI wiring fits planemo's existing patterns: `--security` sits in `lint_planemo_defined_tool_linters_options` next to `--urls` and `--doi`, the module is appended in `_lint_extra_modules`, `security` is in the known-skip list, and `cached_lint_result` is reused the way `urls.py` uses it. Locally, `pytest tests/test_planemo_linters.py -k ecurity` (49 passed) and `tests/test_lint.py -k security` (1 passed) pass, and flake8/black/isort are clean on the changed files. GitHub reports no CI checks for the PR branch, so CI hasn't run on it yet.

The main problems are in how the module models Galaxy's runtime. Two checks rest on a wrong claim about which values Galaxy sanitizes. The accessors that really do bypass sanitization go undetected. And several pieces of Galaxy and Cheetah are copied into planemo, where they have already drifted. I checked each claim against Galaxy `lib/galaxy/tools/{parameters/basic.py,wrappers.py,parameters/sanitize.py}` on a dev checkout from late October 2026, and ran a probe script with synthetic tool XML through `_security_checks`.

## Findings

### P1 1 — `SecurityDataColumn` / `SecurityGroupTag` assume these values are never sanitized, but Galaxy sanitizes them

The module says `data_column` and `group_tag` values are "never sanitized by Galaxy" (`_RAW_VALUE_PARAM_TYPES`). For any reference that reaches the shell, quoted or not, it emits "Value of … param '…' is not sanitized and reaches the command".

In Galaxy, `ColumnListParameter` (`data_column`) and `SelectTagParameter` (`group_tag`) both subclass `SelectToolParameter`. Neither overrides `to_param_dict_string`. `SelectToolParameter.to_param_dict_string` runs `self.sanitizer.sanitize_param(value)` or the default `sanitize_param(value)` unless the tool sets `options sanitize="false"`. `SelectToolParameterWrapper.__str__` calls that method, so `$col` and `'$col'` render sanitized: `'` becomes `__sq__`, `;` becomes `X`, and so on.

Effect: almost every tool with a column picker (`cut -f '$c'`, `-k '$column'`) gets an INFO finding with a false message. The fixture `security_data_column_group_tag.xml` and its test pin exactly this false positive: `--column '$columnvalue'` is safe. My probe confirms `cut -f '$c' '$d'` is flagged.

Fix: drop these two checks, or point them at the accessors that really are raw (P2 1). An unquoted `$col` is at most the same whitespace concern that `SecurityUnquotedParam` covers for text, so that check could be widened instead. The fixture and the exact-message tests need to change too.

### P2 1 — The accessors that bypass sanitization (`.value`, iterating a multiple select) aren't detected

The sibling path to the sanitizer checks is the set of template accessors that skip `to_param_dict_string` altogether:

- `InputValueWrapper.__getattr__` returns `getattr(self.value, key)`, and `self.value` is the raw value, so `$text.value` reaches the template unsanitized.
- `SelectToolParameterWrapper.value` is raw, and `__iter__` returns `self.value.__iter__()`, so `#for $v in $multi_select` yields raw values.

These are the common deliberate escape hatches in real wrappers. The module flags them only when they happen to be unquoted text references.

Probe results:

- `echo '$t.value'` (text) → no finding.
- `echo '$s.value'` (dynamic select) → no finding.
- `#for $v in $s:` / `echo '$v'` (multiple select) → no finding.

A single quote in a raw value escapes the quoting, so these are the injection cases the PR is about.

Fix: for parameters in `_SANITIZED_PARAM_TYPES` (and select subclasses such as `data_column` and `group_tag`), flag `$param.value` and loop variables bound by iterating a select, using the `raw_flow` classification that `SecurityRawIdentifier` uses, not `unquoted`.

### P2 2 — A restrictive `<sanitizer>` doesn't suppress `SecurityUnquotedParam`, though the message recommends one

`SecurityUnquotedParam` is suppressed only by an anchored safe-class regex validator (`_has_safe_validator`). It ignores the parameter's own `<sanitizer>`. A text param with `<sanitizer><valid initial="string.ascii_letters"/></sanitizer>` interpolated as `echo $t` is still reported, with "default sanitization still allows spaces, quote it or restrict the valid characters". Default sanitization doesn't apply to it, and restricting the valid characters is exactly what the author did.

Two mechanisms give the same guarantee, and they are handled inconsistently. The module already computes what survives (`_allowed_chars` / `_mapped_chars` in `_param_sanitizer_checks`).

Fix: skip the unquoted finding when the sanitizer's surviving characters (valid characters, mapping targets and `invalid_char`) are all within `SAFE_FILENAME_CHARS`. Add a test.

### P2 3 — Galaxy and Cheetah semantics are reimplemented in planemo instead of reused

Several pieces copy upstream code that planemo already depends on:

- `_parse_name_from_argument` duplicates `galaxy.tool_util.parser.util._parse_name`.
- `DEFAULT_VALID_CHARS` duplicates `galaxy.util.valid_chars`, from `galaxy-util`, which `galaxy.util.mapped_chars` is already imported from.
- `_CHEETAH_DIRECTIVE_NAMES` is a hand copy of `Cheetah.Parser.directiveNamesAndParsers`. Cheetah is installed through `galaxy-util[template]`, and the copy is already stale (P3 1).
- `_index_params` re-walks raw `<inputs>` XML (repeat, conditional, section, `argument` naming), and `_has_safe_validator` re-parses validator XML. galaxy-tool-util already provides parsed inputs and validators: `tool_source.parse_input_pages()`, `input_models_for_tool_source`, and parsed validator models.

`ToolParameterSanitizer` can't be imported, because it lives in galaxy-app (`galaxy/tools/parameters/sanitize.py`), so mirroring the sanitizer model is understandable. But P1 1 shows the cost of modelling Galaxy's wrapper and sanitization behaviour in another repository: it is already wrong in a way a Galaxy-side reviewer would likely have caught.

Fix: use the four existing helpers above. Optionally, as a design question: the sanitizer model and the "which accessors are raw" knowledge would be easier to keep correct in `galaxy.tool_util.linters`, beside the code it mirrors. galaxy-tool-util could then expose a sanitizer model to planemo, the Tool Shed and Galaxy's own lint.

### P3 1 — The copied directive table is stale: `#elif` inside a quoted span flips the quote state

The table is missing `elif`, `continue`, `except`, `finally`, `encoding`, `compiler`, `super`, `transform`, `shBang` and `@`, all present in Cheetah's `directiveNamesAndParsers`. Because `elif` is missing, the `"elif"` entry in `_CONDITION_DIRECTIVES` is dead code. `"call"` is listed twice.

Outside quotes, an unrecognised `#elif` line still ends up inert, because it is treated as a bash comment. Inside a quoted span, `_quoted_positions` treats the `#elif` line as literal text, so quotes in its condition toggle the quote state.

Probe: the template below reports `'$t'` as unquoted. The same template with `#if` in place of `#elif` reports nothing.

```
echo "a
#if $u == 'q'
c
#elif $u == 'x"'
b
#end if
" '$t'
```

Fix: build `_DIRECTIVE` from `Cheetah.Parser.directiveNamesAndParsers` instead of copying it.

### P3 2 — The recommended clean-later idiom is flagged at assignment, not at the sink

Raw-identifier and keys checks fire on `#set` and `#for` header lines, because non-condition directives keep `raw_flow` True. Two common idioms are therefore reported even though the value is cleaned before it reaches the shell:

- `#for $k in $coll.keys():` followed by `'$re.sub(r"[^\w.-]", "_", $k)'`
- `#set $x = $coll.element_identifier` followed by a cleaning `#set`

Probe: the keys loop with a cleaned body is still flagged. The module docstring recommends exactly this mitigation, so authors who follow it still get the finding.

Fix: either track the bound variable to its uses, as the loop-binding code already does for parameters, or say in the message that the finding fires where the value is read.

### P3 3 — An escaped `\$t` is treated as an interpolation

In Cheetah, `\$t` renders a literal `$t`, a shell variable, not the parameter. `echo \$t` is reported by `SecurityUnquotedParam`. Fix: skip `$` preceded by an unescaped backslash in `_reference_patterns` / `_find_reference`.

## Not raised

- **Dataset `.name` is deliberately not flagged on plain data inputs.** I checked this: `DatasetFilenameWrapper` wraps the dataset with `wrap_with_safe_string`, so `$input.name` is sanitized and the decision is correct.
- **Tool-wide `<options sanitize="false"/>` gets one tool-level finding, not one per parameter.** That seems reasonable.
- **The repeated per-class dispatch, the deferred `<configfile>` and `eval` sinks, and the stray `planemo.linters.util` autodoc entry** are all on the PR's "Known, not fixed" list, so I haven't relitigated them.
