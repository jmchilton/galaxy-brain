No correctness blockers found in this implementation. Comparing actual class objects fixes the sibling collision, and using the MRO gives nearest-ancestor precedence while preserving direct mappings.

I ran the seven focused tests and compared all 799 sample extensions: only the five incorrect HyPhy defaults change. With #23869's configuration, rrd/gwas_bgzip keep their intended preferences and unrelated binary/archive siblings no longer inherit them.

Two scope points:
- This retains genuine inheritance, whereas the latest #23869 discussion proposes explicit-only preferences. Please agree on that policy; this implements the former correctly.
- Compressed FASTA still inherits alignment, so #23869's compressed-input viewer issue remains unresolved by this prerequisite.

Non-blocking: a test with both broad and closer mapped ancestors would protect nearest-ancestor precedence; the existing parent tests do not distinguish it from configuration-order priority.

## Risks

Minimal and reversible; no stored-data migration. Custom configurations with multiple mapped ancestors will now prefer the nearest one. CI is still pending.
