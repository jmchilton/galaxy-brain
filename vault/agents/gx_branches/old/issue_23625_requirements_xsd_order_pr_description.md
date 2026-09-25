Fixes #23625.

## What

`Requirements` in `lib/galaxy/tool_util/xsd/galaxy.xsd` was an `xs:sequence`, so `requirement`, `container`, `resource` and `credentials` had to appear in exactly that order. A tool putting `<container>` first failed `planemo lint`:

```
ERROR (XSD): Invalid XML: Element 'requirement': This element is not expected.
Expected is one of ( container, resource, credentials ).
```

which reads as "you can't have both" — that is how it was reported in galaxyproject/planemo#1168.

The runtime never cared. `parse_requirements_from_xml` (`lib/galaxy/tool_util/deps/requirements.py`) reads each child with its own `findall`, so every interleaving parses identically. The schema was stricter than the code it describes.

Now an `xs:choice minOccurs="0" maxOccurs="unbounded"`. Any order, any interleaving.

## Why a choice and not `xs:all`

`xs:all` is the natural way to say "these, in any order", but XSD 1.0 forbids `maxOccurs="unbounded"` on its children, and tools legitimately declare several `requirement`s. A repeated `xs:choice` is the standard workaround and is already used elsewhere in this schema (e.g. `TestAssertions`).

The two `xs:unique` constraints on `credentials` move across unchanged — verified that duplicate `name`s across `variable`/`secret` are still rejected.

## Tests

- `test_xsd_requirements_children_in_any_order` in `test/unit/tool_util/test_tool_linters.py` runs the XSD linter over a tool with `container` first and `requirement`s interleaved around a `resource`. Verified red against the old schema with the exact error above, green after.
- A doctest case on `parse_requirements_from_xml` pins the runtime parity claim: `<container>` before `<requirement>` yields the same requirement and container.
- All 285 tools in `test/functional/tools` still validate against the schema; `xmllint --format` reports no drift.

## Noticed, not fixed here

- `.ci/validate_test_tools.sh` lints the schema at `lib/galaxy/tools/xsd/galaxy.xsd`, which has not existed since `tool_util` was split out. Without `set -e` the failing `xmllint` is swallowed and the script continues. No GitHub workflow references the script either, so the test-tool XSD validation it performs does not run anywhere.
- `Credentials` is itself an `xs:sequence` of `variable` then `secret`, and `credentials_from_element` reads those per-tag too — same class of over-strictness, left alone as out of scope.
- One pre-existing trailing space in the `Credentials` documentation block is in the diff; the repo's `trailing-whitespace` pre-commit hook strips it on any commit touching this file.

## Target branch

Against `release_26.0`, the oldest branch still taking fixes here, so forward merges carry it to `release_26.1` and `dev`. Trivial to retarget if `dev` is preferred — the schema is identical on all four.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
