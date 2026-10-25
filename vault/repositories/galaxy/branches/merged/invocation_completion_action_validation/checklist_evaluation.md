# Expanded-head polish checklist

Independent review of full diff and current scope/implementation/test/quality notes at 9f04be9b5ad7012178c1aac68f66f1894fa329f7. Found one history issue: new notification acceptance cases belonged in a leading baseline-test commit. Corrected mechanically, then independently verified at ddfbb3b991c185779b0f4e200801d6f4d443d8c2; all agent-answerable items pass. Human-read stays unchecked.

## John's Checklist

- [ ] Did a human read every test and every comment? Requires human author to check.
- [x] What does the user see when it fails? HTTP 400 names the unknown action or invalid export configuration before a requested history or invocation is created.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; real API requests check responses and persisted side effects, with notification/export/no-action positive controls.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes; two notification compatibility cases precede the production changes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? Requests with unknown action names or malformed required export configuration now fail at submission; valid requests retain completion handling.
- [x] Who hits this in practice and what is the evidence? Invocation API callers supplying these options; baseline requests with unknown names or eight malformed export configurations returned HTTP 200.
- [x] Were simpler or existing approaches considered? Yes; shared registry lookup preserves extensions, and hook-owned validation avoids centralized action-specific rules. Optional-option strictness and destination resolution need separate compatibility decisions.

Evidence: the service checks actions before build_workflow_run_configs. Shared registered hooks own validation; the base method accepts existing hook configurations, while export requires an object and nonblank string target_uri. Original truthiness/execution/destination handling is retained. API regressions assert diagnostics, no invocation and no newly named history; notification None/{} are compatibility controls. Existing completion units and valid-export/no-action controls were unchanged.

Leading commit 993613b8a9e contains only notification acceptance tests; 8d60f4e6a09 adds unknown-name rejection; ddfbb3b991c adds required configuration validation. Final tree is identical to the previously reviewed expanded head. Assertion comment explains registry invariant; method documentation describes extension compatibility and validation boundaries. No stale generated changes. Fresh execution evidence is maintained in polish_debrief.md.
