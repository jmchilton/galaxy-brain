# Custom build API swallows conversion errors as a 500

Any failure to start the FASTA → `len` conversion becomes an opaque 500. **Recommendation:** keep internal; fixing PR-first on [`custom_build_no_converter_400_26.0`](../../../branches/active/custom_build_no_converter_400_26.0/index.md).
