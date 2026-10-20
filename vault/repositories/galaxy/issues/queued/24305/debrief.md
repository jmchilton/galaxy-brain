# Debrief: duplicate workflow output labels accepted

Proposal: [`proposal.md`](proposal.md). No source draft: the idea came out of the compare-runs research ([`../internally_managed/compare_outputs.md`](../../../../../agents/gx_issues/internally_managed/compare_outputs.md), side findings), where a research subagent spotted the broken check.

## Research

- **Code (origin/dev @ `2cca856`).**
  - In `managers/workflows.py` `__walk_step_dicts` (2162-2183), the output-label check runs only for a dict `workflow_outputs`. Inside that branch it tests the step `label`, and the uuid check reads `step_dict["output_uuid"]` and records the step uuid.
  - Every real payload is a list: the editor serializer, `.ga` files, and gxformat2 conversion (the reviewer ran this in the venv).
  - `__module_from_dict` (2258-2261) would treat a dict as bare output names anyway.
  - `git blame` shows the branch is from 2015-11-28 (`157939aa8f46`), and no test exercises it.
- **Reproduction.** I ran a temporary API test in a throwaway detached worktree at `origin/dev`, using the main checkout's `.venv` and `GALAXY_TEST_TOOL_CONF` for `cat1`.
  - Upload: 200. PUT: 200. Both stored two outputs labelled `out_a`.
  - The invocation ran 2 jobs, and its `outputs` showed one dataset.
  - I removed the worktree afterwards and saved the script to the session scratchpad. The first attempt failed only because the test tool conf wasn't loaded.
- **Prior art.**
  - 🎯 #20230 reported the invocation symptom; mvdbeek wrote "should not be possible to create such a workflow".
  - 🔀 #20335 is client-only (3 files). It flags duplicates as an editor error, but `Index.vue:800-808` still saves after a confirm.
  - #22853 covers the guard in extraction only. #1718 and #10432 are about output names and editor initialization.
  - About a dozen searches found nothing open for the server gap.
- **Label consumers.** Invocation `to_dict` keeps the last match. `get_output_object` returns the first, and report `output=` uses it (`markdown_util.py:1372,1422`). Subworkflow outputs are keyed by label (`workflow/modules.py:1020-1034`).

## Review round

The reviewer subagent made these changes:
- corrected "only uploads, imports and API updates get through": the editor warns but still saves;
- softened "thread concluded" to "thread notes";
- switched ✅ to ⚠️ and added a legend;
- expanded the repro excerpt so it matches the quoted output (PUT + invoke);
- made the label-consumer list precise;
- restructured Alternatives into a paragraph plus a details block.

## Left over

- **Reject vs warn.** Rejecting may break re-import of old `.ga` files that already have duplicates (the editor serializer already logs "Ignoring duplicate labels"). Reviewers may prefer warning first.
- **Format2 coverage.** Format2 is verified at the conversion step only. The end-to-end repro used native upload.
- **Suspect commit message.** Client commit `9c741bc6577` (Aug 2026) mentions a "Duplicate workflow output UUID" save failure that this code can't produce. It's left out of the issue.
- **Assignee.** The issue came out of John's own research, so John is the likely assignee if it's filed.
