# Convergence plan — the reading surface (`@galaxy-foundry/site-kit`)

Axis: extract the shared reading surface of a Foundry instance into a seventh substrate package,
so Part 2 of `standing-up-a-foundry.instructions.txt` collapses from "stand this up by hand" to
"install and configure", and a new instance gets a working site out of the box.

Surveyed 2026-08-02 against `origin/main` of foundry-pattern, foundry,
statistical-genomics-foundry, foundry-lib.

Status: **Phase 1 complete.** 1a/1b merged in all three repos; 1c in review. No `site-kit` package
was needed — see the revision note at Phase 1; the name in this document's title now applies only
to Phase 2, which is not started and not yet decided.

| | |
| --- | --- |
| `resolveWikiLinksInMarkdown` | merged, `wiki-links@0.3.0` — jmchilton/foundry-lib#32 |
| adopt in statistical-genomics | merged — jmchilton/statistical-genomics-foundry#137 |
| adopt in galaxy-workflow | merged — galaxyproject/foundry#424 |
| Phase 0 range bump | done inside both adoption PRs, for `wiki-links` and `license-policy` only. The `kind-manifest` 0.3→0.4 bump on the pattern site is still open in galaxyproject/foundry-pattern#22, because it turns on the zod-peer question. |

Both instances' glossaries were corrupting the entry that defines a syntax, and neither had a
check that could see it. That is the finding worth carrying into the checklist.

| 1c — root anchoring | galaxyproject/foundry#425, jmchilton/statistical-genomics-foundry#138, galaxyproject/foundry-pattern#26 |

**1c settled §2 against §5, and the answer was §5's.** §2 listed `contentRootFrom(rootUrl)` as a
package export while §5 opened by saying neither of its lessons is one. No package: the anchor is
three lines wrapping an import only Astro can resolve, it exists in two instances because it was
ported rather than arrived at independently, and a package would ship the wrapper without the
knowledge. What shipped instead is a `repo-root.ts` per instance, a **guard test** per instance,
and the rule in Part 2 of the checklist. It is also named `REPO_ROOT`, not `contentRootFrom`: the
module that had actually broken needed `casts/`, not `content/`, and the content root derives from
the repo root rather than the other way round.

