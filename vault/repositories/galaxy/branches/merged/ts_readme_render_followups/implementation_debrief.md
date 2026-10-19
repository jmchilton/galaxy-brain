> Polished 2026-10-17 at `d64a2bdfe45` on current `dev`; see [polishing debrief](polish_debrief.md) for current tests and CI. The implementation history below predates the rebase. #24053 is now merged and forward-merged; there is no remaining PR-order dependency.

# Implementation debrief

Status: READY. Head `5abfc5c4aad` on `jmchilton:ts_readme_render_followups`, base `dev`. It depends on [`ts_readme_render_fix_26.1`](../../merged/ts_readme_render_fix_26.1/index.md), which is merged in as real history. Open the 26.1 PR first. The earlier round (merge, dead code, old-revision README lookup) is in [earlier_drafts/1](earlier_drafts/1/implementation_debrief.md).

This round came from John asking for a Playwright test of old revisions rendering READMEs with the correct images. Writing that test turned up two bugs.

- `c972f2601f9`: the repository page never fetched READMEs when opened directly at a revision (permalink `/view/<owner>/<name>/<changeset>`). The README watcher only fired on revision *changes*. It is now `immediate`, with a vitest.
- `8122d76aefb`: old revisions showed the latest image. The image route `/repository/static/images/{id}/{path}` takes an optional `changeset_revision` and reads the file from hg. `set_image_paths` gains a matching option; only old-revision READMEs pass it, so the latest revision is still served from disk. Adds test data `column_maker_with_rst_readme/{1,2,3}` (logo 16px, 16px, 24px; the README is unchanged in revision 2) and API tests.
- `ddc7cdbef90`, `f4aecefe3e6`, `5abfc5c4aad`: Playwright test.
  - Opens revision 2 by permalink and checks the old README is shown and the image decodes at 16px.
  - Then opens the latest revision and checks the new README and 24px.
  - Takes screenshots of both.
- `a53b7f6a6bf` (normal review): the new `hg_util.get_file_data_from_manifest` reads the revision's own manifest, exact path first and then file name, and returns None for unknown revisions. The previous walk back through changed files had three problems:
  - it could return a different file with the same name;
  - it gave a false 404 when such a file had been deleted;
  - it served the newest image for a garbage revision.

  The README lookup shares this helper.
- `174d806e156` (test challenge): the image route with a revision still rejects non-image files.

## Tests

| Suite | Result |
| --- | --- |
| `test/unit/tool_shed/` | 108 passed, 12 skipped |
| Image route API tests | 7 passed |
| `test_shed_galaxy_install_apis.py` + `test_shed_repositories.py` | 80 passed |
| `test_frontend_repositories.py` (Playwright) | 7 passed |
| RepositoryPage vitest | 6 passed |
| mypy, touched files | clean |

Every new test was checked red to green.

## Open

- **The new vitest overlaps the Playwright test.** It catches the same break. The test challenge suggests dropping it per the process; I kept it as fast feedback until John decides.
- **The latest revision's on-disk image lookup** is still the pre-existing basename `os.walk`.
- **No cache headers** on revision-pinned image responses.
- **Possibly-dead Galaxy-side README code** is still left alone (from round 1).

[Normal review](subagents/normal_review_image_route.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Screenshots](screenshot_debrief.md)
