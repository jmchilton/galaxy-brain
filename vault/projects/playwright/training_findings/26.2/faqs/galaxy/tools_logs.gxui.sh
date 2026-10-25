#!/bin/sh
# Replay of faqs/galaxy/tools_logs.md against the `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
N=logs-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui upload-paste "1	a
5	b" --ext tabular --name in.tsv
gxui history-wait 1
gxui tool-open Filter1
gxui tool-fill '{"input": 1, "cond": "c1>2"}'
gxui tool-run
gxui history-wait 2
gxui note "Expand the output, click Dataset Details; logs are inline under Job Execution Details as Tool Standard Output / Error"
gxui dataset-logs 2
