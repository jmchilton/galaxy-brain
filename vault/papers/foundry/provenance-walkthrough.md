# Provenance walkthrough (Figure 3 / SI S2 / Evidence req #6)

A worked trace of one `SKILL.md` instruction back through `_provenance.json` to its Mold and its source reference, with the byte-identity **recomputed and verified**, not asserted. This satisfies Evidence requirement #6 and is the concrete instance behind Figure 3.

All paths are in the Foundry repo at commit `e54b9d4` (`implement-galaxy-workflow-test` Mold revision 7). Cast: `casts/claude/skills/implement-galaxy-workflow-test/`. This Mold sits in the demonstrated `interview-to-galaxy` spine (phase: implement-test).

## The chain (top → bottom)

**1. The instruction in the generated skill.**
`SKILL.md` step "Author assertions" tells the runtime agent:

> Materialize the plan's assertion intent into concrete output assertions. **Choose assertion families and tolerances per planemo-asserts-idioms**; check each shortcut against iwc-shortcuts-anti-patterns so an existence-only or size-only assertion is a deliberate choice, not an evasion.

The same skill declares the reference and its disclosure trigger:

> `references/notes/planemo-asserts-idioms.md`: Research note copied verbatim into the bundle. Choose assertion families, tolerance magnitudes, and the static/Planemo validation loop. **Use when:** writing or revising output assertions for a Galaxy workflow test file.

This is progressive disclosure in the artifact: the instruction names the note, the note is carried on-demand, and the trigger says when to open it.

**2. The provenance record.** `_provenance.json` `refs[]` carries the matching entry:

```json
{
  "kind": "research",
  "mode": "verbatim",
  "ref": "[[planemo-asserts-idioms]]",
  "src": "content/research/planemo-asserts-idioms.md",
  "dst": "references/notes/planemo-asserts-idioms.md",
  "used_at": "runtime",
  "load": "on-demand",
  "evidence": "corpus-observed",
  "src_hash": "9d87cd37efcc3f5e3a378011892f3846c8fdecec7a5765193044d71edb746ed9",
  "dst_hash": "9d87cd37efcc3f5e3a378011892f3846c8fdecec7a5765193044d71edb746ed9",
  "source": "deterministic"
}
```

`src_hash == dst_hash` and `source: deterministic` is the claim: the cast copied the note verbatim, no LLM in the path.

**3. The source note in the knowledge base.** `content/research/planemo-asserts-idioms.md` (`type: research`, `subtype: component`, revision 6). This is the human-inspectable, single source a maintainer edits once.

**4. The Mold manifest that drove the copy.** `content/molds/implement-galaxy-workflow-test/index.md` declares the reference in its typed `references:` block — the same metadata the validator audits and the caster dispatches on:

```yaml
- kind: research
  ref: "[[planemo-asserts-idioms]]"
  used_at: runtime
  load: on-demand
  mode: verbatim
  evidence: corpus-observed
  purpose: "Choose assertion families, tolerance magnitudes, and the static/Planemo validation loop."
  trigger: "When writing or revising output assertions for a Galaxy workflow test file."
```

The Mold itself is pinned in provenance: `path content/molds/implement-galaxy-workflow-test/index.md`, `revision 7`, `content_hash 7f68fe27…`, `commit e54b9d4`.

## Verification (recomputed, not asserted)

```
$ shasum -a 256 content/research/planemo-asserts-idioms.md \
                casts/.../references/notes/planemo-asserts-idioms.md
9d87cd37…f6ed9  content/research/planemo-asserts-idioms.md
9d87cd37…f6ed9  casts/.../references/notes/planemo-asserts-idioms.md   # identical
# matches _provenance.json src_hash AND dst_hash

$ shasum -a 256 content/molds/implement-galaxy-workflow-test/index.md
7f68fe27…f82a   # matches _provenance.json mold.content_hash
```

Both recomputed digests equal the recorded ones exactly. A reviewer can: (a) confirm the skill instruction came from a specific note, (b) confirm the note was copied unmodified, and (c) confirm the Mold body is the exact revision recorded — all from the committed repo, no trust required.

## Figure 3 panel sketch

Four stacked boxes with downward arrows, the hash carried on the arrows:

```
SKILL.md  "Choose assertion families and tolerances per planemo-asserts-idioms"
   │  (on-demand reference, trigger: "when writing output assertions")
   ▼
references/notes/planemo-asserts-idioms.md      ── sha256 9d87cd37… ──┐
   │  _provenance.json: kind=research, mode=verbatim, deterministic   │ equal ⇒ verbatim
   ▼                                                                  │
content/research/planemo-asserts-idioms.md      ── sha256 9d87cd37… ──┘
   │  declared in Mold references[] manifest
   ▼
content/molds/implement-galaxy-workflow-test/index.md  (rev 7, content_hash 7f68fe27…, commit e54b9d4)
```

## Honesty notes

- The source note carries `ai_generated: true`; its `evidence` tier is `corpus-observed` (declared in the manifest). Provenance proves *where the bytes came from and that they were copied unaltered* — it does not, by itself, certify the note's content is corpus-earned. That is the separate corpus-first discipline the manuscript already flags as an audit aid, not a guarantee.
- Line numbers are omitted from quotes because `SKILL.md` is regenerated; quotes are pinned by commit `e54b9d4` instead.
- This is a *deterministic* (verbatim) reference, the cleanest trace. An LLM-condensed reference would instead show `source: llm` with the prompt identity and model recorded — a second walkthrough worth adding to SI to show that path too.
