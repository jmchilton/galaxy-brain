# 22976 — Parquet datatype + converters

Follow-up PR opened 2026-09-16: https://github.com/fairytalesbykcc/galaxy/pull/1
(`jmchilton:fix-parquet-converters-22976` →
`fairytalesbykcc:jennykuo/datatype/parquet`). The description starts with a Codex
authorship marker and includes the fixes, test results, and schema-lossiness limits.
The original upstream PR branch has not been changed directly.

## Round-trip coverage — 2026-09-16

Added test-only commit `41efe798fe` on the existing follow-up branch. Eight new
parametrized full-CLI round-trip cases cover:

- Parquet → plain tabular/quoted TSV → Parquet for int64 boundaries, ordinary
  floats, mixed text, leading-zero identifiers, NA/nulls, oversized decimals,
  overflowing integer text, nonfinite text, literal quotes/brackets, and Unicode.
- Headerless or explicit `#CHROM` plain tabular → Parquet → plain tabular/quoted
  TSV → Parquet, including a final all-null tab-only row. Intermediate and final
  results are checked against independently specified expected Arrow values/types.
- Documented scalar losses: numeric-only strings can be reinferred as integers,
  and empty strings cannot be distinguished from nulls after text export.

The previous quoted-TSV unusual-header/cell round trip remains intact. All nine
round-trip cases passed independently; the complete related suite passed 138
tests. Black, Ruff, Flake8, and commit checks passed. No converter implementation
changes in this commit. Nested values still have export/serialization tests, not
schema-preserving round trips, as agreed.

## Precision and metadata follow-ups — 2026-09-16

Two separate commits on the existing `jmchilton/fix-parquet-converters-22976` branch:

- `21b23c77d34b0c3ed8bc87aa68120975fb80e76f`: extend the existing conservative
  float-inference magnitude bound to fractional values too. Large positive,
  negative, and exponent-spelled decimals preserve the whole column as text;
  integer-only int64 inference is unchanged. Ordinary float64 approximation is
  explicitly retained and documented; this is not exact decimal/schema recovery.
- `4adf0e13ff13e9bd1db751dcf516effe33647ef7`: count logical records in shared
  CSV/TSV metadata instead of physical `csv.reader.line_num`. Multiline headers
  and cells no longer inflate dataset row counts. First-data-row type inference
  and physical-line error diagnostics are unchanged.

No serious design decision was needed: conservative text fallback and counting
records fit the existing contracts. Introducing decimal128/decimal256 inference
or exact schema recovery would be a separate design task, not part of these fixes.

Verification: nine new regression cases failed before implementation. The expanded
converter/Parquet/Tabular suite passed 83 tests; 47 related datatype/registry/line
provider tests also passed. Independent review found no correctness concerns and
independently passed the 83-test suite. Its suggested first-versus-second-row
type-inference assertion was added. Final combined run: 130 tests passed on the
committed tree. Commit checks passed for each commit.

T3 and T9 in the earlier reassessment below are now addressed. Metadata exception
logging, CSV converter version tidy-up, and streaming remain deferred. No PR opened
and no changes pushed to the author's branch.

## Follow-up revision — 2026-09-16

Implemented the four agreed changes in `c4a7a868a27438b90520851f1bfdfd4da9e7ce52`
on `review/parquet-converter-fixes` (remote `jmchilton/fix-parquet-converters-22976`):

- Restored `CONVERTER_parquet_to_tabular` as a genuine plain-tabular output and
  added `CONVERTER_parquet_to_tsv` as a separate quoted-TSV output. Both use the
  same script and serialization. Plain output rejects embedded delimiters/newlines,
  comment-like data records, and empty single-column records with a TSV suggestion.
- Explicit first-record headers preserve the first nonblank record, including
  `#CHROM`; subsequent generic-tabular comments remain ignored.
- Expected CLI input errors and unresolved PyArrow requirements now produce
  helpful stderr and exit 1 without a traceback.
- Tests use `galaxy.util.template.fill_template`; CSV field limits are restored
  after successful or failing reads; `galaxy-data[test]` now includes PyArrow,
  and converter tests require it rather than silently skipping.

Verification: 54 converter tests plus 10 existing Parquet/Tabular tests passed
on Python 3.13 with PyArrow 24.0.0. Thirteen targeted new regressions failed before
the fixes. Black, Ruff, Flake8, and commit hooks passed. Independent review found
no remaining concerns in this scope; selected tests also passed through the
`packages/data/tests/data` symlink.

Reassessment of deferred findings (not implemented in this revision):

- **T3:** real pre-existing CSV/TSV metadata issue. Count logical records, not
  `reader.line_num`, in a separate commit with multiline headers/cells tests.
- **T9:** worthwhile precision follow-up. `9007199254740993.5` currently becomes
  `9007199254740994.0`; preserve large-magnitude decimals as text while keeping
  documented ordinary float approximation. No schema-preserving claim is intended.
- **Naming:** original tabular ID/fixture/output now agree. New TSV tool gets its
  own ID and version 1.0.0 and reuses the existing simple fixture; no major-version
  output-datatype change remains on the existing converter.
