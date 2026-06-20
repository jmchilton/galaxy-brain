# Figures

Production tracker. Captions live in the manuscript's Figures section; this file records the source artifact and status for each.

| Fig | Concept | Produced from | Status |
|---|---|---|---|
| 1 | Knowledge base → skill | Diagram: Pattern/Mold/Pipeline/Schema → casting compiler → cast (refs + provenance) | TODO draw |
| 2 | Progressive disclosure | Diagram: skill body upfront, references opened on trigger | TODO draw |
| 3 | Provenance walkthrough | Real `SKILL.md` excerpt + its `_provenance.json` entry from an existing cast | TODO — pick a clean cast; gated on choosing the case-study Mold |
| 4 | Case-study flow | Real completed case study (source → summary → design Molds → draft → `gxwf` validate) | **blocked** on case study (`case-study.md`) |
| 5 | Workflow draft resolves (Deferred → Identity-pinned → Resolved → promoted + `gxwf` green) | One real step shown at three resolution tiers over fixed topology | can be instantiated from a real draft progression; the "under-determination as a typed state" figure |
| 6 | Draft extraction (draft + planned overlay → extracted concrete subset, promoted to `GalaxyWorkflow`) | `figures/mobile_reformat_draft.png` + `figures/mobile_reformat_extracted.png` (MRSA step-07; see `figures/MANIFEST.md`) | assets in hand; captioned + body callout wired (`Figure 6`); **mechanism figure, not case-study evidence** |

Notes:
- Figures 1–2 are conceptual and can be drawn now.
- Figure 3 can be instantiated from any current cast independent of the case study; Figure 4 cannot.
- Figure 5 (draft resolution) is the visual payoff for the Discussion's "Under-determination as a typed state" — strong slide material; needs a clean three-tier step example.
- Figure 6 (draft extraction) illustrates the `draft-extract` projection that `draft-validate --concrete` validates; it pairs with Figure 5 but shows projection, not per-step resolution. Assets depend on the `parsed_tool_fixes` renderer fix and the `draft-validate-concrete` branch (see `figures/MANIFEST.md`). Keep out of the Evidence section.
