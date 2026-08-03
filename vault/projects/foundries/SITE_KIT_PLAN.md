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

**Both adoptions are verified, and both are a zero diff.** 374 pages and 213 pages, no rendered
difference from a build of the same commit in the same worktree, once Astro's scoped-style hashes,
asset filenames and whitespace are normalized. A baseline built in a *different* worktree is not a
baseline — generated packages differ, and the first attempt produced 16 phantom differences and a
copyright year the source has not carried since #432.

**Diff the stylesheet too, not just the markup.** The rendered pages were identical while the CSS
was not. Three findings, two of which no test would have reported:

- Import order in the composition point decides where the stylesheet `<link>` lands. The component
  import above `global.css` moved it after every page's scoped `<style>` on 19 pages and dropped
  Tailwind's license banner.
- **A comment shipped a CSS rule.** The composition point described something as "invisible";
  Tailwind scans source *text*, comments included, so the word emitted a `.invisible` rule for a
  class no page carries. `site-identity.ts` had warned about this for width names since it once
  shipped a rule for a width nothing used — same trap, different part of speech. Prose in a scanned
  file is input to the build, and the only defence is a diff that reads the CSS.
- Once those were fixed, both stylesheets came out byte-identical under the same normalization.

The existing canary needed no new mechanism. `min-h-dvh` was already asserted, and the move is what
armed it: the class is now named by the kit and by nothing in either repo. Falsified twice in each
instance — deleting the `@source` line and misspelling it both build every page green and both fail
that one assertion. In the sibling this promoted an older line from nicety to load-bearing:
`@source not "../../tests"` is what stops its test, which sits inside the Vite root, from answering
its own question by naming the canary.

**Blocked on a manual step, by design.** Trusted publishing is configured on a page that does not
exist until the package does, so the first version of any new package has to be published from a
laptop — `pnpm publish --no-git-checks --no-provenance --tag stub`, then the trusted publisher on
npm, then the Version Packages PR. See `docs/development/publication.md` there. Done for site-kit;
`npm dist-tag ls` confirms it while `npm view` still 404s, which that page predicts. One correction
to make there: `--tag stub` does **not** keep `latest` clear. A package with no `latest` gets one on
first publish regardless, so npm assigned `latest: 0.0.0` — harmless, since the release takes it,
but the flag does not buy what the page implies.

`0.1.0` is released, and both consumers are open on it: galaxyproject/foundry#439 and
jmchilton/statistical-genomics-foundry#147. Each was verified twice — once against the packed
tarball and again after repointing to `^0.1.0`, since the published artifact is the thing readers
actually get. The zero diff held both times; the only pages that differ are the architecture notes
each PR edits.

Both adoptions also updated the instance's own architecture prose to say the shell is installed
rather than local — which is the same claim Phase 3 has to make in the checklist.

### Phase 3 — the checklist. **DONE**, galaxyproject/foundry-pattern#32.

The estimate was wrong in a useful way. Part 2 was supposed to be ~70 lines of stand-up-by-hand;
the shell was **two lines** of it. Everything else in that part — the astro 7 pins, the route rule,
the wiki-link seam, the loose-doc helper — was still true. So the work became an audit rather than a
rewrite, and the audit is where the value was: three claims had drifted, and none of them was the
shell.

- The config snippet showed `remark-math` + `rehype-katex` as the standard pipeline. Only the
  wiki-link plugin is common to both instances; the maths is one instance's domain and the citation
  and vendored-MyST transforms are the other's. **Take the shape, not the list.**
- It named `SourceMeta` and `TagChips` as the components to write, and one instance has neither.
  22 components and 3,290 lines against 2 and 85, no name in common. Now stated as the honest
  contrast: the chrome converged unprompted, the rendering of the corpus did not.
- "Pin the base once" was ambiguous enough that one instance writes the literal twice — as the
  config's `base` and again in the wiki-link plugin's options.

