# galaxy #23869 — Update datatypes_conf with visualization tags already supported

[PR #23869](https://github.com/galaxyproject/galaxy/pull/23869) · Status: active; initial review complete. Recommendation: request changes (two P2 findings). Delivery: unposted. Open, out of draft; GitHub checked 2026-10-11.

Reviewed HEAD: `a3b2e328f0c2e58b9c32323d4635a1fd20a1fb43`, base `dev`. Author: mertydn. Final HEAD unchanged.

Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/23869/`; clean, retained while open.

- [Review and risks](review-2026-10-11.md)
- [Unposted draft](draft-review.md)
- [Validation evidence](validation-evidence.txt)
- [Registry/API reproduction](registry-api-probe.py)
- [Chromium reproduction](browser-probe.py)
- [Exact pinned-package fetch](fetch-plugins.py)
- [Effective mapping comparison](registry-results.json)
- [Actual API-handler comparison](api-results.json)
- [Browser results](browser-results.json)

The new specialized defaults leak to unrelated binary/archive formats through class-name inheritance; compressed FASTA also inherits a viewer that cannot decode its bytes. 11 focused existing tests pass; exact-parent registry/API and actual-bundle browser controls confirm both findings. CI has 55 successful, one failed, two skipped checks; the failure contains two unrelated live Quay catalog tests. All notes remain unposted.

## Morning check — 2026-10-12

Open, ready; live HEAD `a3b2e328f0c2e58b9c32323d4635a1fd20a1fb43`. CI snapshot: 1 failure, 2 skipped, 55 success. Our request-changes draft remains unposted and John has not commented/reviewed. Marius submitted a COMMENTED review on 2026-10-12 at 09:35 UTC covering the inherited preferred-viewer issue and compressed FASTA incompatibility; account for that overlap before posting. Our reviewed head is unchanged.

## Prerequisite review — 2026-10-13

[#24097 reviewed directly](../24097/index.md) at `68e2b47adb929b77de3333f6d1bf4d5826d2123a`, using this PR's unchanged config at `a3b2e328f0c2e58b9c32323d4635a1fd20a1fb43`. Real-class/MRO lookup removes the rrd/gwas_bgzip sibling leakage; compressed FASTA still inherits alignment. This prerequisite resolves the mechanism for the first finding once incorporated, not the compressed-viewer finding. [Ayslam proposes explicit-only preferences](https://github.com/galaxyproject/galaxy/pull/23869#issuecomment-6147278065); #24097 instead retains legitimate inheritance. No GitHub review/comment posted.
