# galaxy#23866 — Coerce pattern-discovered extensions that are not datatypes to data

- Author: mvdbeek · base `dev` · head `cc0df330aff` · not draft
- Fixes #22648 (unzip's `discover_datasets` regex captures arbitrary suffixes → HDAs with non-datatype extensions)
- Worktree: `~/projects/worktrees/galaxy/pr/23866` (merge-base = current `origin/dev` `90eca92b007`)

## Summary

Adds an `ext` property override on `RegexCollectedDatasetMatch`
(`lib/galaxy/model/store/discover.py:1266-1277`): when the pattern captures an `ext` group, lowercase
it and return it only if it is a registered datatype or the legacy `input` token; otherwise `data`.
No `ext` group (or unmatched optional group → `None`) falls through to the parent (collector
`default_ext` or `data`). JSON/galaxy.json matches are untouched (they use the parent class).

Tests: framework tool `test/functional/tools/discover_unknown_ext.xml` (list with `1.txt` → `txt`,
`2.notadatatype` → `data`), plus 3 unit tests in `test/unit/app/tools/test_collect_primary_datasets.py`
(unknown ext with `format="auto"`, `.TXT` → `txt`, legacy `primary_<id>_<name>_visible_input`).

## Verdict

**Approve.** Small, well-placed fix: the override sits on the one class that wraps regex captures, so
every consumer (`output_collect.collect_primary_datasets` at `output_collect.py:453`, collection
population at `discover.py:437`) gets it for free and the galaxy.json path is untouched. Nothing blocking.

## Verified

- Registry is installed everywhere `RegexCollectedDatasetMatch` runs: app boot (`app/__init__.py:849`)
  and the extended-metadata script (`metadata/set_metadata.py:205` → `:625`, before collection at `:374`).
- No registered extension in `datatypes_conf.xml.sample` contains uppercase, and the registry lowercases
  on load (`datatypes/registry.py:1096`), so `.lower()` before lookup is safe.
- Bonus fix: unzip's pattern `\.?(?P<ext>.*)` captures `""` for dotless names. Before, `as_dict.get("ext", ...)`
  returned `""`; now `""` fails the registry lookup and becomes `data`.
- `_get_datatypes_registry` is private, but `tools/source_store/discover.py:29` and `populator.py:56`
  already import it the same way. `galaxy.model.datatype_for_extension` (`model/__init__.py:5476`) is the
  public neighbor, but it returns a `Data` object and logs a warning, so it doesn't fit here. Fine as is.

## Findings (by severity)

1. **Low / question — fallback ignores the collector's declared format.** `discover.py:1275-1276`
   always returns `"data"` for an unknown captured ext, even when the tool declares
   `format="txt"` (or similar) on `discover_datasets`. Falling back to `super().ext` (collector
   `default_ext`) would honor the author's declared default. The catch is `format="auto"` (the unzip shape):
   the fallback would then store `auto`. As far as I can trace, `auto` is not sniffed for job outputs
   (`_sniff_` is, at `jobs/__init__.py:2080` / `set_metadata.py:138`), so `data` is right there.
   *Reasoned, not run.* Ask, don't block. A small `default_ext not in (None, "auto")` check would cover both.
2. **Nit — test overlap.** `test_name_and_ext_pattern_unknown_ext_is_data` (unit) and the new framework
   tool cover the same known/unknown split. The unit test's only extra is `format="auto"`. Adding
   `format="auto"` to `discover_unknown_ext.xml` would make the integration test mirror the unzip
   tool exactly, and then the unit test is redundant. The `.TXT` and `input` unit tests already pass on the
   base branch (consumers lowercase at `discover.py:438` / `output_collect.py:455`), but they guard the
   new lookup's lowercasing and `input` exemption, so they're worth keeping. *Reasoned, not run.*

No import-placement issues; the comment on the override explains *why*, so it isn't an obvious-comment nit.

## CI

All reported checks green at `cc0df330aff` (unit, API, framework, integration, selenium/playwright
shards, CodeQL, startup, DB index checks). A few `Test` / `update-title` entries SKIPPED (normal).
No reviews or comments yet.

## Draft PR comment (unposted)

> *Posted by Claude (AI assistant) on behalf of jmchilton. Not written by them personally.*
>
> Looks good to me. Putting the override on `RegexCollectedDatasetMatch` means both the primary-dataset
> and collection paths pick it up, and galaxy.json stays untouched. It also handles unzip's
> `(?P<ext>.*)` capturing `""` for dotless filenames, which now becomes `data` too.
>
> One question, not blocking: an unknown captured ext always becomes `data`, even when the collector
> declares a `format`/`ext` (e.g. `format="txt"`). Would falling back to the collector default be
> better, except for `auto` (which I don't think gets sniffed for job outputs, so `data` is right there)?
>
> Small test nit: adding `format="auto"` to `discover_unknown_ext.xml` would make it match the unzip
> tool exactly. `test_name_and_ext_pattern_unknown_ext_is_data` would then be redundant.