`INHERITED vs. SUPPLIED`: INSTALLED is seven. MECHANICAL keeps the Astro app and loses the shell,
which makes it the first thing to graduate out of that column — so the column now carries a worked
example of the route it exists to describe (compare value by value, defend or remove each
disagreement IN PLACE, move only once the files are identical). YOURS gains the identity, the
palette, and the note components. What did not move is recorded beside the earlier list: the link
map, the note components, the palette.

One correction fed back the other way. The bump-acceptance lesson added by the pattern repo's own
astro-7 work says *accept on the rendered page, not the build* — right, and incomplete. **The
stylesheet is output too.** That is now in the checklist with the normalization it needs.

**A stale worktree nearly put a false claim in.** The substrate table looked two rows out of date
and the fix was already on main, a day old — the same `^0.x` trap, already found and already fixed
by the repo itself. Nothing shipped, because the rebase conflicted and the conflict is what
surfaced it. Fetch before auditing a document for staleness; the document is not the thing most
likely to be stale.

### Phase 4 — the base. **DONE**, in the two adoption PRs rather than beside them.

The adoptions were held back deliberately: a PR that only swaps a header and a footer for a package
is not worth the ceremony of merging, so the bigger chunk goes in first. This was it.

Fifty-six files — 38 in foundry, 18 in the sibling — each opened with the same line,
`const base = import.meta.env.BASE_URL.replace(/\/$/, '')`. Not near-identical: **one literal, no
variants, in both repos.** They now import `base` from the instance's own `lib/site-base.ts`, which
is a single call to the kit's `shellBase`.

**Why this qualifies when duplication alone never does.** The shell already answers this question —
it has to, to resolve the nav — and its answer is the one the header and footer link against. So
there were not 56 copies of a helper; there were 56 private answers standing beside an authoritative
one. The failure that makes it worth fixing is not the repetition, it is that the chrome and the
corpus can come to disagree with nothing on screen to show it.

That also settles where it lives. `shellBase` is not a general utility that happens to sit in the
shell's package: the deployment base IS part of the shell's contract, which is why exporting it
there needed no new package. And the instances do not import the kit 56 times — each keeps ONE
composition point, `lib/site-base.ts`, beside `site-identity.ts`. The pattern the shell established
holds: the kit ships the rule, the instance owns the file that applies it.

**The assertion is the single reader, not the correct expression**, because both ways of writing it
wrong build green. Reading `BASE_URL` unstripped is *correct at a domain root* — the strip is a
no-op there, so `astro dev` and any root deploy confirm the bug — and doubles the slash under a
base. A stripper that trims one character too many renders no error at all, just links that land
somewhere else. `site-base.test.ts` in each repo asserts that exactly one module reads the
environment; reintroducing a local copy fails it, checked in both.

The source walk it needs already existed in `root-anchoring.test.ts`, so it moved to a shared
`site-sources.ts` in each repo. The reason is not tidiness: the two rules have to scan the same set,
and a rule enforced over a smaller set than the one it describes has a hole neither test can see.

**Verified harder than the shell was.** Both `dist` trees are byte-identical to a build of the same
worktree before the change — `diff -rq`, no normalizer, 587 pages plus stylesheets and chunks. The
shell move needed normalization because it changed component file paths and therefore Astro's
scoped-style ids; this one changes no path, so the raw comparison is available and is the stronger
claim. The stylesheets were still diffed as rule sets on their own, per the §2 finding.

The checklist followed in galaxyproject/foundry-pattern#33. What it records is not the adoption but
the TEST: the parked question — should the shell's package become where every component reaches for
a utility — did not need answering, because the premise was wrong. Ask instead whether a package
already answers the question for its own purposes. If it does, the copies are drift waiting to
happen and the composition point is where you absorb them. If it does not, the copy count proves
nothing; you still have a shared decision nobody has taken.

One process note: the full foundry suite failed once with a 5s timeout in `built-shell.test.ts`,
while two `astro build`s were running alongside it. It passes in 381ms alone and in a quiet full
run. Not this change — but that test reads 374 built pages against vitest's default timeout, which
is thinner than it looks.

