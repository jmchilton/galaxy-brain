@~/projects/repositories/jmchiltondotnet/AGENTS.md
# Converting Work to Slides

Decks are reveal.js MDX in jmchilton.net (`~/projects/repositories/jmchiltondotnet`). Work directly on `main` there: no branches, no PRs. Commit explicit paths with short messages (see `git log -- src/content/slides`). Don't deploy unless asked.

## Where things are

- Decks: `~/projects/repositories/jmchiltondotnet/src/content/slides/<slug>.mdx`, served at `/slides/<slug>`.
- Assets: `~/projects/repositories/jmchiltondotnet/public/slides/<slug>/`, referenced as `/slides/<slug>/<file>`.
- Layout, theme and component classes: `~/projects/repositories/jmchiltondotnet/src/layouts/SlideLayout.astro`. Read its CSS comments for the classes (`vstack`, `eyebrow`, `cards`, `callout`, `code-block`, figures, two-up, `.mermaid`) rather than inventing new styles.
- Design system and intent: `~/projects/repositories/jmchiltondotnet/GCC2026_SLIDE_REDESIGN.md`.
- Original integration plan (frontmatter schema, fragments, auto-animate): `~/projects/repositories/jmchiltondotnet/SLIDES_PLAN.md`. Partly stale; the layout file wins.
- PDF export: `~/projects/repositories/jmchiltondotnet/scripts/export-slides-pdf.js` (`npm run export:slides -- <slug>` against a running server).
- Dev: `make dev` (localhost:4321); checks: `make test`. See `~/projects/repositories/jmchiltondotnet/Makefile`.

Model a new deck on a recent one rather than on the plan:

- `src/content/slides/client-testing.mdx` - short argument, cover, extra-slides divider, `[Sources]` notes.
- `src/content/slides/foundry-pattern.mdx` - longer talk with SVG diagrams and Mermaid.
- `src/content/slides/gcc2026.mdx` - screenshots and demo placeholders.

## Conventions

- Cover: `<section class="galaxy-cover vstack" data-background-gradient="linear-gradient(135deg, #2c3143 0%, #25537b 100%)">`, title plus `<div class="source">John Chilton</div>`.
- One `{/* SLIDE N — purpose */}` comment per slide.
- Every factual slide gets `<aside class="notes">[Sources] …</aside>`: URLs, commits, file paths and what the numbers do and don't measure. No claim on a slide without a source in its notes.
- Diagrams: Mermaid (`<pre class="mermaid">`, copy the `%%{init …}%%` theme line from an existing deck) for flows; hand-made SVG in `public/slides/<slug>/` when Mermaid can't lay it out cleanly.
- Screenshots: copy into `public/slides/<slug>/` with descriptive names; give every `<img>` real `alt` text.
- Count slides against the time budget: about one minute per main slide.

## Deck types

Ask which type if the request doesn't say.

**Pitch (5 min, persuasive).** Problem in the audience's terms → the proposal → evidence it works (a real example, a number, a screenshot) → cost and risk, stated honestly → the ask. Lead with the hot take; cut anything that doesn't move the argument.

**Implementation overview (10 min).** What and why → high-level architecture diagram → the key components and how data flows between them → one walkthrough of a real path through the system → status, gaps, next steps. Add architecture diagrams wherever a box-and-arrow picture beats prose; reuse existing abstractions' names exactly as they appear in code.

**Critical decision (5 min).** Background in one or two slides → the decision to be made, stated as a question → one slide per option with the details that matter (cost, risk, migration, who it affects) → a comparison slide → recommendation, if there is one, clearly marked as such.

**Issue + spike recap.** The issue (link, symptoms, who hit it) → what the spike tried → results: screenshots, diagrams, numbers, branch/commit links → what's left and the proposed path. Pull material from the vault's issue and branch records (`vault/repositories/PROJECT/{issues,branches}/…`) and the spike's screenshots.

## Pitch Advice

The factory's ./PITCH_ADVICE.md (relative to this document) mostly applies as is - just interpret details as extra slides.

## Extra slides

Put supporting material that doesn't fit the budget (method details, alternatives considered, raw data, FAQ answers) after the main deck behind a divider:

```mdx
<section class="galaxy-cover divider vstack" data-background-gradient="linear-gradient(135deg, #2c3143 0%, #25537b 100%)">

<h2>Extra Slides</h2>

</section>
```

Extra slides don't count against the time budget. Add them whenever a likely question has a concrete answer.

## On Finish

Run `make test` to ensure the side builds, run `make dev` to start the dev server and check out at least a couple slides work.

Keep the dev server open and have a subagent take a pass at rendering polish. The subagent should be given the dev server link and should walk every slide and make sure images are the appropriate size, formatting is clear and makes sense, the style works as it should.

Then have another subagent make a pass at reviewing the slides for clarity, interest, and persuasiveness. Let it edit the content to strengthen the slides if needed and give a report of what could be done in the implementation/issue text/branch/spike/etc... to strengthen the topic.

If that subagent made big changes - repeat the subagent render polish process again one more time.

For each of these subagent calls - if there is a single relevant issue or branch directory for this work - write each subagents report to subagents/ under that directory. 

Finally:
- Commit the deck and its assets on `main` (explicit paths) and push.
- Report the slug, slide count (main + extra), estimated run time and any claims you couldn't source.
- Also offer to save the clarity agents' recommendations for polishing the source somewhere or launch a subagent to work on them as makes sense in context.

