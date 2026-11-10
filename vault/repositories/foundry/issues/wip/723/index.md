---
related_records:
  - foundry/issues/678
  - foundry/branches/issue-723-authoring-gate
---

# #723 Require existing Galaxy/IUC/Tool Shed tools; prohibit replacement UDTs when a corresponding tool exists

[Issue](https://github.com/galaxyproject/foundry/issues/723) — opened by nekrut's AI assistant, currently only `needs-triage`. No comments, no PR or branch addresses it (`gh pr list --search 723` empty; no `*723*` branch).

## Proposed labels

- `roadmap/substep`: a rule on the discover-or-author branch, though wide. See question 3.
- Parent: #501 "Improved Support for Tool Development" (`roadmap/main`, `priority/mvp`). It owns the authoring branch, and #468 (the `author-galaxy-tool-wrapper` Mold) already sits under it. Alternative: #318, where #678 is staged, because discovery outcomes should be explicit and deterministic. #501 fits better because the core ask is a gate on authoring, not coordination state.
- `priority/mvp`: the evidence is the paper's own nf-core/rnaseq run, whose workflows embed duplicate tools. Matches "needed for the initial paper or for using the Foundry now with correct results".
- `work/ready-research`: well specified, but needs capabilities that don't exist and overlaps open issues (below), so the first move is a comment mapping requirements to files and proposing a split. Alternative: `work/human` if John wants to set the policy himself.
- No blocker labels.

## Derived status

`wip`, rule 2: AnastasiaSee's draft PR [#773](https://github.com/galaxyproject/foundry/pull/773) (opened 2026-11-10) hardens `author-galaxy-tool-wrapper` §1 for this issue. The labels in `issue_tags.md` are still unapplied. #773 covers only the authoring gate, not requirements 1, 5 and 6. Its gate still allows an explicit fallthrough, then says there is no override, and `author/eval.md:27-35` and `discover:106` keep the `weak` exception. Detail: [#678's record](../678/index.md).

## Findings

Verified on `origin/main` `51338d1d`. The issue cites `f48c01b6`; since then these three Molds changed only in an `advance-galaxy-draft-step` eval tweak, so its claims still stand.

- `discover-shed-tool/index.md:68`: a miss or low-quality hit falls through to authoring. `:106-107`: `weak` is "confirm or fall through", and also covers deprecated repos and stale-index suspicion, so existence and confidence are conflated.
- `advance-galaxy-draft-step/index.md:169`: "if no acceptable shed candidate emerges, fall through" (not cited by the issue). `:182`: a missing parameter or incompatible collection shape may escalate to authoring.
- `author-galaxy-tool-wrapper/index.md:67`: "do not duplicate existing wrappers unless discovery evidence is weak or missing". `:84`: a weak hit may proceed if the harness fell through.
- The same exception is encoded in `author-galaxy-tool-wrapper/eval.md:27-35` and `scenarios.md:25`, so a fix must change those too.
- `content/meta/harness-pipelines.md:60,97,141,158,175` hard-code the fall-through. `content/pipelines/` has six Galaxy-targeting pipelines naming these Molds: `cwl-to-galaxy`, `interview-to-galaxy`, `nextflow-to-galaxy`, `paper-to-galaxy`, `update-interview-to-galaxy`, `workflow-brief-to-galaxy`. This is the requirement 5 surface.

Evidence checked:

- Trajectory 1 at `nekrut/foundry-paper@6720c3ca` embeds six `GalaxyUserTool`s, including `matched_fastp_0234`, `matched_star_2710a` and `matched_salmon_alignment`.
- usegalaxy.org `/api/tools` today: the six installed wrappers in the issue's table return 200; `iuc/rsem/rsem_calculate_expression/1.3.3+galaxy0` returns 404.
- Tool Shed `iuc/rsem` exists, with sole installable revision `fcafc7ff30a2`, as the issue says.

Not verified: the visual report, the discovery receipts, the replacement candidates, any scientific comparison, wrapper port or output details in the table (for example fastp's merged reads). The feedback entry `existing-tool-must-block-udt-authoring` is not in Foundry content on main; it presumably lives in the run's ledger.

Why this is not `work/ready-implement`:

- Requirement 1 needs Galaxy-catalog and IUC discovery. Only `discover-shed-tool` exists; `:178` names `discover-tool-via-galaxy-api` as future work.
- Requirement 2 changes the discovery `status` enum (`hit`/`weak`/`miss`, `galaxy-tool-discovery.schema.json:18`) and collides with #678's staged `unsuitable` status.
- Requirement 6's tool-selection manifest and gate have no equivalent on main.

Related, all open and not addressing this directly:

- #678: a capability miss routes to authoring an existing wrapper. #723 is close to a superset.
- #655: correction 7a (same-version changeset move before authoring) and correction 8 (generic-wrapper route before authoring) sit on the same fall-through. Correction 8 needs reconciling with requirement 3's ban on hiding a bioinformatics executable in a generic scripting tool.
- #669: `repair-galaxy-draft-topology` deletion, the destination #678 proposes for a capability miss.
- #468: authoring Mold validation, under #501.

No upstream issue drafts: the work is all Foundry-owned. RSEM missing from usegalaxy.org is the install note the issue asks for, not something this issue waits on.

## Next

After labels: research comment mapping the six requirements and acceptance cases to files, with a proposed split and an order relative to #678 and #655.

Questions for John:

1. Merge #678 into this, or sequence them? If merged, #678's staged parent should match this one.
2. Does the hard invariant allow any exception for deprecated or broken wrappers? As written, any Tool Shed repo by any owner blocks authoring, while `discover-shed-tool` treats deprecated repos and unfamiliar owners as weak.
3. Stay `roadmap/substep`, or `roadmap/main`? It spans every Galaxy pipeline and adds a discovery leg.
4. What should a run do on a capability gap with no UDT allowed: stop, or finish with an open ledger entry? The issue says "unresolved workflow requirement", but the loop's blocking path goes to topology repair, whose budget is bounded.
