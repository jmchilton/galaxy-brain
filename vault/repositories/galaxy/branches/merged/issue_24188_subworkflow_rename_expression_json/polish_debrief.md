# Polish debrief

Polished at head `e36468c480a` (base `release_26.1`, merge-base `b2b1e1deeee`). No branch changes.

## CI

Fork CI on `e36468c480a`: Unit w/postgres and Converter tests are green. Everything else is still queued, with no reds at polish time. The earlier SHAs' runs were cancelled by later pushes.

## Checklist (GENERAL + WORKFLOW_RELATED)

A fresh subagent answered every item from the diff and found no failures. The human-read item is left for John.
- `ToolSourceSchema.json` has the same parsed content as `rebuild.py` output. The branch adds a trailing newline that `rebuild.py` doesn't write. I tried stripping it, but Galaxy's pre-commit `end-of-file-fixer` adds it back, so the branch keeps it.
- No test passes on base. The helper-move refactor commit comes before the fix commits, and the test-format commit is first, so it can be split off.

## Strengthening

The strengthening subagent re-checked the description's claims against the code: the existing wait in `compute_collection_info`, the planemo `for_collections` limit, the 4 forward-merge conflicts, and the base-branch table. All hold. It asked for no development. Description-only changes applied:
- New highlighted answers to two misreadings: data-input subworkflows are unchanged, and the pre-read adds no latency.
- Highlights cut to one sentence each, instead of whole paragraphs.
- Grace period described accurately: 60s past the dataset's last update, not 60s of waiting.
- Rejected approaches listed once, under "Approaches considered", with the Codex and Thermo details pointing there. Dropped the repeated alt and API-test text from the test-format section.
- Scope Evaluation details now give the reasons, not "an evaluation said".
- Forward-merge conflicts moved from Risk Review Advice to Context.

## Left for John

- Planemo `for_collections()` only matches `element_tests`, so a Collection output that asserts only `metadata.name` falls through in planemo. A planemo PR would turn that Risk bullet into a link. It's outside this branch's scope.
- `pr_tags.md`: dropped the labeler's `area/tool-framework`.
