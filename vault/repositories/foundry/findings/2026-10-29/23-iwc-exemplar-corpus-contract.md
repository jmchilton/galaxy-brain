# compare-against-iwc-exemplar has no corpus input: it clones HEAD while the harness pins a fixture corpus, and it allows one exemplar for a whole-pipeline brief

- Target: galaxyproject/foundry (`content/molds/compare-against-iwc-exemplar/index.md` and its eval). Optional follow-up for jmchilton/galaxy-tool-util-ts: a subgraph option on `gxwf convert`. Not required. Foundry tracking needed: no, the target issue is the tracking issue.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29, phase 3 (Mold rev 12) and phase 1 (interface), 2026-10-29. Ledger: `iwc-exemplar-mold-silent-on-pinned-corpus-vs-clone`, `iwc-exemplar-single-exemplar-view-no-home-for-cross-workflow-idioms`, `interface-runtime-note-blocks-iwc-exemplar-precedent` (all minor).
- Existing issues/PRs: the interface entry is the same problem as [#673](https://github.com/galaxyproject/foundry/issues/673) (the "Do not read Foundry source files" Runtime Note reads as a blanket ban). Add this run as evidence there and don't file it again. Corpus pin and multi-exemplar parts: none. Related: #280 (closed; added the single gxformat2 view), #40 (exemplar match schema).
- chipseq: v0 (/home/ubuntu/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30, phase 3): ledger `iwc-exemplar-mold-ignores-supplied-corpus` (caller pinned iwc-src @ deafc4876f2c; corpus-reuse eval property N/A) and `iwc-exemplar-mold-nearest-only-misses-corpus-idioms` (nearest exemplar chipseq-pe answered no open idiom question; all came from corpus-wide scans) repeat both halves. New sub-item, ledger `iwc-exemplar-mold-silent-on-uninstallable-changesets`: six pins in the nearest/adjacent IWC workflows are not installable shed revisions (e.g. iuc/macs2 86e2413cf3f8, devteam/picard 3f254c5ced1d), and the exemplar view hands them on; the Mold should say it carries idiom, not pins (pin checking itself is #645).

## Symptom
(a) The harness gave the run a pinned corpus, `workflow-fixtures/iwc-format2` @ `deafc48`. The Mold says to clone or pull IWC into `~/.foundry/iwc`. The local clone was shallow, didn't contain the pin, and differed at HEAD (epigenetics/atacseq release 1.0 at the pin, 2.2 at HEAD with different tools, and `correlation-of-samples-on-peaks` only at HEAD). The agent used the pin and labelled HEAD-only facts "(HEAD)" ad hoc.
(b) For a ~160-step whole-pipeline brief, the nearest domain exemplar covered about 16 steps. The idioms the template needed most came from other workflows: `map_param_value` + `when`, gated subworkflows + `pick_value`, genomecov CPM, Apply Rules regroup, history-reference `bwa_mem`. The agent put them in an ad hoc "Cross-workflow pattern excerpts" section. The "relevant subgraph" sibling had to be pruned 27 → 16 steps by script, including renumbering repeat connections (MultiQC `results_N`), because `gxwf convert` has no slicing.
(c) The interface Mold's Runtime Note forbade reading the same corpus for interface precedent. It read it anyway as "caller-supplied evidence".

## Root cause
Confirmed from the Mold text:
- `index.md:104` hard-codes the corpus source: "Clone or pull and merge the IWC corpus ... to `~/.foundry/iwc`". No input declares a corpus path or revision, and no output records the SHA compared against. So a reader can't reproduce the comparison, and a pinned harness corpus has no standing.
- `index.md:44,48` (outputs): the notes carry "an inline, bounded gxformat2 excerpt of the nearest exemplar's relevant subgraph", and the sibling is the "nearest IWC exemplar's relevant subgraph". The summary says "exemplar(s)", but the outputs allow one view. There's no place for per-idiom excerpts from other workflows, and the Mold names no tool to extract "relevant subgraph".
- (c) is #673's root cause: `casts/claude/skills/workflow-brief-to-galaxy-interface/SKILL.md:70`.

## Proposed fix
1. Add an optional input `iwc_corpus` (path + revision). When it's given, it's authoritative. Otherwise clone and record the HEAD SHA. The notes must record the corpus SHA. A newer clone may be consulted for HEAD-only exemplars and newer tool versions, labelled as such.
2. Allow a bounded, labelled set of secondary excerpts (one idiom each, with workflow id + step labels + corpus SHA), next to the single nearest-exemplar view.
3. Pruning: give rules (keep the steps and their transitive inputs, drop unused outputs, renumber repeat connections) and require `gxwf validate --connections` on the sibling. Mention an upstream `gxwf convert --steps` option as a possible follow-up.
4. (c): comment on #673 with this run as one more case. The fix there (narrow the Runtime Note to the Foundry authoring tree) covers it.

## Draft issue
**Title:** compare-against-iwc-exemplar: accept a pinned corpus and record its SHA; allow per-idiom secondary excerpts

In an nf-core/atacseq Workflow Brief → Galaxy run (2026-10-29), the harness supplied a pinned IWC fixture corpus (`workflow-fixtures/iwc-format2` @ deafc48), but the Mold says to clone or pull IWC to `~/.foundry/iwc`. The clone was shallow, lacked the pin, and differed at HEAD (epigenetics/atacseq 1.0 vs 2.2, different tools; one relevant workflow only at HEAD). Nothing says which corpus is authoritative or requires the notes to record the SHA used.

The outputs also allow only one exemplar view. For a whole-pipeline brief the nearest domain exemplar covered ~16 of ~160 steps. The idioms the template relied on (map_param_value + when, gated subworkflows + pick_value, genomecov CPM, Apply Rules regroup, history-reference bwa_mem) came from other workflows and went into an ad hoc section. The sibling "relevant subgraph" was pruned by hand-written script, including renumbering MultiQC repeat connections, because `gxwf convert` has no slicing.

Proposal: an optional `iwc_corpus` input (path + revision) that is authoritative when given; a recorded corpus SHA; a bounded set of labelled per-idiom secondary excerpts; pruning rules plus a required `gxwf validate --connections` on the sibling.

Comment for #673:

> Another case, from an nf-core/atacseq wb2g run (2026-10-29): `workflow-brief-to-galaxy-interface`'s Runtime Note forbade reading the harness-supplied IWC fixture corpus for interface precedent. The agent read it anyway as "caller-supplied evidence" and logged feedback `interface-runtime-note-blocks-iwc-exemplar-precedent`. Narrowing the note to the Foundry authoring tree, as proposed here, would cover it.
