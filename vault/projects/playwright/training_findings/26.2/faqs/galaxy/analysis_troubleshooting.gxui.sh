#!/bin/sh
# Replay of faqs/galaxy/analysis_troubleshooting.md against the `faq_server.sh main` Galaxy (which
# sets error_email_to, so the report reaches $FAQ_MAIL), from `gxui start --headless`.
# Filter on a column the data doesn't have makes the red dataset.
set -e
N=troubleshoot-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "troubleshooting faq"
TAB=$(printf '\t')
gxui upload-paste "1${TAB}2
3${TAB}4
" --ext tabular --name table
gxui tool-open Filter1
gxui tool-fill '{"input": 1, "cond": "c9>1"}'
gxui tool-run
gxui note "step 1: expand the red dataset; expect its error text"
gxui dataset-peek 2
gxui note "steps 2 and 4: the bug icon opens the error page; report from it"
gxui dataset-error 2 --report "Filter on c9 failed; my table has 2 columns."
gxui note "step 3: details icon; the logs are under Job Execution Details"
gxui dataset-details 2
gxui screenshot job-execution-details