- **CSV converter version:** a small, separate upstream dependency-version tidy-up.
- **Metadata exception logging:** useful upstream observability cleanup, not a
  converter-blocking regression.
- **Dependency correction:** `thriftpy2` is in `galaxy-data`'s test extra and
  Galaxy's pinned runtime requirements, not `galaxy-data`'s declared runtime deps.
- **T6 correction:** the previous code changed the field limit during TSV reading,
  not at module import. The process-global mutation was real and is now restored.
- **Regex anchors/streaming:** defer; neither warrants expanding this correction.

The review below records the original upstream and `afa8a1808a` assessments, not
the state after this revision. The remote follow-up remains separate from the
author's PR branch; no PR has been opened.

Worktrees:
- `~/projects/worktrees/galaxy/pr/22976` — `jennykuo/datatype/parquet` @ `dd55920dea` (upstream)
- `~/projects/worktrees/galaxy/followup/22976-parquet-converter-fixes` — `review/parquet-converter-fixes`,
  upstream + one local commit `afa8a1808a` ("my tweak")

Base: `4906c84e2e` (merge-base with `origin/dev`).

Verified locally: `test_parquet_converters.py` → **32 passed** (py3.12, pyarrow 24.0.0, isolated env —
no `.venv` in the worktree). `ruff check` and `black --check -l 120` clean on all three changed files.

---

## Upstream (#22976) — findings

Scope: `Parquet` datatype metadata in `binary.py`, `parquet_to_csv` fixes, new `parquet_to_tabular`
and `tabular_to_parquet` converters, `thriftpy2` runtime dep, `pyarrow` 4.0.1 → 24.0.0.

**Good calls**
- Reading the Parquet footer with a 12-line embedded Thrift IDL (`_PARQUET_THRIFT_DEFINITION`) instead
  of pyarrow. `set_meta` runs in the metadata env where the tool's conda `pyarrow` is not available, so
  this is the right instinct. The `num_children` schema walk is correct for flat and nested schemas
  (hand-traced).
- Optional-import guard so `binary.py` still imports without `thriftpy2`.

**Issues**

1. **Data loss — first row is always consumed as a header.** `tabular_to_parquet_converter.py` does
   `header = lines[0]...` unconditionally, and `datatypes_conf.xml.sample` registers it on the generic
   `tabular` datatype. Nearly every Galaxy tabular subclass (bed, interval, …) is headerless, so an
   implicit conversion silently drops a data row *and* names the columns after its values.

2. **Output corrupts cells containing tabs/newlines/quotes.** `_write_tabular` joins on `\t` and only
   quotes a value when `val[0] in "{["`. A string cell with an embedded tab, LF, CR or `"` breaks the
   record. The same test misfires on literal text that merely starts with `[` (e.g. `[GC]`), which gets
   spurious quotes added.

3. **Per-cell type inference, several concrete failures.** The `"." in value or "e" in value.lower()`
   heuristic runs per value, then the column type is picked by `all(isinstance(...))`:
   - `int("0123")` → `123`, destroying leading-zero identifiers.
   - `int("1_000")` → `1000` — Python accepts underscore separators.
   - Values beyond int64 reach `pa.array(..., type=pa.int64())` and raise → hard crash, no message.
   - `"inf"` / `"nan"` / `"infinity"` become non-finite floats.
   - `value.lower() == "na"` is coerced to null, so the literal string `NA` cannot survive.

4. **Quadratic-ish export.** `_stringify_all_columns` materializes the whole table into Python lists,
   then `_write_tabular` does `table.column(c)[r]` per cell — random access into a `ChunkedArray` in a
   double loop. Real Parquet files will hurt.

5. **`parquet_to_csv` vs `parquet_to_tabular` diverge silently.** `pyarrow.csv.write_csv` raises on
   list/struct/map columns; the tabular path JSON-serializes them. Same source datatype, two very
   different capability sets, undocumented.

6. **`Parquet.set_meta` swallows everything** (`except Exception: pass`) with no `log.warning`. Any
   footer-parsing bug is invisible in production.

7. **`thriftpy2` becomes a hard runtime dependency of `galaxy-data`** for one datatype's metadata. Worth
   confirming that was weighed against making it optional (the code already raises a clean `RuntimeError`
   when it is missing, so an optional extra looks viable).

8. **No converter test coverage.** `test_parquet.py` only exercises `sniff` / `set_meta` / `set_peek`.
   Neither converter has a single unit test — which is how 1–3 got through.

9. `parquet_to_csv_converter.xml` stays at `version="1.0.0"` while its `pyarrow` requirement jumps
   4.0.1 → 24.0.0. The resolved dependency env changes; the tool version should move.

---

## The tweak (`afa8a1808a`) — findings

Fixes upstream 1, 2, 3 and 8 properly, and does not weaken or delete anything.

**Good calls**
- Retargeting the export to the `tsv` datatype and writing with `csv.writer(dialect="excel-tab")` is the
  correct diagnosis and good reuse: `TSV.dialect` *is* `csv.excel_tab`, and the class docstring says the
  datatype exists precisely "for datasets with tabs INSIDE double quotes". Quoting is delegated to the
  stdlib rather than reinvented.
