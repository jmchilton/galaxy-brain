# Test challenges review - PR #24861

Profile: gx_test_challenger. Model: Claude Opus 5.5. Effort: low. Reviewed commit: 15b1e13ac15c5624cab3593a5eecf73850a8f54a.

Verdict: unit coverage is solid and behavior-focused; missing one cheap end-to-end framework tool test. Details: [test_challenges_debrief.md](test_challenges_debrief.md).

### P2 1 - No framework tool test for checksum + decompress
Unit tests pass `decompress=True` as a Python bool straight into `verify()`; nothing checks the attribute parsed from a tool test (`decompress="true"` in XML) reaches the checksum path. Add a `<test>` to an existing gz-output tool, e.g. `test/functional/tools/compressed_gz_fastq_no_conversion.xml`, with `<output name="out_file1" checksum="sha1$<sha1 of decompressed 1.fastqsanger>" decompress="true"/>`. Runs in the framework tool suite; covers workflow tests too since they share `verify()`.

### P3 1 - Imports inside test functions
`gzip` and `hashlib` imported in each new test in `test/unit/tool_util/test_verify_function.py`; move to module top.

### P3 2 - Message-only test could fold into parametrize (optional)
`test_checksum_mismatch_says_it_is_over_decompressed_content` only checks message text; could become the `match=` of the `("compressed", True, False)` parametrized case.
