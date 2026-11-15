Run via Opus at low effort.

**Recommendation: keep as implemented. No new scope change, so the branch doesn't need to park again.** With X1 and X2 in, the branch now covers the ask. Plain relative image paths work in Markdown and RST help, through one endpoint and one lookup order, whether the tool came from the Tool Shed or was loaded from a checkout. Legacy `$PATH_TO_IMAGES/` help now renders the same in both modes.

I checked that last claim against the real repositories. For each of the 97 `$PATH_TO_IMAGES` targets and the 34 plain relative targets in tools-iuc (local clone, Jul 2026), I resolved the image the way the branch does: strip the prefix, then try `static/images/<name>` and then `<name>` under the tool dir.
- 96 of the 97 resolve from the tool dir alone, as do 33 of the 34.
- The 2 misses aren't present anywhere, so they're broken on shed installs too.
- No target resolves only through the shed-only repository-root fallback.
- tools-devteam and bgruening/galaxytools show the same pattern. Their only root-only case is 2 uses in galaxytools' unpublished `staging_area/circos`.

So the one structural difference between the modes, that only installed shed tools also search the repository root, doesn't affect real tools. The remaining gaps all concern legacy `${static_path}` and `/static/...` targets. Each is small, already present on `dev`, or deliberately left alone in round 2, so they're listed as follow-ups below rather than as an expansion.

## Possible Decompositions

The branch has 31 commits on `origin/dev` (`e7a3f2254c0`). It inserts about 714 and deletes 171 non-generated lines, excluding the regenerated `schema.ts` and the PNG fixtures:

| Area | Inserted | Deleted |
|---|---|---|
| Server | 188 | 106 |
| Client | 74 | 8 |
| Tests and fixtures | 452 | 57 |

Per `baseline_refactor.md` (round 3), the history is ordered so it can be split at these points:

1. **Baseline tests** (`a585a1a6563`): vitest pinning today's img src handling, the `/build` RST API test, the `help_images_rst` fixture, and the `no_images` install-DB test.
2. **Icon fixes and the refactors under them** (`1bfb47160cb`, `94713ccb5b9`, `96c019d9a9e`, `532dc070873`, `5879cabce8a`):
   - `If-None-Match` revalidation.
   - `cached_file_response` moves into `webapps.base.api`.
   - `find_tool_asset` is extracted from `shed_tool_static`.
   - `find_tool_file`: symlinks, and a 404 instead of a 500 for an icon outside the tool dir.
   - **X2:** the icon lookup passes the user. That fixes a `dev` bug: logged-in users got a 401 for icons of `require_login` tools, and admins got one for Data Manager tool icons.
3. **Feature, part A: endpoint and client** (`f7436e73ddd` .. `af11f4f5af4`):
   - `GET /api/tools/{id}/help_image`, with caching headers and 304s.
   - The client rewrites relative srcs for Markdown and RST.
   - XSD docs, and unit, API and E2E tests.
   - This covers non-shed tools, plus Markdown help for every tool.
4. **Feature, part B: shed unification and hardening** (`6f2e2b82c2d` .. `349c6fd7abc`):
   - Installed shed RST goes through `help_image` instead of `shed_tool_static`.
   - SVG is served under a sandboxing CSP.
   - `.. figure::` support, removal of the dead route code and of the client skip, and the `If-None-Match: *` and header fixes.
   - The gate on shed rewrites.
   - **X1** (`8fc208cd9f7`), the `require_login` help-image test (`d8e0303cef9`) and the E2E screenshots (`349c6fd7abc`).

X1 depends on (4), because it sits after the shed `elif`. Its code doesn't depend on the unification itself, though, so if (4) were split again it could move into (3).

Natural groupings, landing in the order 1 → 2 → 3 → 4 in each case:
- One PR.
- (1+2) as a small icon-fix PR, which could target a release branch since X2 fixes a `dev` bug, then (3+4) as the feature PR on `dev`.
- (1+2), then (3), then (4). This lets reviewers settle the SVG and shed-behaviour questions on their own.

## Scope 0 (recommended): As implemented

All relative image paths in tool help go through `help_image`:
- for Markdown and RST, shed and non-shed tools;
- installed shed RST is rewritten server-side to relative paths;
- non-shed RST has `$PATH_TO_IMAGES/` stripped from image targets (X1);
- SVG is served under a sandboxing CSP.

It also includes the icon fixes, now with X2, and the shared `cached_file_response` and `find_tool_*` helpers.