**1c was not a latent hazard.** The flagship's `/usage/` page was shipping `Pipelines 0 / Shared
skills 0 / Casts 0` against 54 committed skills, and 54 pages were not being built — the build
reported 316 and passed where it should have said 370. Measured, not inferred: probing
`import.meta.url` from a page, a component and a lib module during a build showed all three
collapse to `site/dist/.prerender/chunks/`, four levels below the repo root. Three hops from
`site/src/lib/` therefore land on `site/`. statgen's two Mold pages use the same idiom and were
correct only because `src/pages/molds/` is also four deep.

The finding worth carrying is not the bug. The flagship had already diagnosed this once in
`MoldHealth.astro` and written the explanation into a comment atop the module it created to hold
the fix — and then repeated it one directory over, because the next author had no way to know that
module existed. **A fix applied to a module does not generalize; only a test does.** That is what
the checklist bullet now says, and the reason 1c produced a guard in each repo rather than a
helper in a package.

---

## 1. What the evidence actually supports

The first pass of this survey counted filename overlap across the three sites and got ten hits.
That was the wrong measure, and two of the hits are the substrate **working as designed**:

- `wiki-links.ts` and `remark-wiki-links.ts` exist in all three repos, and all three already import
  `@galaxy-foundry/wiki-links` + `/remark`. What is left in each file is the **link map**, which the
  checklist explicitly assigns to the instance ("Ships NO LINK MAP: which notes exist and what each
  is addressable by is your data"). Three different keying rules — basename + Mold `name` + `tool
  command` pair; collection key + design docs; de-prefixed filename — is the seam holding, not
  duplication. **Nothing to extract.**
- `content-files.ts` exists in foundry (59 lines) and statgen (75 lines) and the two share no
  function. foundry's answers "where is `content/`, and what sits beside this note"; statgen's
  answers "which files in this collection are notes". Same name, different job. **Nothing to
  extract** — though see §5, the name collision is worth fixing and each file contains a lesson the
  other repo has not learned.

What survives the correction is smaller, and better evidenced:

| File                      | foundry | statgen | Divergence                                                                                                              |
| ------------------------- | ------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| `layouts/Base.astro`      | 43      | 42      | **7 lines**: site description, title suffix, `max-w-6xl` vs `max-w-5xl`, one dead `pageTitle?` prop                     |
| `components/Footer.astro` | 14      | 15      | shell identical; the links differ                                                                                       |
| `lib/licenses.ts`         | 38      | 37      | **code identical**; every diff line is a comment or a doc example (`nf-schema` vs `msmb`)                               |
| `lib/render-vault-doc.ts` | 45      | 48      | `slugifyTerm` + `addBoldTermAnchors` character-identical; entry point differs (abs path vs filename-under-`../content`) |
| `components/Header.astro` | 186     | 107     | same nav model (`{href,label,match}` + overflow group), same classes, different vocabulary                              |
| `styles/global.css`       | 535     | 119     | statgen's is a subset, headed "inherited from the Galaxy Workflow Foundry palette"                                      |

Roughly 250 lines of near-verbatim code plus a design-token layer.

**Name the weaker evidence out loud.** The checklist's rule is that a thing moves into the
substrate once two instances have *independently arrived* at it, and that is not what happened
here. foundry's `licenses.ts` carries the comment:

> (Pattern cribbed from statistical-genomics-foundry's `lib/licenses.ts`; the repos share no code.)

That is a crib, not convergence. It still qualifies — but under the checklist's *other* arm, the
one the kind-manifest reader and the license table came in under: **one file living in two
places**. Say which arm applies, because it changes what belongs in the package. Independent
convergence is evidence that a *design* is right and can be generalized. A crib is evidence only
that *this exact code* is duplicated. So the package takes the duplicated code and nothing
adjacent to it.

**The counter-argument, which the plan is shaped around.** Presentation is the layer most likely to
diverge legitimately, and there is already proof: foundry-pattern's `Base.astro` (75 lines,
heat-strip, ember/soot palette, display font, inline header and footer) is a deliberately different
site, and it should stay that way. A shared visual shell that every consumer overrides is worse
than two copies, because the override sites become the drift. So the package ships the
**non-visual** half with confidence and the visual shell narrowly and opt-in, holding only what is
byte-identical today: the document skeleton, the theme-toggle script, the skip link, the nav model.
Never the palette, never the utility classes.

---

## 2. The seam

Same discipline as the six existing packages: the package ships the FORMAT or the MACHINERY, the
instance supplies the CONTENT.

| Export | Ships | Stays yours |
|---|---|---|
| `renderVaultDoc` | the loose-doc pipeline: wiki-link resolution, markdown render, `#term` anchor injection | the link map, the `marked` instance, which files are vault docs |
| `licenses` | the `LICENSES/` reader and route-key derivation (`LICENSES/x.LICENSE` and bare `x.LICENSE` → `x`) | the directory's contents |
| ~~`contentRootFrom(rootUrl)`~~ | **not a package export** — settled by 1c; see the status block. The rule went to the checklist, a `repo-root.ts` and a guard test to each instance. | |
| `Base.astro` | document skeleton, theme script, `data-pf-theme`, skip link, header/footer slots | site name, description, container width, everything visual |
| `Header.astro` | the nav shell and the active-link model | the nav vocabulary, passed as data |
| `tokens.css` | the design-token names | the values, and every component class |

Composition point per package, as with the existing six — one wrapper keeping the signature callers
already use, and every other call site importing from the package directly.

---

## 3. Packaging

Home: `jmchilton/foundry-lib`, as `@galaxy-foundry/site-kit`. That repo already has the machinery —
changesets, `publint`, `attw`, `knip`, typedoc, per-package `tsc` builds.

