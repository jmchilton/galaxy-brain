# PR #24111 — Login redirects and allowed_login_redirect_hosts

- PR: https://github.com/galaxyproject/galaxy/pull/24111 (mvdbeek, `release_26.1`, +764/-128, 30 files)
- Status: Approved with response; asked author to address findings and rework admin docs; awaiting merge
- Delivery: [approved](https://github.com/galaxyproject/galaxy/pull/24111#pullrequestreview-5585285135) by John, 2026-10-20T12:56:38Z, on head `a55b237469a`
- Reviewed commit: `a55b237469afdcf9af7ab9f19ff09ac9007b3268`
- Reviewed: 2026-10-20 (picked by John)
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24111`
- Response draft: [initial_review_response.md](initial_review_response.md); actions: [initial_response_action.md](initial_response_action.md)
- Verified review: [verified_review.md](verified_review.md) — four P2s, three P3s; [filtered](filtered_findings.md)
- Review branch: `pr_24111_review_0` on [jmchilton fork](https://github.com/jmchilton/galaxy/tree/pr_24111_review_0) ([details](review_0_branch_details.md)); fixes all but P2 3 (test deletion left to author)
- Follow-up refactor issue draft (for `dev`): [followup_refactor_issue.md](followup_refactor_issue.md)
- Reports: [default](initial_review.md), [thermo](thermo_review.md), [test challenger](test_challenges_review.md), [risks](risks.md); [agents](initial_review_agents.md)

Main risk: `allowed_login_redirect_hosts` is a new config option on a release branch (one-way door); PR body leaves that scope call to maintainers.