### Phase 5 — the tag chip. **DONE**, foundry only, third commit on galaxyproject/foundry#439.

The first change in this axis that alters rendered pages, and the first that turns out **not** to be
a package candidate. site-kit ships the shell and no chip concept at all, so by the Phase 4 test the
copy count proves nothing on its own. This is repair inside one instance. Convergence is the
precondition for extraction, not the consequence — the same order as everywhere else.

A link to a tag page was rendered four ways, and the fourth was only found by the test. Three were
one concept: `<a class="no-underline"><span class="tag">`, `<a class="tag">`, and on `tags/[...tag]`
a pill spelled out in utilities that never consulted `.tag` — its own background, a border it
invented, nine lines below a `.tag` in the same heading.

**The defect the markup rule cannot see.** `patterns/index.astro` used `.tag` correctly and still
had no hover: the rule was `a:hover .tag`, a descendant selector, which an anchor that IS the chip
can never satisfy. It kept `transition-colors` and lost the thing to transition to. Nothing failed,
and a chip that does not react looks like a chip nobody moused over. Both nestings are legitimate —
the tags index wraps the chip AND the note count in one anchor — so the fix is that whether the chip
lights up stops following from a layout decision.

**The rule keys on the anchor, not the geometry, and that was a correction.** The first version
asserted the pill lives in the stylesheet and nowhere else. It passed — and meant nothing:
`border-radius: 999px` appears in nine components here as a local idiom for rails, dots and bars, so
the assertion only held because it keyed on the Tailwind spelling `rounded-full`. A green assertion
that passes for a reason unrelated to its subject is the failure this whole axis exists to kill; it
was deleted rather than shipped. The surviving second rule derives its requirement from the markup —
whichever nestings the call sites actually use, the stylesheet has to cover — so deleting a selector
fails it, instead of restating that the selector is present.

**The exception is named, not excluded.** `.topic-chip` on the patterns index links to tag pages and
is deliberately a different affordance: a browse row, sized to be aimed at rather than read under a
title. It is listed in the rule with its reason. A rule with a silent gap and a rule with a stated
exception look identical from outside and only one is honest — and a third entry is the signal to
stop and ask what concept it is.

**Two tokens that lied.** `--color-tag-bg` was `#edf4fa`/`#21262d` — byte-for-byte
`--color-surface-hover` in both themes, which is the name the sibling already uses for the same two
values. The repos agreed on the value and disagreed only on the name. `--color-tag-bg-hover` was
defined in both themes and read by nothing; the hover rule uses `--color-accent`. Both are gone from
the shipped stylesheet.

Verified as an intended bump rather than byte-identity, which is why it is a separate commit: the
two before it still carry the raw `diff -rq` claim. 374 pages — 117 unchanged, 242 the note-header
chip, 15 the co-occurrence chips, nothing else moved. Stylesheet 228 bytes smaller, three utilities
only the hand-rolled chip used dropped, `tag-count` added.

**"Not ported to the sibling" was wrong, and the correction is the interesting part.** The claim was
that the sibling has no links to tag pages so the rule would be vacuous. It has five collections of
them. Both greps that produced the claim looked for `class="tag"` and for `rounded-full`, and the
sibling's chips use neither: `TagChips.astro` draws a bordered mono pill in utilities. The same
blind spot hid `.topic-chip` two paragraphs up — **twice in one sitting, a search for the canonical
spelling of a thing missed the copies, which is the one place a copy is guaranteed not to be.**

### Phase 5b — the sibling's tag surface. **DONE**, third commit on jmchilton/statistical-genomics-foundry#147.

Prompted by a reading of the gap that was more right than mine: both instances have tag registries,
so both should have tag pages. The sibling *has* the pages. What it did not have was a corpus that
points at them.

