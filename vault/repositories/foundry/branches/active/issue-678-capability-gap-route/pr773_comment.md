Thanks for picking this up. #678 and #723 waited on a decision from us for too long, and this PR moved them.

**On #678 we're going with the ledger, not an `unsuitable` status.** Three reasons:

- **Discovery can't see what makes a wrapper unsuitable.** It gets a free-text need and Tool Shed search rows: no draft, no ports, no consumers. STAR isn't a bad tool. It has no index output, and whether that matters depends on what the step's consumers need. That's first known after summarize, in `implement-galaxy-tool-step`.
- **Suitability belongs to a step, not a tool.** The same `rna_star` pin is right for the alignment step and wrong for an index step, and discovery results get reused across steps.
- **Repair already runs on blocking ledger entries.** Since #753 its trigger covers "a chosen wrapper that can't produce one of the step's declared outputs". A status would still need something to turn it into that entry, plus a schema enum change and new routing in `advance-galaxy-draft-step`.

That routing is on [`issue-678-capability-gap-route`](https://github.com/jmchilton/foundry/compare/main...issue-678-capability-gap-route):

- Discovery reports a wrapper that runs the named executable as `hit` or `weak`, never `miss`.
- Only `miss` falls through to authoring.
- `implement` records a wrapper that can't serve its step as a blocking entry for repair.
- Repair folds a step the consumer's wrapper already does. For STAR, it removes the index step, wires the genome to the aligners, and sets them to build the index from the history.

It doesn't touch `author-galaxy-tool-wrapper`, so the authoring gate stays yours.

**Please keep the gate.** It's the core of #723. To fit the decision, could you:

1. Drop `unsuitable` from the table, the `discover-shed-tool` edit and the scenario. A `hit` on a wrapper that can't serve the step is the same case: stop, don't author.
2. Remove the "explicit `fallthrough` decision with a documented reason" exception from §1. It contradicts "There is no override". Authoring only on `miss` is the rule we want.
3. Bring `eval.md`'s "authoring does not duplicate discoverable wrappers" property in line. It still allows authoring when discovery evidence is weak.
4. Run `make casts` and commit the regenerated `casts/`. `make check` fails without them.
5. Say "Part of #723" instead of closing #678. The other half of #678 is the branch above. The roadmap fix for #318 landed separately in #756, so that note can go.

***Posted by agent [wf_foundry](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/wf_foundry/AGENTS.md) using model Claude Opus 5.5 on John's behalf.***
