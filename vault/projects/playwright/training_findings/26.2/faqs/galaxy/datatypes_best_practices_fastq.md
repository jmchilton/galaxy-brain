# faqs/galaxy/datatypes_best_practices_fastq.md — 26.2, UI run

GTN `45d4932d33`, Galaxy `galaxy_ui_driver` `8d36c6dcdf8` (`faq_server.sh main`). Uploaded plain and
gzipped fastq with autodetect. No tutorial embeds it.

## GTN

- `fastq-best-practices-decompress` (main): gzipped fastq autodetects as `fastqsanger.gz` and stays
  compressed (`sniff_compressed_dynamic_datatypes_default`, default true since at least 22.01). The
  "converted to uncompressed" claim and the "directly assign" bullet are obsolete. Plain fastq does
  autodetect as `fastqsanger`.
- The 2 GB/FTP line depends on the server; left alone.

## Galaxy

- Covered by API tests (`test_fetch_compressed_default`, autodetect). On the Selenium framework test
  server, autodetect gave `fastqsanger` instead (decompressed); its datatypes conf
  (`sample_datatypes_conf.xml`) differs from the default, but I didn't find the cause. So the new E2E
  test uploads `1.bed` and `1.fasta` and doesn't check compression.
