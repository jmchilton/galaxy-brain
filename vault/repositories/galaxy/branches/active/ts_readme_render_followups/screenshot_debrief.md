Screenshots successfully obtained.

# Screenshot Debrief

Source test: `lib/tool_shed/test/functional/test_frontend_repositories.py::test_old_revision_readme_renders_with_its_images` (Tool Shed Playwright, `TOOL_SHED_TEST_OMIT_GALAXY=1`). One run, passed in ~5s. Frontend from the existing `lib/tool_shed/webapp/frontend/dist` build (newer than all frontend src).

Both shots come from one repository (`column_maker_with_rst_readme`, 3 revisions).

| File | Shows |
|------|-------|
| `screenshots/repository_old_revision_readme.png` | `/view/<owner>/<name>/<middle changeset>`: revision dropdown on `1:<hash>`, "Newer revision(s) available" badge, tool v1.2.0, About panel "Old README for column maker." with the 16x8 logo (short blue bar), which renders correctly. |
| `screenshots/repository_latest_revision_readme.png` | `/view/<owner>/<name>`: revision `2:<hash>`, "Newest revision" badge, tool v1.3.0, "New README for column maker." with the 24x8 logo (visibly wider bar). |

## Test change

Commit `5abfc5c4aad`: added the latest-revision shot to the same test. It visits the bare repository URL, asserts "New README for column maker." and that the image decodes with `naturalWidth == 24`, then takes the screenshot. This adds assertions and changes no existing ones. Reviewers can compare the two shots and see that the old revision shows its own README and logo, not the latest ones.

## Problems

None. The logos are tiny test fixtures (16px vs 24px wide), so the image difference in the shots is small but visible.
