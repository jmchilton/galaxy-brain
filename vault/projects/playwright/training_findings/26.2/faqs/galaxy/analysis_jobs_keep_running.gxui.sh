#!/bin/sh
# Replay of faqs/galaxy/analysis_jobs_keep_running.md against the `faq_server.sh main` Galaxy, from
# a gxui session started with `gxui start --headless`. Registers a fresh user so it can log back
# in after closing the browser. A fast server may finish the job before the browser closes.
set -e
N=jobs-keep-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "jobs keep running faq"
TAB=$(printf '\t')
gxui upload-paste "1${TAB}2${TAB}3
" --ext tabular --name table
gxui note "step 1: start a job"
gxui tool-open Cut1
gxui tool-fill '{"input": 1, "columnList": "c1,c3"}'
gxui tool-run
gxui note "step 2: close the browser while the job runs"
gxui stop
sleep 20
gxui start --headless
gxui note "next visit: log in again; the job finished without a browser"
GXUI_PASSWORD=faqpass123 gxui login "$N@example.org"
gxui history-switch "jobs keep running faq"
gxui history-wait 2
gxui note "expect the peek: 1<tab>3"
gxui dataset-peek 2
