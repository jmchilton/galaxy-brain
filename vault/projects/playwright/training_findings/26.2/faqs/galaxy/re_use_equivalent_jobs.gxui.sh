#!/bin/sh
# Replay of faqs/galaxy/re_use_equivalent_jobs.md against the `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
N=reuse-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui upload-paste "a b c" --name in.txt
gxui history-wait 1
gxui tool-open cat1
gxui tool-fill '{"input1": 1}'
gxui tool-run
gxui history-wait 2
gxui note "Step 1 (preference) is gone: no Manage Information switch is needed"
gxui note "Step 2: open the tool again; under Additional Options turn on 'Attempt to re-use jobs with identical parameters?' and click Run Tool"
gxui tool-open cat1
gxui tool-fill '{"input1": 1}'
gxui tool-run --reuse
gxui history-wait 3
gxui history-items