**The surface ran one way.** Five collections carry tags — molds, papers, tutorials, books,
patterns — and the tag pages list entries from all five. Only molds rendered chips. Four fifths of
the corpus appeared on tag pages that its own pages never mentioned, which from any single page
looks like a site that simply has no tags. Nothing can catch this by reading one file: each page is
locally complete, and the defect is a missing edge.

**`.tag` named two different concepts across the two repos.** Here it was the *provenance* pill —
source book, chapter, version, licence — while the registry tags were the hand-rolled chip. So the
one thing on the site that IS a tag was the one thing not using the class called `tag`, and the
earlier cross-repo comparison of the two `.tag` rules read as near-agreement while the two rules
were about different things. Two definitions can agree on every declaration and still not be the
same decision. The pills became `.meta-pill`; `.tag` is the registry chip in both repos now.

**The second rule is the sibling's alone**, and that asymmetry is the point. It asserts that every
collection in `COLLECTION_LABEL` renders chips somewhere under its route — derived from the same
map the tag pages group by, so a collection added there is a collection whose detail page owes a
link back. The flagship needs no such rule: it renders tags from one note header shared by every
page, so it has no per-collection wiring that can be forgotten. **A rule earns its place from the
shape of the failure available in that repo, not from the other repo having one.** Verified by
reverting the four pages — it names books, papers, patterns, tutorials.

The chip rule itself is the same file in both, and porting it corrected the original: the sibling
links back to the tags INDEX from each tag page, which the flagship's regex read as a tag link and
would have held to a chip's rule. That exclusion went back into the flagship, so the two differ
only where the two sites do.

213 pages, 85 untouched; the pill rename renders identically, and the rest is the new chip rows.

A broader measurement, unspent: seven `@theme` tokens in foundry are referenced by nothing, by
`var()` or by generated utility name. Only one was a tag token — `--color-tag-bg` was live, it was
just live under the wrong name. The remaining six — `--color-galaxy-gold`, `--color-surface-dark`,
`--color-surface-dark-medium`, `--color-accent-hover`, `--color-rail-on`, `--font-sans` — were left
alone; a general dead-token rule has to tell `@theme` (which generates utilities) from `:root`
(which does not), and that is its own chunk.

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

## 7. What the survey missed — and why the method missed it

Raised 2026-08-03, as a worry that the axis was letting accidental divergence stand and calling it
domain. Measured against both instances at `site-kit-adopt`. The worry is right, and the shape of
the error is in the survey rather than in any decision.

**Every phase on this axis was found by diffing files that share a name.** §1 opens by saying the
first pass counted filename overlap; `Base.astro`, `licenses.ts`, `content-files.ts`, `site-base.ts`
all came out of that. The method cannot see two files doing one job under different names, and it
cannot see one job split across a different NUMBER of files. That is the same failure Phase 5
recorded twice — *a search for the canonical spelling of a thing misses the copies* — applied one
level up, to the survey itself. `src/pages/**` had never appeared in this document. Not deferred:
never looked at, because the two instances share no route filename.

**Phase 3's honest contrast was measured wrong.** "22 components and 3,290 lines against 2 and 85,
no name in common" reads as *the flagship renders more*. What it actually records is that the
flagship put its per-type rendering in COMPONENTS behind one catch-all route, and the sibling put
its in the ROUTES. Same job, different location — invisible to a component-name diff, which is why
the count looked like a domain gap. Some of it is a domain gap. Not all of it.

**1. Routing.** The flagship has one `[...slug].astro`, 120 lines, dispatching on `data.type`
through a `TYPE_LABELS` map into eight body components. The sibling has six detail routes, of which
`books`, `papers` and `tutorials` are near-verbatim copies of one another — same `getStaticPaths`,
same `data-pagefind-body` wrapper, same `SourceMeta` + `TagChips` + prose article. `papers` and
`tutorials` differ in the collection-name string and nothing else.

The sibling already HAS the flagship's dispatch map: `COLLECTION_LABEL` in `lib/tags.ts`, which the
tag pages group by. The detail routes hardcode the same knowledge six more times.