- `header_mode` select + `$input.is_of_type('tsv')` dispatch in the command block. Datatype-driven
  default with an explicit override is the right shape, and non-data params on converters have precedent
  (`bigbed_to_bed_converter.xml`, `bigwig_to_wig_converter.xml`).
- Whole-column regex inference *before* coercion. Kills every failure in upstream item 3 at once, and
  `_safe_float`'s underflow + 2**53 guards are more careful than most Galaxy inference code.
- Registering `tabular_to_parquet_converter.xml` under the `tsv` datatype is **necessary**, not
  redundant: `get_converters_by_datatype` walks source-datatype subclassing, and `TSV(BaseCSV)` does not
  inherit from `Tabular`.
- The test module asserts the rendered XML command *and* the `datatypes_conf` registration, not just the
  Python functions. That catches the class of regression that would otherwise only show up in a
  functional run.

**Issues**

- **T1 (headline). Parquet loses its path to `tabular` entirely.** `Tabular(TabularData)` and
  `BaseCSV(TabularData)` are siblings, and `Data.matches_any()` is an `isinstance` check. After
  retargeting the only remaining parquet converters are `→ csv` and `→ tsv`, neither of which is a
  `Tabular`. So `find_conversion_destination_for_dataset_by_extensions` will no longer offer a parquet
  dataset to any tool declaring `format="tabular"` — which is most of Galaxy. Upstream could.
  Options: keep the `tsv` target *and* register a second thin plain-tabular converter file; or accept
  the loss deliberately and say so in the PR.

- **T2. `#` stripping can silently drop the header and shift the table.** In `tabular` mode
  `read_table` filters `line.startswith("#")` *before* `rows.pop(0)`. With `--header-mode first` on a
  file whose header is `#CHROM\tPOS\t…`, the header is dropped and the first data row is promoted to
  column names — the exact failure mode the tweak set out to fix. Legitimate `#`-leading data rows are
  dropped too. Suggest confining the filter to `auto`/`none`, or dropping it and letting the width
  check reject. `test_generic_tabular_comments_and_blank_lines` only covers the `auto` path.

- **T3. `data_lines` metadata will be wrong for the new output.** `BaseCSV.set_meta` sets
  `data_lines = reader.line_num - 1`, and `csv.reader.line_num` counts *physical* lines, not records.
  The point of the tweak is to emit cells containing newlines, so every such export reports an inflated
  line count in the UI. Pre-existing `BaseCSV` bug, newly reachable by design — worth at least an
  upstream issue.

- **T4. Error UX regressed.** Upstream printed `Input file … not found` / `… is empty` and exited 1. The
  tweak drops the `os.path.isfile` check and raises bare `ValueError` / `FileNotFoundError`, so job
  stderr gets a traceback. The friendly `ImportError("Cannot run conversion, pyarrow is not installed.")`
  is gone too — with the `<requirement>` unresolved an admin now sees a raw `ModuleNotFoundError`.
  Cheap to restore without giving back any of the real fixes.

- **T5. Reuse: the test renders Cheetah by hand.** `test_input_subtypes_use_the_correct_parser` calls
  `Cheetah.Template.Template(...)` directly. Galaxy's own entry point is
  `galaxy.util.template.fill_template()` (`lib/galaxy/util/template.py`), which carries Galaxy's compiler
  settings and `python_template_version` handling. Tests under `test/unit/data/` can import galaxy, and
  `packages/data` depends on `galaxy-util[template]`, so `fill_template` is available in both runners.

- **T6. `csv.field_size_limit(sys.maxsize)` mutates process-global state from importable module code.**
  The tests import the module; so would anything else. Confine it to `__main__` or save/restore.

- **T7. `pyarrow` in the root `test` group but not `packages/data`.** Upstream put `thriftpy2` in both.
  The test file is reachable from `packages/data` (via `packages/data/tests/data -> test/unit/data`), and
  it uses `pytest.importorskip`, so without the dep there it will silently *skip* rather than run. Also
  worth a sentence in the PR that this pulls a 35–50 MB wheel into every Galaxy test env.

- **T8. Naming drift.** File, tool id (`CONVERTER_parquet_to_tabular`) and fixture
  (`parq_to_tabular_conv.tabular`) all still say "tabular" while the converter now emits tsv. Keeping the
  *tool id* is correct for registry/job compatibility; the fixture name is free to rename. Also: the
  output datatype changed, which is arguably a `2.0.0` bump rather than `1.1.0`.

- **T9. Nit — the precision guard is asymmetric.** `_safe_float` returns early for non-integral decimals
  (`exact != exact.to_integral_value() or …`), so `"9007199254740993.5"` becomes a float and loses
  precision while the integral `"9007199254740993"` stays text. Defensible, but the existing comment
  explains the exponent/underflow part only.

- **T10. Nit.** `INTEGER` / `NUMBER` use both a `\Z` anchor and `.fullmatch()`. Pick one.

- **T11. Non-blocking.** `read_table` materializes `list(csv.reader(...))` and then builds a per-column
  list. No worse than upstream's `readlines()`, but a converter is where streaming pays.
