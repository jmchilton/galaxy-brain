Supersedes #7937 (Matthias Bernt) and incorporates the hardening from bernt-matthias/galaxy#11 (Marius van den Beek), rebased onto current `dev`.

Tool authors commonly hand-roll `re.sub('[^\w\-\s]', '_', str($input.element_identifier))` to derive filenames from element identifiers. This adds a built-in template property:

```
ln -s '$input' '${input.safe_element_identifier}.${input.file_ext}'
```

- `galaxy.util.safe_filename_component`: a deterministic, non-empty, bounded, portable path component. Keeps `[A-Za-z0-9._-]`, replaces everything else with `_`, strips leading `.`/`-` and trailing `.`/space, and prefixes Windows reserved names (`CON`, `NUL`, `COM1`-`9`, ...).
- `filesystem_safe_string` gains opt-in `valid_chars`, `portable`, `strip_leading_hyphen` and `fallback` options that `safe_filename_component` builds on. Its defaults are unchanged, so existing staging paths are unaffected. Leading-dot stripping now runs after `invalid_chars` replacement, which only matters to a caller that passes `.` in `invalid_chars` (none in tree).
- `DatasetFilenameWrapper.safe_element_identifier` reserves room for `.file_ext` within 255 characters; `DatasetCollectionWrapper.safe_element_identifier` sanitizes the collection element name.
- Documented in `galaxy.xsd`, including that the result is not unique (`a/b` and `a:b` both become `a_b`) and still needs shell quoting.

## How to test the changes?
- [x] This is covered by unit tests (`test/unit/util/test_utils.py`, `test/unit/app/tools/test_wrappers.py`), the `identifier_*` functional test tools, and API tests in `test_tools.py` / `test_tool_execute.py`.

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the MIT license.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