This is also where Phase 5b's defect came from. Four of five collections rendered no chips, and
that was possible only because there were five places to answer the question. Under one route,
"does this collection render chips" is not a question that can have five answers — so the collapse
does not just satisfy 5b's second rule, it removes the shape of failure the rule was written
against. A structural fix outranks a check whenever it is available.

**2. The tag pages.** Both `tags/index.astro` compute the same thing — group tags-in-use by the
DECLARING facet, count, render chip and gloss — and both say so in comments neither author saw:
"not the one its text happens to start with… no 'Other' bucket" against "not by its `/` prefix…
no tag can fall through into an 'other' bucket". Both consume `@galaxy-foundry/tag-registry`
through the same four accessors, `facets` / `facetOf` / `facetLabel` / `tagDescription`. One calls
them as methods; the other re-exports them as free functions from `meta-tags.ts`, a wrapper whose
entire content is a calling convention.

Apply the Phase 4 test: a package already answers this for its own purposes. So these are two
private renderings standing beside an authoritative grouping — the `shellBase` shape. What differs
legitimately is only the listing: a `data-table` of type/status/revised against cards grouped by
collection. The grouping is not.

**3. Same name, different job — live again.** §5 fixed `content-files.ts` for exactly this and the
class was not swept. `registries.ts` means "the loaded registries" in one and "the options bag for
`buildKindContext`" in the other, and the sibling's header asserts the opposite: *"Named to match
the parent Foundry's `registries.ts`, which does the same job."* `render-vault-doc.ts` exports
`renderContentDoc(relPath)` against `renderVaultDoc(absPath)` — flagged in §1's original table and
never acted on. `getAllNotes()` and `getTaggedEntries()` both produce everything with tags and a
URL.

And one only a cross-instance diff can see: both pin `pagefind@^1.5.2`, and they disagree about
what search covers. The sibling indexes its glossary, its design records and every detail route;
the flagship indexes `[...slug]` and nothing else, leaving `story/index` (481 lines of prose),
`usage/claude/[skill]` (628 lines × 54 skills), `external` and `glossary` out of its own search.
Same package, same version, two answers, nothing on screen to show it.

**What is correctly separate, and should be said as clearly.** `MoldBody`, `PipelineBody`,
`PhaseGraph`, `PipelineMatrix`, `CastArtifacts`, `SchemaBody` render workflow-conversion objects the
sibling has no analogue of. `SourceMeta` is real domain in the other direction: the sibling derives
its corpus from books and papers and must carry provenance, while the flagship authors its own and
has nothing to attribute. The corpus COMPONENTS are correctly separate. The route that chooses
among them, and the tag surface that indexes them, are not.

**The transferable rule.** Two instances can converge on a design and diverge on where they put it,
and a file-level diff reports that as no overlap at all. Survey by QUESTION ANSWERED, not by
filename — "which file decides what a note's detail page looks like" finds one file in one repo and
six in the other, which a directory listing of either repo alone will never suggest is a finding.

### Phase 6 — one detail route in the sibling. **DONE**, fourth commit on jmchilton/statistical-genomics-foundry#147.

`src/pages/[collection]/[...slug].astro` replaces six files. What differs per collection turned out
to be two fields — whether a reader can go up from here, and whether the page states the note's own
title and summary — held in `lib/detail-routes.ts`. Everything else that looked per-collection was
either furniture dispatched on `entry.collection`, the way the flagship dispatches on a note's
`type`, or an accident with three spellings.

**The live hypothesis was that the six routes existed for a TYPING reason, and it was wrong.** This
repo deliberately keeps each kind's shape precise, and `frontmatter-schema.ts` warns in as many
words that mapping over the kinds collapses them to the widest common type and lands `entry.data:
unknown` on the pages. That warning is about `.map`. Spread into one array the six entry types stay
a UNION, `entry.collection` discriminates it, and `astro check` reports 0 errors across all six
branches — every `entry.data.pole`, `entry.data.source_chapter`, `entry.data.record_kind` checked
rather than asserted. A constraint that would have justified the divergence was available to test
and had never been tested.

