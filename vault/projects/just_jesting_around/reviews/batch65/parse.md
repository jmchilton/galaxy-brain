# Markdown parse — batch65

Originator commit: `87903b8a8dba504671c51507bc7947881fbadc64`.

All24 original cases and36 checks remain; four exact input comparisons strengthen the unaffected-markdown/directive cases while preserving their original result-self-comparisons. These now verify that plain markdown, unrelated directives, other labels and other argument types remain byte-for-byte unchanged. Final24cases/40checks. A local literal directive fixture makes the varying argument/quote/space inputs visible without repeating the surrounding markdown. The special regex and leading-newline fixtures retain their literal full-document forms; an exact ordered inventory verified all30 original input/output strings are unchanged. The parseMarkdown group now names the function it exercises.

Bounded mutation appends text only when replaceLabel otherwise returns its original input. All24 original cases pass; exactly the four new input comparisons fail. Production and test files are restored in finally, the production diff is empty, and restored shuffled650201 passes24cases. Evidence: /private/tmp/readability65-parse-mutant-{original,final}.log and restored.log.

Pristine/final shuffled650101 passes24cases. V8 retains exactly4files/146covered statement/function/branch-arm locations with zero losses/additions. This pure parser suite imports no Galaxy shared UI source. File ESLint/Prettier and explicit absolute-config repository hooks pass; driver owns integrated full types. No production/support/shared edits. The demonstrated tautological-check blind spot is captured here; existing advice to check actual behavior already covers it, so no generic README expansion is proposed.
