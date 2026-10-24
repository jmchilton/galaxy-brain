#!/bin/sh
# Replay of faqs/galaxy/datasets_job_status.md against the `faq_server.sh main` Galaxy,
# from `gxui start --headless`. cat_data_and_sleep is faq_server.sh's replay tool: it holds
# hid 4 running for 30s, so hid 5 still waits when its other input is deleted.
set -e
N=jobs-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "job status faq"
gxui upload-paste "a b" --ext txt --name good.txt
gxui upload-paste "a	1" --ext tabular --name t.tabular
gxui note "Red: a link that 404s errors (warning triangle)"
gxui upload-url https://raw.githubusercontent.com/galaxyproject/galaxy/dev/test-data/no-such-file.txt --ext txt --name bad.txt || true
gxui note "Grey (clock) then Yellow (spinner): hid 5 waits queued on hid 4"
gxui tool-open cat_data_and_sleep
gxui tool-fill '{"input1": 2, "sleep_time": 30}'
gxui tool-run
gxui tool-open cat1
gxui tool-fill '{"input1": 4, "queries_0|input2": 1}'
gxui tool-run
gxui history-items
gxui screenshot job-status-queued-running
gxui note "Light Blue: deleting an input of a waiting job pauses it"
gxui dataset-delete 1
gxui history-wait 4
gxui history-items
gxui dataset-peek 5
gxui note "Green: fix the input, then History options > Resume Paused Jobs"
gxui dataset-undelete 1
gxui history-resume-paused
gxui history-wait 5
gxui history-items