**The rule replaces a rule.** 5b's second assertion walked each collection's directory asking
whether anything under it rendered chips. Under one route the question has one answer, so it now
reads that route — shorter, and strictly stronger: the walk could only find collections it knew to
look for, and passed for a collection whose directory happened to hold some other page carrying the
string. `collection-routes`' directory check was rewritten the same way, onto the `collection` param
the key now travels through. **A structural fix outranks a check whenever it is available**, because
the check has to be maintained and the structure does not — and 5b's defect was possible only
because there were five places to answer one question.

Three things the collapse surfaced, none of which a diff of the six files would have shown:

- **Design records carry tags and are not on the tag surface.** Six routes hid it by never
  rendering chips there. One route renders them everywhere unless told otherwise, so the gate is
  explicit and reads `COLLECTION_LABEL`: a chip is a link, and the tag pages have to list the note
  back. Left open rather than answered.
- **A scoped `<style>` became a cost of the collapse.** One route imports `SourceMeta` on all 213
  pages, and Astro ships a component's scoped styles wherever it is IMPORTED — so 26 pages that
  render no provenance box carried its CSS. The four rules moved to `global.css`, where this site
  keeps appearance anyway. Declarations carried over literally: `py-0.5` is 0.125rem against
  0.1rem, `rounded-full` is 9999px against 999px, and respelling them as utilities would have made
  a move into a restyling. Caught by diffing the CSS as rule sets, which is now the third finding
  that half of this axis's verification has produced.
- Four copies of a bordered mono pill, and three spellings of the chip row's margins. The margins
  derive from what surrounds the row now, so the three spellings cannot come back.

213 pages, 76 untouched; the other 137 differ only in class-attribute spelling and the relocated
stylesheet — 28 distinct element deltas, every one accounted for above. Stylesheet gains four rules
and loses none. Each rule falsified: hardcode the route param, delete the chips, drop a
collection's row, and the original six-route red.

**Unspent, measured here.** Molds and Patterns link back to their browse pages and Books, Papers and
Tutorials do not, though all five have one. That is now one field in one table rather than a
difference spread over three files, which is the point — but it is a rendered change and belongs in
its own commit.

### Phase 7 — the tag grouping. **DONE**, both instances: galaxyproject/foundry#439, jmchilton/statistical-genomics-foundry#147.

`lib/tag-browse.ts`, **byte-identical in both repos**, holds `groupTagsInUse(registry, counts)` and
`facetLabelOf(registry, tag)`. Three call sites per repo stopped deciding it for themselves.

**The evidence is not the copy count.** `@galaxy-foundry/tag-registry` owns the rule that
membership is DECLARED — a tag belongs to the facet whose `values` list it, never to whatever
precedes its slash — and BOTH instances' own notes say so, listing "browse by declaring facet"
among the rules that moved into the package. What the package ships is the lookup. **The package
documents a rule it does not ship**, so every caller built the browse surface itself, and what
they built was not code they had copied: it was a decision — browse order, the empty-facet rule,
what becomes of a tag no facet declared — taken privately, agreeing only because nothing had ever
made it disagree.

**The counts are the seam, and they are the whole of what is per-instance.** A tagged thing is a
non-archived note in one repo and an entry across five collections in the other. Everything above
the counts is the same question, which is why the module is one file rather than two similar ones.

**The synthetic registry is the point of the test.** Neither real registry can tell the rule from
its coincidence: every tag in either `meta_tags.yml` is slashed AND its prefix happens to name its
facet, so grouping by declaration and grouping by prefix are indistinguishable against real data.
The fixture declares `role/solo` under `family` and `family/b` under `role`, and carries a bare
`meta`. Falsified five ways in each repo, including reintroducing a second reader of `facetOf`.