**The `.astro` half does not fit that build model**, and this is the plan's main technical risk.
Every existing package builds with plain `tsc`, which cannot compile `.astro`. A component package
must ship **source**, with `exports` pointing at `./src/components/*.astro`, and a `build` that runs
`tsc` over the TS half only. Three consequences to handle rather than discover:

- `pnpm lint:packages` runs `attw --profile esm-only --entrypoints .` — a non-JS entrypoint needs
  that call scoped or the new package exempted.
- Tailwind 4 scans source for class names and will not look inside `node_modules` unless told. The
  consumer's CSS entry needs `@source "../../node_modules/@galaxy-foundry/site-kit/src"`. **Miss
  this and the site builds clean and renders unstyled** — the same shape as the astro-7
  `remarkPlugins` trap: a silent default, a green build, a broken page.
- Astro may need `vite.ssr.noExternal` for a package shipping unbuilt `.astro`.

This is why the phases are ordered as they are: Phase 1 is pure TS and fits the existing model with
no new machinery; Phase 2 is where the packaging questions get answered, and it can be abandoned
without losing Phase 1.

---

## 4. Phases

### Phase 0 — unstick the ranges (precondition, ~30 min) — **DONE**

`foundry-lib` publishes `license-policy@0.2.0` and `wiki-links@0.2.0`. **Every consumer pins
`^0.1.0`**, and a caret on a 0.x version does not cross a minor — so all three repos are silently
running the previous minor of two packages. The checklist documents this exact failure ("nothing
fails while it is not done — you keep the old package") and it is currently live in all three
repos.

Bump by hand in foundry (root + `site/` + `packages/note-schema/`), statgen (`site/`),
foundry-pattern (`site/`). Verify what landed on disk, not what the range permits. Do this before
adding a seventh package to trees that are already two minors behind on two of six.

Tracked alongside the toolchain-floor work in galaxyproject/foundry-pattern#22.

**Done, alongside Phase 1's adoption** — galaxyproject/foundry#424,
jmchilton/statistical-genomics-foundry#137. Both instances now pin `license-policy@^0.2.0` and
`wiki-links@^0.3.0`, checked on disk rather than read off the range.

### Phase 1 — the pure-TS half — **DONE**

**Revised on contact with foundry-lib, 2026-08-02. There is no `site-kit` package in this phase.**

Two of the three items were already built and released in `0.2.0` (PR #28, "Absorb two site
helpers both instances had written twice") and had not been adopted only because every consumer
pins `^0.1.0` — Phase 0. And they did not land in a new package: `license-policy` took the
licenses reader, `wiki-links` took the anchors. **Each helper went to the package that already
owns the concept**, which is a better answer than a `site-kit` grab-bag and is now the precedent.
A new package is needed only for the `.astro` half, if Phase 2 happens at all.

So Phase 1 is one gap plus adoption:

| | status |
| --- | --- |
| 1a — vault-doc link resolution | **the only new code**; done, PR jmchilton/foundry-lib#32. **Adopted in both.** |
| 1b — `licenses` | already shipped as `license-policy@0.2.0` (`loadLicenseFiles(dir)`, `findLicenseFile`, `licenseIdFromFile`); directory is a parameter, as intended. **Adopted in both.** |
| 1a — anchors | already shipped as `wiki-links@0.2.0` (`addBoldTermAnchors`, `slugifyTerm`). **Adopted in both.** |
| 1c — `contentRootFrom` | **settled, and not as an export** — the rule went to the checklist, a `repo-root.ts` and a guard test to each instance. See §5. |

After 1a, `renderVaultDoc` is four calls — read the file, `resolveWikiLinksInMarkdown`,
`marked.parse`, `addBoldTermAnchors` — three of them from packages. That is thin enough that it
should stay in each instance rather than become an export: shipping it would mean the substrate
takes a dependency on `marked`, and the composition is the instance's to make.

**1a. The vault-doc link resolution — and the live defect it fixes.**

Both copies hand-roll `/\[\[([^\[\]]+)\]\]/g` over **raw markdown**, before `marked` parses. The
checklist's rule is that a backtick means the syntax, not a link, and the remark transform on the
other pipeline honours it. This one does not. The result, reproduced against the site's own
`marked`:

```
source:   **Wiki link** — `[[Target]]`. First-class in typed frontmatter fields.
rendered: <p><strong>Wiki link</strong> — <code>**Target**</code>. First-class …
```

That is `statistical-genomics-foundry/content/meta/glossary.md:91` as it renders today. The
glossary entry that *defines* the wiki-link syntax is the one the renderer corrupts, and it is
invisible to every check: the validator strips code spans before scanning, so both surfaces are
blind at once — precisely the failure the checklist warns about ("One instance accumulated 63 of
them across 12 files").

The flagship has the same bug, found while verifying the fix — `content/meta/glossary.md:67`, the
entry defining what a Phase is:

```
source:   … Either Mold-shaped (`mold: [[...]]`, optionally `loop: true`) …
renders:  … Either Mold-shaped (`mold: **...**`, optionally `loop: true`) …
```

`[[...]]` slugifying to the empty string is already documented in `wiki-links` as one of the two
links prefix-matching ever "resolved". Two instances, two corrupted glossaries, both on the entry
that names a syntax.

**Done** — `resolveWikiLinksInMarkdown` in `@galaxy-foundry/wiki-links`, PR
jmchilton/foundry-lib#32. The red was made non-vacuous on purpose: the naive implementation both
instances ship was committed first, and it passes the 5 prose cases while failing all 10
code-region cases. Masking covers fenced blocks and inline spans, and explicitly does not cover
indented or HTML blocks.

**Adopted in both**, verified 2026-08-02 by reading the modules rather than the PR titles: each
`render-vault-doc.ts` is now the four-call composition, resolving through
`resolveWikiLinksInMarkdown` with a `resolve` deliberately identical to the remark plugin's, so the
two pipelines cannot answer differently about the same text.

**1b. `licenses` — adopt `license-policy@0.2.0`. Done in both.** Each `lib/licenses.ts` is now the
composition point §2 describes: twenty lines, holding the one fact the package declines to know —
where the directory is — and nothing else.

**1c. `contentRootFrom(rootUrl)`.** Settled, and not as an export. See §5.

Gate for 1a–1c in each instance: `astro check` + `astro build` + the site test suite, plus **one
rendered-output assertion per adopted module**. A clean build is not evidence — it is what both
success and silent breakage look like here.

### Phase 2 — the `.astro` half (gated on Phase 1 landing cleanly)

`Base.astro` first, since it is 7 diff lines out of 42. Then `Footer.astro`, then `Header.astro` as
a shell taking its nav as data. `tokens.css` last, or not at all.

Red-to-green is different here, because a component has no unit behaviour worth asserting. The
assertion is on **built HTML**: build the site, parse `dist/`, and assert the skip link, the theme
script, the `data-pf-theme` attribute, and — the one that catches the Tailwind miss — that a class
the shared component declares is present in the emitted stylesheet. Write that test against the
*current* hand-rolled components first, watch it pass, then swap in the package and watch it keep
passing. A test written after the swap proves nothing about what the swap changed.

~~foundry-pattern already asserts against built output rather than reading claims off the page
(#17, #18) — reuse that harness rather than building a second one.~~ **Wrong, and backwards.**
#18 moved foundry-pattern the OTHER way: its title is "the catalog's claims are checked, not read
off the built page", and it replaced reading rendered HTML with unit tests over the lib functions,
for good reasons (the corpus could not reach the `identical` flag at all). No built-output harness
existed in any of the three repos.

**Step 1 is now done** — galaxyproject/foundry#427, jmchilton/statistical-genomics-foundry#140.
Seven assertions per instance over every built page, each falsified by breaking the thing it names.
Two did not work as written:

- the theme check passed with the pre-paint script deleted, because the header's theme TOGGLE sets
  the same two things on click — whole-page string matching cannot tell two scripts apart;
- **the Tailwind canary created its own evidence.** statgen's `site/tests/` sits inside the Vite
  root, so automatic source detection scanned the test, and naming `min-h-dvh` in the assertion put
  it in the stylesheet. The test passed with the layout stripped. Fixed with `@source not` for the
  test directory. foundry's copy escaped only because its tests live above the Vite root — luck,
  not design, and now recorded as a comment because moving the file breaks it silently.

The second one is the Phase 2 risk in miniature: the assertion that exists to prove Tailwind
scanned a file was satisfied by Tailwind scanning the assertion. Worth carrying into the checklist
whatever happens to Phase 2 — a test that names a class it is checking for is not neutral about
the thing it checks.

**Step 2 — name the values.** galaxyproject/foundry#429, jmchilton/statistical-genomics-foundry#141.
`site-identity.ts` in each instance; `Base.astro` byte-identical afterwards. The container width
was converged rather than parameterized — see unresolved question 4, and the general form there.

**Step 3 — make the nav data.** galaxyproject/foundry#431,
jmchilton/statistical-genomics-foundry#143. `Header.astro` byte-identical too, so the whole shell
except `Footer.astro` is now one file living in two places. `{href, label, match}` became
`{path, label}` plus a visible count: fifteen of the sixteen `match` closures were the same line,
and the sixteenth excluded a route pair that has never existed in either repo. A closure cannot be
passed to a shared component or read from a file, which is what made this a precondition rather
than tidying. The overflow group is now a slice of one list, so it is present in both instances and
renders in one — the cut point is a measured count (wordmarks of 75px and 279px), not a decision
about which sections matter.

**And a third harness defect, of the same family as the other two.** Vitest mirrors
`import.meta.env` into `process.env`, `BASE_URL=/` included. The child `astro build` in
`ensureBuilt` inherited it and preferred it over `astro.config.mjs`, so **both instances' harnesses
had been asserting against a site built at the wrong base since step 1 landed** — every link
root-relative, every page built, every assertion green. Nothing read an href until step 3 did.

That is now three for three: every defect this harness has found was found by an assertion reading
something no earlier assertion had read, and in all three cases what was wrong was the harness. The
checklist bullet is not "assert on built output" but **assert on the specific bytes the reader
depends on** — presence checks pass on a broken page, and the build environment is part of what is
under test.

**Step 5 — the footer.** galaxyproject/foundry#432, jmchilton/statistical-genomics-foundry#144.
**`Base.astro`, `Header.astro` and `Footer.astro` are now byte-identical across both instances.**
The extra links became a `FOOTER_LINKS` list in the same `ShellLink` shape as the nav, rendered
before the repository link both instances always carry — empty in one, one entry in the other.

The copyright year was deleted rather than converged, and that is the first value in this sequence
NOT settled by provenance alone. Provenance said the usual thing (born with the flagship
2026-04-30, copied without it 2026-06-26, never revisited), but the deciding argument is that
`new Date().getFullYear()` runs at BUILD time: the same commit renders differently across a new
year, and **every check on this shell is a diff against built HTML**. A build that is not
reproducible from its source makes its own verification unreadable. Worth the checklist on its own:
nothing in the reading surface may read the clock.

**What this means for Phase 2.** The premise has changed since §1 was written. The estimate there
was "roughly 250 lines of near-verbatim code" measured as a *diff*; the shell is now three files
with a zero diff and a config module beside them. Phase 2 is no longer "extract and generalize" —
the generalizing is done, in-place, and what remains is purely the packaging question in §3. If
that question answers badly, the instances keep everything they have gained and the finding is
narrower and more interesting than "the visual shell did not transfer": it transferred completely,
and could not be *shipped*.

**Stop condition.** If the Tailwind `@source` or the unbuilt-`.astro` export turns into more than a
day, ship Phase 1 and write Phase 2 up as a rejected option in the checklist. 250 lines of shared
presentation is not worth novel packaging machinery, and the honest finding — *the visual shell did
not transfer* — is worth as much to the pattern as the package would be.

**Step 4 — the packaging spike. Run 2026-08-02; all four questions answered in well under the stop
condition.** A throwaway `@galaxy-foundry/site-kit` was built in `foundry-lib`, packed with
`pnpm pack`, installed into the flagship's site from the tarball, and imported by a real page. The
spike lives on the local branch `spike/site-kit` in foundry-lib — committed, never pushed.

| | Answer |
|---|---|
| Unbuilt `.astro` from a `tsc`-only repo | **Works, no new machinery.** `include: ["src/**/*.ts"]` builds the TS half and ignores the `.astro`; `files: ["dist", "src"]` ships both. The consumer imports `@galaxy-foundry/site-kit/components/Chrome.astro` and Astro compiles it. `astro check` even enforces the component's `Props` across the boundary — a wrong prop type is 1 error at the consumer. |
| `attw --profile esm-only --entrypoints .` | **Passes — because of the `--entrypoints .` already in the script.** Drop that flag and the `.astro` subpath is 💀 *Resolution failed* on both node16-ESM and bundler. `publint` is clean either way, and `lint:packages` is green across all seven packages. No exemption is needed; what is needed is knowing that an existing flag is now load-bearing. |
| Tailwind `@source` into `node_modules` | **The trap is real, and so is the fix.** Without the directive: build green, 375 pages, zero warnings, and the class the package declares has NO rule in any emitted stylesheet — the page renders unstyled. With `@source "../../node_modules/@galaxy-foundry/site-kit/src"`: present. Tailwind follows pnpm's symlink into the store, so the ordinary install layout is fine. |
| `vite.ssr.noExternal` | **Not needed.** Astro resolved and compiled the package's `.astro` with no Vite configuration at all. |

**The finding that matters is not in the table.** A **typo'd `@source` is exactly as silent as a
missing one** — `site-kitt` instead of `site-kit` builds green, 375 pages, no warning, class absent.
So the consumer-side fix has the same failure mode as the bug it fixes, and cannot be verified by
reading it. What closes the loop is already built: pointing `built-shell.test.ts`'s
`LAYOUT_ONLY_UTILITY` at a class the PACKAGE declares fails with the right message in both cases —
measured, by deleting the directive and watching it go red.

**Verdict: Phase 2 is feasible.** The cost is two lines of consumer config and one canary
assertion per consumer, and the canary is non-negotiable rather than nice to have. What remains to
decide is not *can it ship* but *should it* — see unresolved question 2, which the zero-diff shell
has already reframed.

**Step 6 — the package. Built and merged, jmchilton/foundry-lib#37.**
`@galaxy-foundry/site-kit`: `SiteShell.astro` plus `SiteIdentity`, `ShellLink`, `resolveNav`,
`CONTAINER`. All four spike answers held at full size. Nine CI gates green.

Three things the spike did not reach:

- **The container measure did not become a prop, and that was the design decision of the phase.**
  Both instances had converged on `max-w-6xl` before the shell moved, so the kit holds it. The
  instance's own note had asked for exactly this — *"the first thing that should LEAVE this file"* —
  and question 4's lesson says why: parameterizing it now would hand a settled accident back out as
  a policy. `navVisible` stayed a prop, because 5 vs 6 is a measured difference.
- **`resolveNav` is tested for the first time.** Sixteen `match` closures across the two instances
  and no test between them, because a closure cannot be asserted on without building a site. As
  data it is fourteen cases, two of them falsified. One falsification exposed a *weak test* — the
  base-comparison case passed under the mutation it was written for — which was rewritten.
- **Smoke asserts the `.astro` files are in the tarball.** `exports` points at source here, and
  every other check in the repo reads the source tree, where they are present either way.

**Adoption is verified, and it is a zero diff.** The flagship builds 374 pages with no rendered
difference from a build of the same commit in the same worktree, once Astro's scoped-style hashes,
asset filenames and whitespace are normalized. Two things only the diff caught: import order in the
composition point decides where the stylesheet `<link>` lands (putting the component import first
moved it after every page's scoped `<style>` on 19 pages and dropped Tailwind's license banner),
and a baseline built in a *different worktree* is not a baseline — generated packages differ.

The existing canary needed no new mechanism. `min-h-dvh` was already asserted, and the move is what
armed it: the class is now named by the kit and by nothing in the repo. Falsified twice — deleting
the `@source` line and misspelling it both build 374 pages green and both fail that one assertion.

**Blocked on a manual step, by design.** Trusted publishing is configured on a page that does not
exist until the package does, so the first version of any new package has to be published from a
laptop — `pnpm publish --no-git-checks --no-provenance --tag stub`, then the trusted publisher on
npm, then the Version Packages PR. See `docs/development/publication.md` there. The two consumer
PRs are written and verified against a packed tarball; they cannot land until the package resolves
from npm.

### Phase 3 — the checklist

Part 2 currently spends ~70 lines telling an author to stand up the reading surface by hand. After
Phase 1 it becomes: install the kit, wire the composition points, and here are the two silent
defaults that still bite (astro 7's `markdown.processor`, `compressHTML: true`). The wiki-link
section stays as-is — it describes a seam that is working.

`INHERITED vs. SUPPLIED` gains the kit in the INSTALLED grade, and the MECHANICAL column loses the
Astro app but keeps the rest.

Also record what did **not** move and why: the link map (deliberate), `design-docs.ts` (70 vs 236
lines, both mid-migration to a `meta` kind for domain reasons), the palette, and — if Phase 2 is
abandoned — the shell. The checklist already treats "what the evidence kept out" as instructive;
this is more of it.

---

## 5. Three lessons to transfer, package or no package

None is duplication, so none is a package export. All three are cases where one instance has a fix
the other will eventually need, and the checklist is where they belong.

**Root anchoring. — DONE, and worse than described.** What follows is what this section said before
1c ran; the correction is in the status block. Two things it got wrong. It called the bug survived-
in-dev-only, when in fact `astro build` puts every module in one chunk directory four levels down,
so the idiom is right or wrong purely by the source file's depth — and statgen's copy is right by
that coincidence. And it recorded the failure as historical, when a second module in the same repo
was live: `/usage/` shipping zeroes against 54 skills, 54 pages unbuilt. The original text:

**Root anchoring.** foundry's `content-files.ts` documents a bug worth inheriting verbatim:
`new URL('../../../content/…', import.meta.url)` counts `../` from a module's source depth, which
survives `astro dev` and does not survive `astro build`, where the module runs from a bundled chunk
at a different depth. `MoldHealth.astro` resolved one level short on all 47 of its pages — every
Mold reporting "eval.md not written yet" while 33 had one — and the index page served the same file
correctly from a different `../` count that happened to land. The fix is `root` from
`astro:config/server`. statgen resolves from cwd instead, which works only because Astro runs from
`site/`. Ship the *rule* as `contentRootFrom(rootUrl)` and the *import* stays in the instance.

**Name collision. — DONE**, galaxyproject/foundry#437,
jmchilton/statistical-genomics-foundry#146. Two files called `content-files.ts` doing different
jobs is the kind of thing the glossary discipline exists to prevent, applied one level down. Both
were renamed rather than the cheaper one: neither old name described its module, and renaming one
would have left the collision half-standing for a third instance to meet. foundry's
`note-directory.ts` resolves ONE note's directory and the companions beside it; statgen's
`corpus-files.ts` walks the corpus to enumerate a collection's notes. They shared no line of code —
the name was the entire overlap.

**Prose about code rots faster than prose about the corpus — and only one instance reads it.**
Found by the rename above, which is the good way to find it. statgen's `path-references.test.ts`
exists because "a file MOVES and every path that named it stays exactly as correct-looking as it
was". The rename moved a file that `content/meta/code-architecture.md` names on two lines, and the
check stayed green: it anchored `./`, `../` and `content/`, so the dozen `site/src/lib/…` module
paths in that document had never been read at all. Widening the anchor set to `site/` found those
two lines and **nothing else** in 213 pages, so it cost no allowance entries.

foundry has no equivalent check, and the gap is live, not hypothetical. A crude probe over its
markdown — every backticked `content/`, `docs/`, `packages/` or `site/src/` token that names a
file, minus the obvious `<slug>`/`*` templates — leaves roughly twenty that do not resolve, among
them `content/pipelines/cwl-to-galaxy.md` cited in five files. Two wrinkles to settle before
porting, both of which statgen never had to face:

- foundry's prose lives outside `content/` too — `casts/**/run-summary.md` carries several of
  these — and statgen's check deliberately scans only the corpus.
- `content/log.md` is append-only. An entry naming a file that has since moved may be *correct as
  history*, which is a different question from a stale cross-reference and wants a different
  answer than an `ELSEWHERE` entry.

This is the same shape as the two lessons above: one instance has a check the other needs, so it
belongs in the checklist whatever happens to the package.

---

## 6. Risks

- **Silent-success failure modes dominate.** Tailwind not scanning the package, a component
  rendering unstyled, wiki-links not resolving — all produce a green build. Every acceptance gate
  in this plan asserts on rendered output for that reason.
- **N=2 on cribbed code is the weaker arm of the rule.** Mitigated by taking only the duplicated
  lines and nothing adjacent.
- **A third instance is the real test.** The topological-data-analysis foundry is greenfield
  markdown with no site. If the kit is real, standing that one up should be the cheapest of the
  three — and if it isn't, that is the finding.
- **Phase 2 may not be worth it.** Stated as a stop condition rather than discovered at the end.

---

## Unresolved questions

1. `@galaxy-foundry/site-kit`, or split TS/`.astro` into two packages? (One package, subpath
   exports, is my recommendation — two packages doubles the release ceremony for ~250 lines.)
~~2. Phase 2 at all, or ship Phase 1 and record the shell as "did not transfer"?~~ **Answered: built and merged, jmchilton/foundry-lib#37.** The zero-diff shell made it a distribution question rather than a design one, and the spike had already priced it. See Phase 2 step 6.
3. Does foundry-pattern adopt anything? It has no vault-doc renderer and a deliberately different
   shell — so probably only Phase 0. Confirm it stays out.
4. ~~Container width (`max-w-5xl` vs `6xl`) — a prop, or does each instance keep its own `main`?~~
   **Answered: neither.** The difference was never decided — statgen's shell was copied from
   foundry's two months later and the width changed in the same edit as the name and description,
   and neither repo touched it again. Nor does either corpus defend a value: the prose measure is
   set by narrowing LOCALLY (statgen does it a dozen times across eight index pages, foundry once),
   so the shell width is only the outer bound for tables and grids — 117 of foundry's 374 pages
   against 45 of statgen's 213. Both now use the wider bound, and `CONTAINER` is a shared value
   rather than a parameter, so a shared shell can hold the measure and take no prop for it.
   The general lesson: **parameterizing a difference is how an accident becomes a policy.** Check
   the provenance of every value before giving it a knob.
5. `tokens.css`: ship token *names* only, or names + the current values as defaults?
6. Does the TDA foundry get stood up as the kit's first consumer, or after both instances have
   adopted it?
7. ~~Who owns the `attw`/`publint` exemption if a package ships unbuilt `.astro` — scope the
   existing call, or exempt the package?~~ **Answered by the spike: neither is needed.** The
   existing `--entrypoints .` already confines `attw` to the JS entrypoint, and `publint` is clean.
   The follow-on question is whether that should be made deliberate — a comment on the script, or a
   test — since it is currently a flag that happens to be right.
