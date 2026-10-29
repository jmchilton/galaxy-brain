Run via Claude Opus 5.5.

# Screenshots: extraction_hid_copies_pdf_sections_26.1

**Top line:** screenshots successfully obtained. One "after" shot from the branch's E2E test (head `2f0cd130446`), and two "before" shots from a throwaway test on base `19281d57645` (merge-base = `origin/release_26.1`).

## Index (`screenshots/`, gitignored)

| File | Code | Shows |
|---|---|---|
| `workflow_extract_collection_with_copy.png` | branch `2f0cd130446` | Extract Workflow form, list (hid 1) + its in-history copy (hid 6). One "Input Dataset Collection" card listing **1** and **6**. |
| `before_workflow_extract_collection_with_copy.png` | base `19281d57645` | Same history (source hid 1, copy hid 6). One card listing **1: Test Dataset Collection twice**; the copy, hid 6, is missing. |
| `before_workflow_extract_collection_with_copy_submitted.png` | base `19281d57645` | Same form after naming it and clicking Create Workflow: red alert **"hdca_ids contains duplicates"** (the 400). |

## How

- **After:** ran `test_workflow_extraction.py::TestWorkflowExtractionSelenium::test_extract_collection_with_in_history_copy` unchanged, using its existing `workflow_extract_collection_with_copy` hook. Playwright, headless, managed server on port 8797. **1 passed** (218s).
- **Before:** used a temp `git worktree` at `19281d57645` in the scratchpad, removed afterward. This worktree's checkout and stash were not touched. In the temp worktree:
  - Copied in the branch's `navigation.yml`, for the two new `input_collection_*` selectors.
  - Copied in the branch's built `static/dist`. That's equivalent to a base build, since the branch has no client source diff (only `navigation.yml`).
  - Added an uncommitted test, `test_before_collection_with_in_history_copy`, with the same setup as the branch test. It waits for the source hid, screenshots, submits, waits for `.alert-danger` and asserts the text contains "duplicates", scrolls to the top, then screenshots again.
  - Ran on port 8798: **1 passed** (222s).
- **Base-code check:** the before run printed `SOURCE_HID=1 COPY_HID=6`, `CARDS=1 SRC_ITEMS=2 COPY_ITEMS=0` and `ALERT='hdca_ids contains duplicates'`. So the server ran base `lib`, even though `.venv` points at another worktree's venv.
- No branch code changed. Both servers were started by pytest and exited with it; nothing else was killed.

## Problems

None. The after-shot needed no test tweaks; the polish pass already moved the screenshot after the card-load waits.
