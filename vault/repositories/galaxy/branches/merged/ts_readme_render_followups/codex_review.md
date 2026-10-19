# Codex review

Codex (read-only; merge `ae4e1c4a442` + `ec2c345a5aa`) returned one finding: confirmed, not acted on.

Not acted on:
- **Old-revision README images resolve to current-revision files** (`lib/tool_shed/util/readme_util.py:101`). Confirmed: `set_image_paths` builds `/repository/static/images/{id}/...` with no changeset, and the handler in `lib/tool_shed/webapp/api2/repository.py` serves from the on-disk (latest) repo, so an image changed since the old revision shows the new version. Before this branch those images didn't resolve at all. Fixing needs a changeset-aware image route plus a `set_image_paths` change shared with Galaxy tool help — separate follow-up.

<details>
<summary>Details</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/tool_shed/util/readme_util.py",
      "test/unit/tool_shed/test_readme_util.py",
      "lib/galaxy/tool_shed/util/shed_util_common.py",
      "lib/galaxy/tool_shed/util/hg_util.py",
      "lib/galaxy/tool_shed/util/basic_util.py",
      "lib/galaxy/tool_shed/util/repository_util.py",
      "lib/galaxy/util/rst_to_html.py",
      "lib/galaxy/util/sanitize_html.py",
      "lib/tool_shed/util/metadata_util.py",
      "lib/tool_shed/managers/repositories.py",
      "lib/tool_shed/webapp/api2/repository.py",
      "lib/tool_shed/webapp/model/__init__.py",
      "lib/galaxy/tool_shed/metadata/metadata_generator.py",
      "test/unit/tool_shed/test_shed_util_common.py",
      "test/unit/tool_shed/conftest.py",
      "test/unit/tool_shed/_util.py",
      "conftest.py",
      "mypy.ini"
    ],
    "notes": "Both scoped commits reviewed, including the combined merge diff. Merged-in commits were excluded as requested. Surrounding files were read at relevant functions. All 8 focused tests passed. Mypy from lib/ reported 25 errors in imported modules, none in readme_util.py."
  },
  "findings": [
    {
      "severity": "P2",
      "category": "correctness",
      "file": "lib/tool_shed/util/readme_util.py",
      "line": 101,
      "title": "Historical README images resolve to current-revision files",
      "detail": "The shared image rewrite receives only the repository ID, producing a URL without changeset_revision. The image handler in lib/tool_shed/webapp/api2/repository.py resolves that URL against repository.repo_path(app), serving the current working-tree file rather than the historical image. Thus the old README text and its images can come from different revisions. The added test checks only the URL and uploads no image, so it misses this failure.",
      "failure_scenario": "Upload downloadable revision 1 with README.rst referencing images/logo.png containing a red PNG. Upload revision 2 with the same image path containing a blue PNG. Request revision 1's README: its generated image URL serves the blue PNG. Reproduced with a temporary Tool Shed repository and the image handler's actual path resolver; the historical manifest contained red while the resolved file contained blue.",
      "confidence": "certain"
    }
  ]
}
```

</details>
