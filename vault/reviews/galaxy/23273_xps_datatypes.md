# PR #23273 — XPS datatypes

PR: https://github.com/galaxyproject/galaxy/pull/23273

Reviewed 2026-09-16 at `09dc0449d5ec23a299046a7ccb2fd59cf9daae4a` against target `dev`, merge base `dd33e5ce159c676292cb85e36063275fac4da5d5`. Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/23273` (clean after review).

## Verdict

The new datatype direction is reasonable, but this head is not merge-ready: automatic detection does not select two of the three datatypes, the VAMAS sniffer is built around an incorrect format assumption, and the fixture name breaks existing integration-test collection. There is also a concrete existing-datatype regression in filename inference.

**These concerns are already delivered by another reviewer**, not new feedback we need to post. [Arash's September 15 review](https://github.com/galaxyproject/galaxy/pull/23273#pullrequestreview-5211099804) and its inline comments cover all the findings below. No author replies or newer commits were present when checked. The useful next action is verification after author fixes, not another duplicate blocker comment.

## Verified findings (already posted; P2 unless otherwise stated)

### 1. Specialized sniffers run after the generic types

`lib/galaxy/config/sample/datatypes_conf.xml.sample:444–450` registers the datatypes without placing them in `<sniffers>`. Registry appends them at positions 359–361, after H5 (55) and TSV (245).

Using the actual sample registry and `guess_ext`:

```
test.vamas    -> vamas
test.xps.tsv  -> tabular
test.nxs.xps  -> h5
```

Moving the existing XpsTabular and NXxps instances immediately before generic TSV and H5 in memory changes the last two results to `xps.tsv` and `nxxps`. This is registry wiring, not a claim that their direct sniff methods fail the supplied fixtures. Explicit datatype selection still works.

Recommended fix: add explicit sniffer entries before the generic types and registry-level fixture assertions, not just direct-method doctests.

### 2. The VAMAS sniffer requires a technique in the wrong header

`lib/galaxy/datatypes/xps.py:105–124` inspects at most eight nonblank lines and requires one to be in `_VAMAS_TECHNIQUES`. Technique is a block-header field, not the experiment identifier on line 5.

Checked against the upstream [xylib VAMAS reader](https://github.com/wojdyr/xylib/blob/master/xylib/vamas.cpp), which reads the fixed format identifier first, then institution/model/operator/experiment identifiers, comment count and experiment/scan modes; technique is read later in each block. Its [real sample](https://github.com/wojdyr/xylib/blob/master/samples/mjr9_64c.vms) has `XPS` on physical line 35. Feeding that sample's genuine first eight lines to the PR's sniffer returns `False`; the sniffer necessarily stops before the remaining sample can matter.

Conversely, five ordinary text lines beginning `VAMAS interoperability workshop notes` with a bare `XPS` fifth line return `True`. The added `test.vamas` is aligned to the incorrect assumption (free-form first line and `XPS` fifth line), rather than a real interchange file. Its tab-separated x/y records are not the standard's one-value-per-line encoding. I did not install a separate full VAMAS parser; this fixture assessment is based on the upstream reader and visible structure, not a claimed parser execution.

Recommended fix: sniff the standard format identifier as the upstream reader does and replace the synthetic fixture with a small real, attributable VAMAS file. Do not merely increase eight to a larger guessed line count. Eight lines of a valid file need not contain a technique, so “all files fail” is too absolute: an experiment identifier could coincidentally equal `XPS`.

### 3. New filename aliases misclassify unrelated formats

`lib/galaxy/config/sample/datatypes_conf.xml.sample:445,449` adds `infer_from` for `vms` and `nxs`. `Registry.get_datatype_from_filename` prioritizes suffix inferences before registered extensions.

Actual results:

```
slide.vms -> vamas
slide.vmu -> vms       # existing Hamamatsu datatype
tomo.nxs  -> nxxps
```

Deleting just the two new aliases in the in-memory registry restores `slide.vms -> vms`, `slide.vmu -> vms`, and the pre-existing generic `tomo.nxs -> data`. Thus `.vms` is a real regression against an existing datatype; `.nxs` additionally overclaims NeXus containers unrelated to XPS. Filename inference is relevant when content cannot yet be sniffed, including deferred inputs; sniffer order does not fix these aliases.

Recommended fix: remove the broad aliases; use actual sniffing for downloaded content. If deferred `.vms` XPS inference is desired, its ambiguity with the existing image format needs an explicit separate policy, not an unconditional override.

### 4. The HDF5 fixture name prevents integration-test collection

The added `lib/galaxy/datatypes/test/test.nxs.xps` matches no registered datatype suffix. Existing `test/integration/test_datatype_upload.py:27–35` finds the datatype by longest registered extension, and constructs all cases at module import.

Executed that exact, unmodified `find_datatype` function extracted with AST (without importing or starting the integration server):

```
Exception("Couldn't guess datatype for file 'test.nxs.xps'")
```

Recommended fix: rename the fixture to `test.nxxps`, update its doctest reference, then verify fixture collection and automatic detection. This is a concrete suite-collection failure; no full integration-server run was needed to reproduce it.

## Smaller reuse/test issues

The XpsTabular metadata/preview override repeats the base implementation and drifts. For a three-column file headed `BE (eV) / KE (eV) / Counts`, metadata correctly records those names, but actual HTML renders `1.Binding Energy (eV) | 2.Intensity | 3` and renders the input header again as a data row. Column types are unconditionally float; a leading comment disables header recognition because `idx == 0` counts physical lines. These are also already covered by Arash's inline feedback.

Prefer the base Tabular inference/header/display seams, with an explicitly chosen header skip and `data_line_offset`. Arash's suggested replacement is a useful direction, not a fully verified drop-in solution: he notes its leading-comment and header-row-count caveats. Do not expand this PR into recognizing every vendor export unless that is intended scope.

Move `h5py` to module top (already imported there by `binary.py`, so there is no demonstrated optional-dependency reason). Black currently wants a blank line before the nested `_read_definition`; factoring the helper also resolves that. NXentry array-string handling/fallback robustness, exception logging, the standard URL, and docs registration are existing reviewer comments, not novel action items. The correct [ISO 14976 catalog entry](https://www.iso.org/standard/24269.html) differs from the PR's URL.

## Verification

- Three `xps.py` datatype doctests and six existing Tabular unit tests: **9 passed** (Python 3.13.12; reused read-only unit dependencies and the isolated temporary environment from #22976).
- Exact sample registry `guess_ext` and in-memory ordering correction reproduced as above.
- Actual filename inference and removal of only the two new aliases reproduced as above.
- Exact integration fixture-matcher function reproduced its failure without importing integration infrastructure.
- Genuine upstream VAMAS first-eight-line sniff rejection and ordinary-notes false positive reproduced.
- Actual XpsTabular metadata/HTML header mismatch reproduced.
- Ruff `--no-cache`: clean. Black `--check --diff --line-length 120`: one formatting change required, before the nested helper; its newer installation also emitted a Python target-version safety-check warning.
- No code changes, pushes, GitHub comments, or index edits. No full integration/backend server tests run; none required for these diagnostics.

Temporary diagnostic script: `/tmp/galaxy23273_review_diagnostics.py`. The existing passing doctests are useful smoke tests but miss registry selection, actual VAMAS structure, and metadata/preview behavior. No test assertion was weakened.