| Pros | Cons |
|---|---|
| <ul><li>The ask is met: the same tool XML renders its images whether installed or loaded from a checkout. Verified against 131 tools-iuc targets: 0 depend on the shed-only root fallback</li><li>Unblocks Markdown help with images, which galaxy-iuc/standards#95 needs</li><li>The two sibling service methods now agree on user access (X2)</li><li>Three review rounds, plus test, perf and Codex rounds, left no open bugs</li><li>History is ordered for splitting; X2 sits in the icon-fix group</li></ul> | <ul><li>Shed tools render differently than before: the tool dir is searched first, `/build` returns raw relative srcs, and SVG is served. All need reviewer buy-in</li><li>Shed RST strips three legacy forms, non-shed RST only one. That is intended, but reviewers may ask why</li><li>Legacy `${static_path}` and `/static/` targets still behave differently between the modes (see Scope 1)</li></ul> |

## Scope 1 (expand, not recommended): Non-shed legacy `${static_path}` and `/static/` targets

For tools that aren't from the shed, rewrite `${static_path}/…` or leading-`/static/…` image targets to tool-relative paths when the file exists in the tool dir. Separately, make `${static_path}/images/X` find `static/images/X` in both modes.

| Pros | Cons |
|---|---|
| <ul><li>Closes the last textual shed/non-shed differences</li><li>Would fix rp2paths, dnabot and tasmanian (4 uses), whose images are broken in both modes today: `${static_path}/images/X` is looked up as `static/images/images/X`</li></ul> | <ul><li>Small reach in tools-iuc: 10 `${static_path}` uses and 1 `/static/` use, across 7 tools</li><li>Galaxy's own `tools/` uses `${static_path}` to mean Galaxy's `/static`, so the non-shed half needs a filesystem probe at help-parse time or a guess</li><li>The `images/X` case is a `dev` bug, the same before and after the branch, not a parity regression</li><li>It would park the branch a third time for about 5 uses. A lint warning or a fix in the tool repos is cheaper</li></ul> |

<details>
<summary>Details</summary>

- **snpfreqplot `.. image:: /static/images/example_output.png`.** On a shed install the leading `/` is stripped and the image resolves. On a checkout the client leaves the path-absolute src alone and Galaxy's `/static` returns a 404. This is the only such use in tools-iuc. Round 2 left leading `/` alone on purpose for non-shed tools.
- **`${static_path}/images/X` with X in `static/images/`** (rp2paths, dnabot, tasmanian ×2). Broken on `dev` and on the branch, in both modes. On a shed install `${static_path}` is stripped, and the lookup then tries `static/images/images/X` and `images/X`. On a checkout, Galaxy's `/static` is used.
- **Fixing it in the lookup.** `find_tool_asset` could try `static/<path>` when the path starts with `images/`. That stays safe for interval2maf, which ships `images/maf_icons/…`.
- **Out of reach.** weblogo3 and fasta_clipping_histogram point at files they don't ship at all, so no fix in Galaxy helps them.

</details>

## Scope 2 (contract): Drop X1 and/or X2 again

Revert the X1 strip or the X2 one-liner.

| Pros | Cons |
|---|---|
| <ul><li>Slightly smaller diff</li></ul> | <ul><li>Without X1, 97 tools-iuc image uses break under `planemo serve` or a checkout. That is the exact difference the ask targets</li><li>John already decided to take both</li><li>X2 fixes a real `dev` bug in a method the branch rewrote</li></ul> |

## Scope 3 (contract): Earlier contractions, unchanged

These are carried forward from [round 2](earlier_drafts/2/scope_evaluation.md):
- the original-scope alt (`tool_help_relative_images_alt_original_scope`);
- unification without SVG.

Both reintroduce the shed-specific behaviour John objected to. Neither is reconsidered here.

## Follow-ups (not this branch)

- **Legacy `${static_path}`/`/static/` targets** (Scope 1). Options:
  - a lookup fallback for `images/X` → `static/images/X`;
  - and/or PRs to rp2paths, dnabot, tasmanian and snpfreqplot in tools-iuc that switch to plain relative paths.
- **`planemo lint` help-image check.** Warn on legacy prefixes and on targets missing from the tool dir. This would have caught hicFindTADs, emboss isochore and the `${static_path}` cases above.
- **galaxy-iuc/standards#95.** Once this merges, document the plain relative path convention (`static/images/…`) for both help formats.
- **The legacy `shed_tool_static` route.** Match its headers to `help_image`, or remove it a release after nothing emits its URLs.
- **Repository-root-relative `../` paths for shed suites.** 0 uses found.
- **Markdown help images in the Tool Shed UI**, and `.. figure::` in the Tool Shed's `set_image_paths`.
- **Relative images in `Tool.to_archive`.**
- **Round-2 polish items:**
  - a short `max-age` on 404s;
  - renaming `help_images.py` to something like `tool_files.py`;
  - merging the two directive regexes.
- **RST substitution images (`.. |x| image::`) and figure `:target:`.** Not rewritten in either mode, and 0 uses in tools-iuc.

## Unresolved questions

- Split the icon fixes, now including X2, into their own release-branch PR?
- Should the `${static_path}/images/X` lookup fallback be a follow-up PR, or should the tools-iuc XML just be fixed?
