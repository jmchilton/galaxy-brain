# Design Subagents Plan

Six agents: 3 concepts × 2 editorial stances. They run in parallel and independently, and none
sees the others' work. All six use **Opus, high effort**.

Every agent reads `DESIGN_DOSSIER.md` first. Output goes to `./biodata_poster/designs/<slug>/`.

## Editorial stances

| Stance | Brief |
| - | - |
| **Grounded** (`-grounded`) | A moderate amount of detail. Real numbers from the evidence bank. Limitations are stated plainly and designed in, not hidden in a footnote: red/partial rows, gap ledgers, "in progress" items. Its tone: here's exactly what works today and what doesn't. |
| **Visionary** (`-vision`) | Leads with ideas and theory (dossier §3): the knowledge problem, the compiled wiki, tools-not-models, explicit gaps as a design principle, the recompile loop. It shows only the strongest evidence, mainly DengueSeq, the recompile instances and the preprint's 0/15 result. It leaves out weak or partial results (EGAPx, CWL, sarek, the validator blind spot) instead of hedging them. It never claims anything false or implies a benchmark rate. |

## The six agents

| # | Slug | Concept | Format / toolchain | Stance |
| - | - | - | - | - |
| 1 | `transit-grounded` | **A. Transit map** | HTML/CSS + hand-built SVG → PDF via Playwright Chromium | Grounded |
| 2 | `transit-vision` | A. Transit map | same | Visionary |
| 3 | `receipt-grounded` | **B. Run receipt / lab ledger** | Typst (`brew install typst` first; not installed) | Grounded |
| 4 | `receipt-vision` | B. Run receipt / lab ledger | Typst | Visionary |
| 5 | `specimen-grounded` | **C. Field guide / specimen plate** | HTML/CSS + SVG workflow graphs rendered from real `.gxwf.yml` | Grounded |
| 6 | `specimen-vision` | C. Field guide / specimen plate | same | Visionary |

### Concept notes passed to the agents

- **A. Transit map.**
  - Lines are source types: methods text, expert spec, Nextflow, CWL.
  - Stations are Molds/stages. The lines interchange at the validators: Tool Shed, gxwf, Planemo.
  - Every line terminates at a "Galaxy workflow" terminal.
  - Demo journeys are drawn on the lines, with incomplete track dashed.
  - Gap lists appear as "service notices" at each terminus. The system legend is the map key.
  - *Grounded:* all four lines, with CWL as "planned", EGAPx and sarek as partial journeys, and real
    gap counts.
  - *Visionary:* the methods-text and expert-spec lines are hero lines. Nextflow is one clean
    supporting line, and CWL is optional or "under construction". The map key teaches the theory.
- **B. Run receipt.**
  - The poster is a giant printed receipt from a real DengueSeq run: title block, build-provenance
    hash, stage-by-stage receipt, validation stamps and a long tear-off gap ledger.
  - Render the receipt from real run files in `~/projects/foundry-runs/dengueseq-denv3*`.
  - *Grounded:* a second, narrower receipt for a Nextflow run, with red items visible.
  - *Visionary:* one hero receipt, with margin annotations in a handwritten-style face explaining
    each idea (knowledge problem, tools decide, gaps are output, recompile).
- **C. Specimen plate.**
  - A natural-history plate. Each workflow is a "specimen": its real Galaxy graph, labelled with
    *origin* (the paper or spec), *habitat* (the pinned tools) and *known defects* (the gaps).
  - A central legend shows the system: wiki → Molds → skills → validators.
  - *Grounded:* 4–5 specimens including partial ones, with defects listed.
  - *Visionary:* 2–3 pristine specimens. A large "anatomy of a skill" plate (a Mold dissected,
    showing its references and provenance) carries the theory.

## Prompt template (filled per agent)

> You are design agent #N `<slug>` for a CSHL conference poster. Read
> `/Users/jxc755/projects/repositories/galaxy-brain/vault/projects/foundries/biodata_poster/DESIGN_DOSSIER.md`
> in full. Then read this plan's sections for concept `<X>` and stance `<stance>`. Work only in
> `.../biodata_poster/designs/<slug>/`.
>
> Produce the four deliverables in dossier §7. Render `preview.png` and look at it with the Read
> tool. Iterate at least twice on legibility from 2–3 m: is the hero message readable at 25% scale?
>
> Don't look at other `designs/` directories.
>
> Your final reply: 5 lines, covering the design idea, what you left out and why, `[[ASK]]` slots,
> and the rebuild command.

## Afterwards

1. I collect the six previews into one side-by-side comparison artifact so you can pick.
2. Then one revision pass on the winner (or a hybrid), fill in or drop the `[[ASK]]` slots, run a
   small test print, and the final export.

## Cost and time

Six parallel Opus agents with rendering and iteration: expect roughly 30–60 minutes wall time and a
large token spend. Running only 3 (one per concept, a single stance) would halve it.

## Unresolved questions

1. Title: "Papers and Conversations" or the full four-source title?
2. Anton's rnaseq/atacseq: allow `[[ASK]]` slots on the poster at all, or omit them entirely?
3. Print size: 44×44 square, or a safer 42×42?
4. Live results page: who hosts it, and at what URL? (It's needed for the QR.)
5. OK to `brew install typst` for agents 3 and 4?
6. Should Visionary skip the sarek/EGAPx promise entirely, even though the abstract names them?