**A third caller in each repo was a test.** `registry-drift`'s "no facet with zero members in use"
reasons explicitly about what /tags renders and reached that conclusion by its own route — a
second answer to the question, dressed as a test of the first. It now asks the grouping.

374 and 213 pages byte-identical to a build of the same worktree before the change — `diff -rq`,
no normalizer.

**What this says about the package boundary, which is the live question.** Every extraction on this
axis so far went to the package that already owned the concept — `wiki-links` took the anchors,
`license-policy` took the licenses reader, `site-kit` took the shell and the base. This one points
at `tag-registry`, and it is the second time a candidate has been correctly refused by site-kit
(the tag chip was the first). **site-kit has taken exactly one concept — the shell — and everything
since has belonged somewhere else.** That is either the seam holding or the package being thin;
see unresolved question 8.

---

## Unresolved questions

1. `@galaxy-foundry/site-kit`, or split TS/`.astro` into two packages? (One package, subpath
   exports, is my recommendation — two packages doubles the release ceremony for ~250 lines.)
~~2. Phase 2 at all, or ship Phase 1 and record the shell as "did not transfer"?~~ **Answered: built and merged, jmchilton/foundry-lib#37.** The zero-diff shell made it a distribution question rather than a design one, and the spike had already priced it. See Phase 2 step 6.
3. ~~Does foundry-pattern adopt anything?~~ **Answered: no, and the reason is principled.** Its
   whole shell is one 75-line `Base.astro` with the header and footer inline, and it shares no
   token with either instance — `--ink`, `--soot`, `--ash`, `--ember`, `--rule`, `--muted`,
   `--font-display` against the instances' `--color-surface` / `--color-text-primary` /
   `--color-accent`. Different measure too (`max-w-5xl`), and a nav with no overflow group. Every
   adoption in this axis was justified by changing NO rendered page; adopting here would change
   every one of them, because the pattern site is not a Foundry instance and does not look like
   one. What did transfer is the idea rather than the code: its nav is already a data array rather
   than per-entry closures.
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
8. **Has `site-kit` earned its place, or did the convergence do all the work?** Raised
   2026-08-03, and the strongest open question on the axis. The case against is real and mostly
   made by this document: the shell reached a ZERO DIFF *in place*, before it was packaged, so the
   value was already banked and the package delivered distribution rather than design. It costs a
   laptop publish for a first version, a `^0.x` range that does not cross a minor (the exact trap
   Phase 0 existed to unstick), a Tailwind `@source` line whose typo is as silent as its absence,
   and a canary assertion per consumer that is non-negotiable rather than nice to have. N is 2, and
   §1 already conceded that one of the two was a crib. And **every candidate since has belonged
   somewhere else** — the tag chip to neither package, the tag grouping to `tag-registry`, the
   route collapse to one instance — so site-kit holds exactly one concept.
   The case for is narrower but not nothing: `shellBase` absorbed 56 private answers standing beside
   an authoritative one, and that absorption REQUIRED a package to be the authority; and two
   byte-identical copies stay identical only until someone edits one, which a version bump makes
   visible and a copy does not.
   **The deciding experiment exists and has not been run.** The TDA foundry is on disk with a
   corpus (`content/environments`, `meta`, `packages`, `papers`) and no `site/` at all. Question 6
   asks whether it is stood up as the kit's first consumer; question 8 is what the answer would
   MEAN. If standing it up is the cheapest of the three, the kit is real. If most of the cost turns
   out to be the parts the kit does not ship — the palette, the note components, the link map, the
   corpus routes — then the honest finding is that the reading surface transferred and the shell was
   the small half of it, which is worth more to the pattern than the package is.
7. ~~Who owns the `attw`/`publint` exemption if a package ships unbuilt `.astro` — scope the
   existing call, or exempt the package?~~ **Answered by the spike: neither is needed.** The
   existing `--entrypoints .` already confines `attw` to the JS entrypoint, and `publint` is clean.
   The follow-on question is whether that should be made deliberate — a comment on the script, or a
   test — since it is currently a flag that happens to be right.
