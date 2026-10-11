# Codex review

Codex (read-only, `origin/release_26.1...129b96a7ae8`) returned one finding: confirmed, not acted on. No code changes made from this review.

Not acted on:
- **Old-revision READMEs skip `set_image_paths`** (`lib/tool_shed/util/readme_util.py:88`). Confirmed: the disk branch rewrites `.. image::` relative paths to the repository image endpoint before rendering; the manifest (old-revision) branch doesn't, so relative images in old revisions resolve against the page and break. Not a regression — before this patch old revisions weren't rendered at all (raw text). Left out to keep `readme_util.py` identical to the deployed patch and its sibling branches; good small follow-up (hoist the image rewrite into shared preprocessing for both branches).

<details>
<summary>Details</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/tool_shed/util/readme_util.py",
      "test/unit/tool_shed/test_readme_util.py",
      "lib/galaxy/util/sanitize_html.py",
      "lib/galaxy/util/rst_to_html.py",
      "lib/galaxy/tool_shed/util/basic_util.py",
      "lib/galaxy/tool_shed/util/shed_util_common.py",
      "lib/galaxy/tool_shed/util/hg_util.py",
      "lib/galaxy/tool_shed/util/repository_util.py",
      "lib/galaxy/tool_shed/util/utility_container_manager.py",
      "lib/tool_shed/managers/repositories.py",
      "lib/tool_shed/webapp/api2/repositories.py",
      "lib/tool_shed/webapp/api2/repository.py",
      "lib/tool_shed/webapp/frontend/src/components/pages/RepositoryPage.vue",
      "lib/tool_shed/webapp/frontend/src/routes.ts",
      "lib/galaxy/web/__init__.py",
      "lib/galaxy/web/framework/__init__.py",
      "test/unit/tool_shed/conftest.py"
    ],
    "notes": ""
  },
  "findings": [
    {
      "severity": "P2",
      "category": "correctness",
      "file": "lib/tool_shed/util/readme_util.py",
      "line": 88,
      "title": "Old-revision rendering skips repository image URL rewriting",
      "detail": "The newly rendered manifest branch skips set_image_paths, which the disk branch applies before rendering. A local image therefore retains a relative URL that resolves against the Tool Shed page instead of the repository image endpoint. Reuse the existing set_image_paths abstraction in shared preprocessing. The four focused tests pass but do not exercise this branch.",
      "failure_scenario": "An older revision contains README.rst with '.. image:: images/logo.png', and images/logo.png still exists in the repository. Reproducing both branches yields src='/repository/static/images/encoded-id/images%2Flogo.png' for the latest revision but src='images/logo.png' for the older revision. Viewing the older revision requests the image outside the repository image endpoint and displays a broken image.",
      "confidence": "certain"
    }
  ]
}
```

</details>
