Run via Claude Opus at high effort.

I acted on the codec findings. Encoding and parsing now share one regex character class for "what a backslash escapes", which removes two hand-written character scanners (about 25 lines net). I also flattened `_option_to_form_str`, made the `OptionChars` alias private, and fixed the precedence comment in `step_state_to_tool_state`, which overstated "connections stay first". A differential test against the previous implementation matched on ~311k inputs, including Unicode whitespace. Re `\s`, a sweep confirmed it agrees with `str.isspace` on every code point. The architecture held up: modules.py shrinks, the new helpers sit in the existing workflow parameter definitions module (257 → ~345 lines), and no file approaches 1k lines because of this branch.

Not acted on:

- **The precedence rules in `step_state_to_tool_state` form a cycle.** Connections beat restrictions, restrictions beat suggestions, and suggestions beat connections. Making it a clean order (connections > restrictions > suggestions) would change how existing suggestions-plus-connections workflows load on a stable branch. The cycle comes from legacy behaviour that the re-scope deliberately kept. I fixed the comment so it states the cycle honestly rather than restructuring it.
- **The codec could live in its own module.** The existing module already owns the editor-form ↔ persisted conversions for workflow parameter definitions (validators, bounds). A separate module would add a file without removing a concept.
- **A structured editor (a list of value/label rows instead of a string) would delete the escape grammar entirely.** That is the real code-judo move, but it needs client and form-model changes. It's dev work, as the scope evaluation already recorded.
- **The `(char, escaped)` pair representation plus the generic `_split_option_chars(maxsplit=...)`.** I considered a single-pass state machine. It reads no simpler, and the pair model is what makes "strip only unescaped whitespace" and "split only on unescaped separators" one rule each.
- **`_EMPTY_OPTION_FORM_STR` used once.** I kept it because the name documents the encoding.

<details>

## Full review

### 1. Missed simplification: the escape rule was written twice by hand (acted on)

`_escape_option_part` and `_option_chars` each reimplemented "a backslash escapes the next character iff it is `\`, `,`, `:` or whitespace" (`_OPTION_STRING_ESCAPABLE` plus a separate `.isspace()` check, repeated). The encoder also escaped in two passes: per-character first, then index loops over the already-escaped list to escape whitespace at either end. That is the duplication that lets an encoder and decoder drift apart.

Remedy (done): one shared character class `_ESCAPABLE_CHAR = r"[\\,:\s]"`, used by:
- `_OPTION_CHAR = \\(ESC)|(.)` (DOTALL). `_option_chars` becomes a one-line comprehension over `finditer`.
- `_NEEDS_ESCAPE = [,:]|\\(?=ESC|\Z)|^\s+|\s+\Z`. `_escape_option_part` becomes a single `sub` call.

The grammar is now declared in one place, next to the prose comment describing it. Equivalence: an exhaustive check over a 10-symbol alphabet (ASCII and Unicode whitespace, `\x1c`, NBSP, em space, newline) up to length 5, plus 200k random strings and option lists through `parameter_options_to_form_str`, all identical to the previous implementation. A sweep over every code point confirmed `re` `\s` ≡ `str.isspace()`, so the whitespace semantics are unchanged.

### 2. Incidental control flow in `_option_to_form_str` (acted on)

The dict branch reassigned `option = value` and fell through to re-run `_option_text` on an already-converted string. Now it normalizes once to `(value, label)` and then has two returns.

### 3. Precedence in `step_state_to_tool_state` (comment fixed; structure kept)

```python
if restrictOnConnections and suggestions is None: onConnections
elif restrictions is not None: staticRestrictions
elif suggestions is not None: staticSuggestions
```

The `and suggestions is None` clause is a special case bolted onto the first branch. It encodes legacy "suggestions beat connections", and with "restrictions beat suggestions" and "connections beat restrictions" the rules form a cycle. With all three set, the result (static restrictions) depends on branch order rather than on a stated rule. The old comment claimed connections "stay first", which is false whenever suggestions are present. A transitive order would delete the special clause. But it changes how suggestions-plus-connections workflows open in the editor, and this targets release_26.1, where the re-scope kept that behaviour on purpose. The comment now describes the actual rules.

### 4. Layering and file size (no action)

- modules.py loses its two private string helpers (the nested `_string_to_parameter_def_option` closure and `_parameter_option_def_to_tool_form_str`) and gains only imports. That is a net improvement.
- The codec sits beside the validator/bounds form converters, which is the right home.
- The help text is a shared constant, so the restrictions and suggestions help strings can't drift apart.

### 5. Types (minor, partly acted on)

- `parameter_options_to_form_str(options: list[Any])` is loose, but honestly so: YAML imports can carry ints, floats and None, and the function normalizes them.
- `StaticParameterOption` is a reasonable return contract.
- `OptionChars` is renamed `_OptionChars` because it is module-internal.

### 6. Tests (no action)

The unit tests cover the grammar from three sides: parsing tables, exhaustive round-trips over the special alphabet, and literal editor strings. The API tests cover download and re-import.

`test_text_input_restrict_on_connections_kept_on_load`'s comment is accurate for its case (no suggestions). No suggestions-plus-connections test pins the legacy rule. I left that as a test-gap note rather than adding scope.

</details>
