# Filtered findings

- generic_test_challenger P3 2 (no macro-using tool case): disproved as a live risk. A live check of 5 macro-using tools-iuc tools against the main Tool Shed's `tool_source` route matched for 4: das_tool, flavotyper, meme_chip and ragtag. The fifth, breseq, differs because its help really was edited without a version bump. A local fixture can't catch server-side skew, and skew fails safe (the tool still errors).
- default nit (shorten the `#1525` comment): a nit-picky comment adjustment. The review branch rewrote the comment anyway (`e75c4806`).
