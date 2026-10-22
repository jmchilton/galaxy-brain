# `has_line_matching` anchors its regex to the whole line, but its docs don't say so

`has_line_matching` and `has_text_matching` have identical `expression` docs, yet they treat the same regex very differently.

Both are documented as "The regular expressions to attempt match in the output." On a GFF with two lines starting `I\t` and one starting `II\t`, `n="2"`, on current `dev`:

| Assertion | `expression` | Result |
| --- | --- | --- |
| `has_line_matching` | `^I\t` | ❌ `Expected 2+-0 lines matching for '^I\t'`. It finds 0. |
| `has_line_matching` | `I\t.*` | ✅ |
| `has_line_matching` | `^I\t.*$` | ✅ the `^`/`$` are redundant, the `.*` is what matters |
| `has_text_matching` | `^I\t` | ❌ finds 1. `^` matches only the start of the output. |
| `has_text_matching` | `I\t.*` | ❌ finds 3. `II\t` also contains `I\t`. |

The failing `has_line_matching` case reads like a broken tool output, not a broken assertion. A tool author who writes the natural prefix regex `^I\t` can't learn from the docs that Galaxy wraps it as `^^I\t$`, which only matches a line that is exactly `I` plus a tab.

The wrapping isn't grouped either, so alternation escapes it: `foo|xbar` becomes `^foo|xbar$` and counts a line `foo 1` even though `foo` isn't the whole line.

<details><summary>Why</summary>

In `lib/galaxy/tool_util/verify/asserts/text.py`:

- `assert_has_line_matching` runs `re.search(f"^{e}$", o, flags=re.MULTILINE)` and the matching `re.findall`. The expression must match an **entire line**.
- `assert_has_text_matching` runs `re.search(e, o)` / `re.findall(e, o)` with no flags. The expression is unanchored, and `^`/`$` refer to the start and end of the whole output.

Both take `expression: Expression`, one shared annotation (`text.py:21`), and the `has_line_matching` docstring says only "contains a line matching the regular expression". Codegen (`lib/galaxy/tool_util/verify/codegen.py`) copies the annotation and docstring, unchanged, into:

- `lib/galaxy/tool_util/xsd/galaxy.xsd`, both `<has_line_matching>` and `<has_text_matching>`. The tool XML reference on docs.galaxyproject.org is built from it;
- `lib/galaxy/tool_util_models/assertions.py` (`has_line_matching_expression_description`, `has_text_matching_expression_description`);
- and from those models into `client/packages/api-client/src/schema/schema.ts` and `client/src/components/Tool/ToolSourceSchema.json`, which drives the YAML tool editor's schema help.

Downstream schemas built from these models (for example, the workflow tests-format schema) inherit the same text.

</details>

<details><summary>Reproduction (Galaxy venv on dev)</summary>

```python
from galaxy.tool_util.verify.asserts.text import assert_has_line_matching, assert_has_text_matching

gff = "I\tsrc\tgene\t1\t10\t.\t+\t.\tID=a\nI\tsrc\tgene\t20\t30\t.\t+\t.\tID=b\nII\tsrc\tgene\t1\t5\t.\t+\t.\tID=c\n"
for fn in (assert_has_text_matching, assert_has_line_matching):
    for expr in ("^I\t", "I\t.*", "^I\t.*$"):
        try:
            fn(gff, expression=expr, n=2)
            print(fn.__name__, repr(expr), "pass")
        except AssertionError as e:
            print(fn.__name__, repr(expr), "FAIL:", str(e).split(" in output")[0])

# alternation leak: counts 2 ('foo 1' and 'xbar'), though 'foo' isn't a whole line
assert_has_line_matching("foo 1\nbar 2\nxbar\n", expression="foo|xbar", n=2)
```

</details>

## Context

Found during an nf-core/rnaseq → Galaxy workflow conversion (galaxyproject/foundry#657). Its test plan wrote nine `has_line_matching` assertions in prefix form (`^I\t`, `^Sample\t`, …). All would have counted zero. That was caught before running; the reproduction above shows the same on a minimal GFF. foundry#657 tracks fixing Foundry's own notes, but the misleading text starts in Galaxy. Related to 🎯 #13145, which asks for better assertion docs in `galaxy.xsd` in general.

## Proposed Approach

Docs only, no behavior change. Give `has_line_matching` its own `expression` annotation, e.g. "Regular expression that must match an entire line. Galaxy wraps it as `^expression$` and checks each line (multiline), so end a prefix with `.*` (`foo.*`, not `foo`). Group alternatives (`(?:a|b)`)." Extend its docstring the same way. Also sharpen `has_text_matching`'s text to say it is searched anywhere in the output and that `^`/`$` refer to the whole output. Then regenerate the derived files.

<details><summary>Approach details</summary>

- `text.py`: split `Expression` into two annotations, one per assertion, and add a line plus a short example to the `assert_has_line_matching` docstring.
- Regenerate: `PYTHONPATH=lib python lib/galaxy/tool_util/verify/codegen.py` (rewrites `galaxy.xsd` and `tool_util_models/assertions.py`, needs `xmllint`), then `make update-client-api-schema` for `schema.ts` and `PYTHONPATH=lib python client/src/components/Tool/rebuild.py` for `ToolSourceSchema.json`.
- A unit test pinning the documented behavior is cheap: `has_line_matching` with `foo` fails on a line `foo bar`, and with `foo.*` it passes.

</details>

## Alternative Approaches

Changing `has_line_matching` to search within each line (no implicit `^…$`) would make the natural prefix regex work. But it changes the meaning of existing tests: today `foo` means "a line that is exactly `foo`", and would start matching `foobar`. Wrapping as `^(?:expression)$` would fix the alternation leak, but also changes what existing alternation tests count. Documenting the current behavior is safe and fixes every generated schema at once. Either change could follow later.

<details><summary>Alternatives In Detail</summary>

### Alternative: Search within each line

<details><summary>Description</summary>

#### Details

In `assert_has_line_matching`, drop the `^…$` wrap and count lines where `re.search(expression, line)` matches.

#### Why the proposed approach is preferred

It silently loosens every existing `has_line_matching` test that relies on whole-line matching. Tests that pass today could start passing for the wrong reason.

</details>

### Alternative: Group the wrapped expression

<details><summary>Description</summary>

#### Details

Wrap as `^(?:{e})$` so alternation can't escape the anchors.

#### Why the proposed approach is preferred

It's arguably a bug fix, but it changes counts for existing tests that use `|`, and it still leaves whole-line matching undocumented. It fits better as a follow-up after the docs say what the assertion means.

</details>

</details>
