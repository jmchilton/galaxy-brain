# Golden Cache Follow-up Plan

Hardening the cross-language golden cache contract between Python (Galaxy) and TypeScript (galaxy-tool-util-ts).

## 1. Add `format_version` to `cache_golden.yaml`

Use Galaxy's tool_util version (or a simple integer) as `format_version` at the top of the manifest.
Both Python and TS test suites should check this field and fail with a clear message if they encounter
a version they don't support.

```yaml
format_version: 1
toolshed_tools:
  ...
```

**Galaxy side:**
- Add `format_version: 1` to `test/unit/tool_util/workflow_state/cache_golden.yaml`
- In `test_tool_caching_golden.py`, assert `manifest["format_version"] == 1` at load time
- In `generate_golden_cache.py`, write `format_version` into output if not present

**TS side:**
- In golden test loader, assert `manifest.format_version === 1`
- Bump on either side when the manifest schema changes (new sections, renamed fields, etc.)

## 2. Add expected nested parameter type assertions

The current manifest only checks top-level `input_names` and `input_types`. Deep nesting
(conditionals inside repeats, repeats inside conditionals) is where Python/TS diverge most.
Add an `expected_nested_structure` field for at least one complex tool.

**Proposed format** — path-based type assertions:

```yaml
  - tool_id: "toolshed.g2.bx.psu.edu/repos/iuc/multiqc/multiqc/1.11+galaxy1"
    expected_nested_structure:
      "results.software_cond": "gx_conditional"
      "results.software_cond.software": "gx_select"
      "results.software_cond.bamtools.input": "gx_data"
```

Path format: `repeat_name.conditional_name.when_value.param_name`

**Galaxy side:**
- Add `expected_nested_structure` entries to manifest for MultiQC and Trimmomatic
- Add `TestNestedStructure` class that walks the ParsedTool input tree and verifies types at each path

**TS side:**
- Mirror the tree-walking logic using the schema package parameter type definitions
- Same path → type assertions

## 3. Normalize description nullability

Python produces `""` (empty string) for tools with no description, TypeScript may produce `null`.
Decide on one convention and enforce it.

**Recommendation:** empty string → `null` normalization on read, both sides.

**Galaxy side:**
- In `ParsedTool` construction, normalize `description = description or None`
- Update golden fixtures (regenerate after normalization change)
- Add `expected_description` to manifest entries where it matters (at least cat1 and fastqc)

**TS side:**
- In ParsedTool Effect Schema, add `.pipe(S.transform(...))` to normalize empty string to null
- Assert `description` matches manifest in golden tests

## 4. Add SHA256 checksums for sync validation

Add a `checksums.json` to the golden cache directory so the TS side can verify it has the
correct version without diffing every file.

**Format:**
```json
{
  "manifest_sha256": "abc123...",
  "files": {
    "4442926e...json": "def456...",
    "index.json": "ghi789..."
  }
}
```

**Galaxy side:**
- Update `generate_golden_cache.py` to emit `checksums.json` after writing all files
- Compute SHA256 of each golden JSON file + the manifest YAML

**TS side:**
- Add a `verify-golden` Makefile target that recomputes checksums and compares to `checksums.json`
- `sync-golden` target copies `checksums.json` along with the other files
- CI can run `make verify-golden` to catch stale fixtures without needing `GALAXY_ROOT`

## 5. Stock tool `tool_id` in index — synthetic path cleanup

Currently both Python and TS produce `toolshed.g2.bx.psu.edu/repos/cat1` as the `tool_id`
in the cache index for stock tools. This is a side effect of `_tool_id_from_trs` being
called with a non-TRS ID. It works but is confusing.

**Options:**
- a) Store just `"cat1"` — the actual tool ID
- b) Keep synthetic path but document it explicitly
- c) Add a `tool_type: "stock" | "toolshed"` field to index entries

Tracked in jmchilton/galaxy-tool-util-ts#1.

## Sequencing

1. format_version (small, no behavioral change)
2. description nullability (small, may require golden regeneration)
3. SHA256 checksums (enables CI validation)
4. nested structure assertions (larger, tests actual parsing depth)
5. stock tool_id cleanup (cross-project coordination)

## Unresolved

- Should `format_version` be a simple integer or follow Galaxy's version scheme?
- For nested structure paths, how to represent multiple `when` branches — test all or just one?
- Should checksums cover the YAML manifest separately or just the generated JSON files?
