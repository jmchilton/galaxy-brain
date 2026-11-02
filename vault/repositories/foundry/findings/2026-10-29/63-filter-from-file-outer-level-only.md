# Collection patterns don't say `__FILTER_FROM_FILE__` filters only the outer level of a nested collection

- Target: galaxyproject/foundry (`content/patterns/galaxy-collection-patterns.md`, `sync-collections-by-identifier`, `collection-swap-nesting-with-apply-rules`). Galaxy behaves as documented-by-code; optional galaxyproject/galaxy help-text tweak. Foundry tracking needed: yes (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-hic-v0-2026-11-01, phase 2 (data-flow), driver probe A (`../prose-wb2g-hic-v0-2026-11-01.bin/probe-df/xp.gxwf.yml`, planemo release_26.1), 2026-11-01. Ledger `collection-patterns-silent-on-nested-identifier-filter` (major); discovery `probe-cross-product-nested-and-outer-filter`.
- Existing issues/PRs: none (searched Foundry issues for `FILTER_FROM_FILE`). Related: findings [35](35-keyed-partner-lookup-recipe.md) (keyed partner lookup), [11](11-galaxy-when-skip-model-operation.md) (filter ops under `when`).

## Symptom
hic selects, per analysis, a subset of map resolutions inside sample → resolution maps (`list:list`). A design that filters the inner resolution level by an identifier file looks valid. Probe A: `__FILTER_FROM_FILE__` `remove_if_absent` on a `list:list` (outer `s1`,`s2`; inner `1000`,`2000`) with a file listing `1000` returned 0 elements, not 2. The data-flow phase had to change the interface output nesting to resolution-outer (decision `map-outputs-resolution-outer`) so the selection axis is outermost.

## Root cause
Confirmed. `lib/galaxy/tools/filter_from_file.xml` (release_26.1) takes any `data_collection` and matches the file's identifiers against the collection's top-level element identifiers; the help says "elements" without saying which level. Foundry's collection MOC lists membership filtering (`galaxy-collection-patterns.md:69`, `sync-collections-by-identifier`) and nesting swaps (`:78`) separately and never says filtering acts on the outer level only, so nothing warns that inner-level selection silently empties the collection.

## Evidence
- Probe A files and `xp.json` in the run's `.bin/probe-df/`; data-flow brief §2.3 and §12 ("Per-analysis selection ... outer identifier `1000` only").
- Final workflow: all six cases green with resolution-outer maps (run-summary).

## Proposed fix
In `galaxy-collection-patterns.md` "Membership" and in `sync-collections-by-identifier`: `__FILTER_FROM_FILE__` acts on the outermost level (check `__RELABEL_FROM_FILE__` and `__TAG_FROM_FILE__` before generalising; not probed). Recipe for inner-level dynamic selection: make the selection axis outermost (e.g. build with `__CROSS_PRODUCT_NESTED__` in that input order, or swap with Apply Rules), filter, and swap back only for publication. A static Apply Rules regex can't replace a run-time selection. Optional Galaxy help-text line: "Only the outermost identifiers of a nested collection are compared."

## Draft issue
**Title:** Collection patterns: identifier-file filtering acts on the outer level of nested collections only

`__FILTER_FROM_FILE__` given a `list:list` compares the file against the outer identifiers. Filtering the inner level (here: keeping resolution `1000` inside sample → resolution maps) silently removes every element: a release_26.1 probe returned 0 of an expected 2. The membership and nesting-swap patterns in `galaxy-collection-patterns.md` don't mention this, so a design that looks valid empties its collection at run time. The nf-core/hic wb2g build had to reorder its map outputs to resolution-outer.

Proposal: state the outer-level rule under "Membership" and in `sync-collections-by-identifier`, and add the recipe: put the selection axis outermost (cross-product input order or Apply Rules swap), filter, swap back for publication if needed.
