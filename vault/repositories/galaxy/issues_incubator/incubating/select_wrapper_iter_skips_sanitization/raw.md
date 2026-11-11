# Raw: SelectToolParameterWrapper.__iter__ bypasses sanitization

Source: found while reviewing galaxyproject/planemo#1782 (opt-in `planemo lint --security`), round 0 review record `planemo/reviews/1782`. The review branch `pr_1782_round_0_rev_0` (jmchilton/planemo) adds a `SecurityRawParamValue` lint that flags exactly this loop pattern — that lint exists only because of this Galaxy behavior. Checked against galaxyproject/galaxy `origin/dev` @ `3d9ef3f34ea` (2026-11-11).

## The bug

`lib/galaxy/tools/wrappers.py`:

```python
class InputValueWrapper(ToolParameterValueWrapper):
    def __str__(self) -> str:
        to_param_dict_string = self.input.to_param_dict_string(self.value, self._other_values)
        ...
    def __iter__(self) -> Iterable[str]:
        to_param_dict_string = self.input.to_param_dict_string(self.value, self._other_values)
        if not isinstance(to_param_dict_string, list):
            return iter([to_param_dict_string])
        else:
            return iter(to_param_dict_string)        # sanitized

class SelectToolParameterWrapper(ToolParameterValueWrapper):
    def __str__(self) -> str:
        return str(self.input.to_param_dict_string(self.value, other_values=self._other_values))  # sanitized
    def __iter__(self) -> Iterable[str]:
        if not self.input.multiple:
            raise Exception("Tried to iterate over a non-multiple parameter.")
        return self.value.__iter__()                 # RAW
```

So in a `<command>`:

- `$sel` → sanitized (`SelectToolParameter.to_param_dict_string` runs `self.sanitizer.sanitize_param` or default `sanitize_param` when `tool.options.sanitize`, then joins with `separator`).
- `#for $v in $sel` → each `$v` is the raw stored value string, no sanitizer, regardless of `<sanitizer>` on the param.

`.value` being raw is the documented escape hatch and not part of this issue. Iteration is not an obvious escape hatch — tool authors reasonably expect `for v in $sel` to give the same values as `str($sel).split(separator)`.

`__iter__` has been `return self.value.__iter__()` since `d417e9b2393` (2018-07-24, "Flush out collection tag parameters a bit.") — it was added with group tag params, sanitization apparently not considered.

## Who's affected

`SelectToolParameterWrapper` wraps `select`, `data_column` (`ColumnListParameter`), `group_tag` (`SelectTagParameter`) and drill-down params (all subclass `SelectToolParameter`; `ColumnListParameter`/`SelectTagParameter` don't override `to_param_dict_string`). Exposure by option source:

- **`group_tag`** — values are `group:` tag values users set on datasets. User-controlled free text. Main exposure. Typical idiom: `#for $g in $groups` over a multiple `group_tag` to build per-group args.
- **Dynamic selects** (`from_dataset`, `from_data_table`, `from_file`, filters on dataset metadata) — values can come from user dataset content/metadata.
- **`data_column`** — values are column indices/names; names can come from dataset header metadata.
- Static `<option>` selects — author-controlled; not a concern, but API callers can submit values? (select validation should reject non-option values for static selects — worth confirming, not assumed here.)

Not yet measured: how many IUC / tools-iuc wrappers iterate multiple selects or group tags in `<command>`. Worth a grep before filing (`#for \$\w+ in \$<multiple select or group_tag param>`).

## Suggested fix

Make `SelectToolParameterWrapper.__iter__` yield sanitized values, mirroring `InputValueWrapper.__iter__`. `SelectToolParameter.to_param_dict_string` joins the list with `self.separator` at the end, so iteration needs the pre-join sanitized list — e.g. factor out a `to_param_dict_list(value, other_values)` (str-map, sanitize when `tool is None or tool.options.sanitize`, no join) used by both `to_param_dict_string` and the wrapper's `__iter__`. Keep `None`/`[]` handling consistent (`to_param_dict_string` returns `"None"` for empty; iteration should probably yield nothing).

Compatibility: values made only of Galaxy's default valid chars (`ascii letters/digits + " -=_.()/+*^,:?!"`) are unchanged. Values with quotes, `$`, `;`, `|`, `&`, backticks, `<>`, newlines would now be mapped (`__sq__`, `__dq__`, …) or replaced with `X`, matching what `$sel` already produces. Tools with `<options sanitize="false"/>` or a permissive `<sanitizer>` keep their configured behavior. Could gate on tool profile if someone is worried, but since `str()` already sanitizes, matching it for iteration seems like a plain bug fix.

Tests: unit test in `test/unit/app/tools/test_wrappers.py` (or wherever `SelectToolParameterWrapper` is tested) — multiple select / group_tag with a value containing `'` and `;`, assert iteration matches the sanitized split; plus a `<sanitizer>`-configured case and a `sanitize="false"` tool case.

## Related, deliberately excluded

Collection identifiers (`$collection.name`, `.keys()`, `element_identifier` on collection elements) are also raw while `$dataset.name` is sanitized — known, separate design question; `safe_element_identifier` (26.2) is the current answer. Not part of this issue.

## Planemo follow-up

If Galaxy fixes this, planemo#1782's loop-over-select half of `SecurityRawParamValue` (on the review branch) becomes relevant only for older Galaxy servers; the lint message should say which Galaxy version fixed it, or that part should be dropped.
